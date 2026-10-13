-- =====================================================================
-- Fruya — schéma initial (PRD v6.2)
-- À coller tel quel dans le SQL Editor de Supabase.
-- 1. Supprime l'ancien schéma prototype (base vide, aucune donnée perdue).
-- 2. Crée les tables, les fonctions, les triggers et les règles RLS.
--
-- SYNCHRONISATION HORS-LIGNE — RÈGLE IMPÉRATIVE :
--   Le client ne doit JAMAIS utiliser d'upsert (ni insert/update directs)
--   sur sales, sale_items et losses. Il passe uniquement par les fonctions :
--     enregistrer_vente, enregistrer_perte, attacher_photo_perte,
--     annuler_vente, annuler_perte.
--   L'id de chaque vente/perte est généré sur le téléphone : un renvoi après
--   coupure réseau avec le même id ne crée pas de doublon et ne modifie rien.
--   Un upsert pourrait écraser une vente déjà enregistrée ou annulée.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Nettoyage de l'ancien schéma
-- ---------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.admin_stalls;
drop view if exists public.debt_balances;

drop table if exists public.daily_reports cascade;
drop table if exists public.debt_transactions cascade;
drop table if exists public.debts cascade;
drop table if exists public.losses cascade;
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.products cascade;
drop table if exists public.payments cascade;
drop table if exists public.users cascade;
drop table if exists public.stalls cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.current_stall_id() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.prolonger_acces_apres_paiement() cascade;
drop function if exists public.interdire_role_admin() cascade;
drop function if exists public.controler_annulation() cascade;
drop function if exists public.controler_modification() cascade;
drop function if exists public.interdire_modification() cascade;
drop function if exists public.interdire_suppression() cascade;
drop function if exists public.controler_annulation_dette() cascade;
drop function if exists public.peut_annuler(uuid, uuid, timestamptz, timestamptz) cascade;
drop function if exists public.enregistrer_vente(uuid, timestamptz, text, jsonb) cascade;
drop function if exists public.enregistrer_perte(uuid, timestamptz, uuid, numeric, text, text) cascade;
drop function if exists public.attacher_photo_perte(uuid, text) cascade;
drop function if exists public.annuler_vente(uuid, text) cascade;
drop function if exists public.annuler_perte(uuid, text) cascade;


-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- Étal : l'unité d'abonnement. Le statut (essai/actif/expiré/bloqué) est calculé.
create table public.stalls (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  gerant_id uuid not null,
  date_inscription timestamptz not null default now(),
  date_fin_acces date not null default (current_date + 14),
  bloque boolean not null default false,
  raison_blocage text,
  created_at timestamptz not null default now(),
  constraint stalls_blocage_raison_chk check (not bloque or raison_blocage is not null)
);

-- Profil métier lié au compte de connexion Supabase (auth.users).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  telephone text not null unique,
  nom text not null,
  role text not null check (role in ('vendeur', 'gerant', 'admin')),
  stall_id uuid references public.stalls (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint users_stall_role_chk check (
    (role = 'admin' and stall_id is null)
    or (role <> 'admin' and stall_id is not null)
  )
);

create index users_stall_id_idx on public.users (stall_id);

-- Référence circulaire étal <-> gérant : vérifiée en fin de transaction.
alter table public.stalls
  add constraint stalls_gerant_id_fkey foreign key (gerant_id)
  references public.users (id) on delete restrict
  deferrable initially deferred;

create unique index stalls_gerant_id_idx on public.stalls (gerant_id);

-- Paiements d'abonnement, saisis par l'admin.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  montant integer not null default 3000 check (montant > 0),
  date_paiement date not null default current_date,
  moyen text not null check (moyen in ('wave', 'orange_money', 'especes')),
  mois_payes integer not null default 1 check (mois_payes > 0),
  enregistre_par uuid not null references public.users (id) on delete restrict,
  note text,
  created_at timestamptz not null default now()
);

create index payments_stall_id_idx on public.payments (stall_id);

-- Fruits de l'étal, ajoutés par le gérant. Jamais supprimés : désactivés.
-- prix_kg / prix_piece : prix de référence fixés par le gérant.
-- dernier_prix_kg / dernier_prix_piece : dernier prix réellement pratiqué,
-- mis à jour par enregistrer_vente ; c'est lui qui pré-remplit la caisse.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  nom text not null check (length(trim(nom)) > 0),
  unite_defaut text not null check (unite_defaut in ('kg', 'piece')),
  prix_kg integer check (prix_kg >= 0),
  prix_piece integer check (prix_piece >= 0),
  dernier_prix_kg integer check (dernier_prix_kg >= 0),
  dernier_prix_piece integer check (dernier_prix_piece >= 0),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint products_un_prix_chk check (prix_kg is not null or prix_piece is not null),
  constraint products_prix_unite_defaut_chk check (
    (unite_defaut = 'kg' and prix_kg is not null)
    or (unite_defaut = 'piece' and prix_piece is not null)
  )
);

create unique index products_stall_nom_idx on public.products (stall_id, lower(trim(nom)));

-- Ventes. L'id est généré sur le téléphone (synchronisation hors-ligne).
-- date = moment de la vente (téléphone) ; created_at = réception serveur.
create table public.sales (
  id uuid primary key,
  stall_id uuid not null references public.stalls (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  date timestamptz not null default now(),
  montant_total integer not null check (montant_total >= 0),
  methode text not null check (methode in ('manuelle', 'vocale')),
  statut text not null default 'validee' check (statut in ('validee', 'annulee')),
  raison_annulation text,
  annulee_par uuid references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint sales_annulation_chk check (
    (statut = 'validee' and raison_annulation is null and annulee_par is null)
    or (statut = 'annulee' and raison_annulation is not null and annulee_par is not null)
  )
);

create index sales_stall_date_idx on public.sales (stall_id, date);
create index sales_user_id_idx on public.sales (user_id);

-- Lignes de vente (ex. 2 kg de mangues à 500 F/kg).
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantite numeric(10, 3) not null check (quantite > 0),
  unite text not null check (unite in ('kg', 'piece')),
  prix_unitaire integer not null check (prix_unitaire >= 0),
  constraint sale_items_piece_entiere_chk check (unite = 'kg' or quantite = trunc(quantite))
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

-- Pertes. La photo est obligatoire côté app mais arrive après (hors-ligne) :
-- elle est rattachée par attacher_photo_perte.
create table public.losses (
  id uuid primary key,
  stall_id uuid not null references public.stalls (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  date timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete restrict,
  quantite numeric(10, 3) not null check (quantite > 0),
  unite text not null check (unite in ('kg', 'piece')),
  raison text,
  photo_url text,
  statut text not null default 'validee' check (statut in ('validee', 'annulee')),
  raison_annulation text,
  annulee_par uuid references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint losses_piece_entiere_chk check (unite = 'kg' or quantite = trunc(quantite)),
  constraint losses_annulation_chk check (
    (statut = 'validee' and raison_annulation is null and annulee_par is null)
    or (statut = 'annulee' and raison_annulation is not null and annulee_par is not null)
  )
);

create index losses_stall_date_idx on public.losses (stall_id, date);

-- Ardoise : un client. Le montant dû est calculé (vue debt_balances).
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  client_nom text not null,
  client_telephone text,
  created_at timestamptz not null default now()
);

create index debts_stall_id_idx on public.debts (stall_id);

-- Mouvements d'ardoise. Une annulation pointe vers la transaction annulée.
create table public.debt_transactions (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  type text not null check (type in ('prise', 'paiement', 'annulation')),
  montant integer not null check (montant > 0),
  detail_fruits jsonb,
  transaction_annulee_id uuid references public.debt_transactions (id) on delete restrict,
  raison text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint debt_transactions_annulation_chk check (
    (type = 'annulation' and transaction_annulee_id is not null and raison is not null)
    or (type <> 'annulation' and transaction_annulee_id is null)
  )
);

create index debt_transactions_debt_id_idx on public.debt_transactions (debt_id);
create unique index debt_transactions_annulee_idx
  on public.debt_transactions (transaction_annulee_id)
  where transaction_annulee_id is not null;

-- Rapport de fin de journée.
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  date date not null,
  total_ventes_comptant integer not null default 0,
  total_paiements_dettes integer not null default 0,
  caisse_theorique integer not null default 0,
  caisse_declaree integer not null,
  ecart integer not null,
  total_pertes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (stall_id, date)
);


-- ---------------------------------------------------------------------
-- 3. Fonctions utilitaires (utilisées par les règles RLS)
-- ---------------------------------------------------------------------

create function public.current_stall_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select stall_id from public.users where id = auth.uid()
$$;

create function public.current_user_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.users where id = auth.uid()
$$;

-- Statut calculé d'un étal (PRD 4.8). Le blocage est prioritaire.
create function public.statut_etal(s public.stalls)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when s.bloque then 'bloque'
    when current_date > s.date_fin_acces then 'expire'
    when exists (select 1 from public.payments p where p.stall_id = s.id) then 'actif'
    else 'essai'
  end
$$;


-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

-- 4.1 Création du profil à la création d'un compte de connexion.
--   - Inscription d'un gérant (signUp) : user_metadata = {nom, telephone, nom_etal}
--     -> crée l'étal (essai 14 jours) et le profil gérant.
--   - Création d'un vendeur par le serveur (clé secrète) :
--     app_metadata = {role: 'vendeur', stall_id}, user_metadata = {nom, telephone}.
--     app_metadata n'est pas modifiable par l'utilisateur : impossible de
--     s'inviter dans l'étal d'un autre.
--   - Le rôle admin n'est jamais créé ici (voir fin du fichier).
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nom text := trim(new.raw_user_meta_data ->> 'nom');
  v_tel text := trim(new.raw_user_meta_data ->> 'telephone');
  v_nom_etal text := trim(new.raw_user_meta_data ->> 'nom_etal');
  v_stall_id uuid;
begin
  if new.raw_app_meta_data ->> 'role' = 'vendeur' then
    insert into public.users (id, telephone, nom, role, stall_id)
    values (new.id, v_tel, v_nom, 'vendeur', (new.raw_app_meta_data ->> 'stall_id')::uuid);
  elsif v_nom_etal is not null and v_nom_etal <> '' then
    insert into public.stalls (nom, gerant_id)
    values (v_nom_etal, new.id)
    returning id into v_stall_id;

    insert into public.users (id, telephone, nom, role, stall_id)
    values (new.id, v_tel, v_nom, 'gerant', v_stall_id);
  end if;
  -- Sinon (ex. compte admin créé à la main) : pas de profil automatique.
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.2 Le rôle admin ne peut pas être attribué ni retiré depuis l'app.
create function public.interdire_role_admin()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.role = 'admin'
     and (tg_op = 'INSERT' or old.role <> 'admin')
     and auth.uid() is not null then
    raise exception 'Le rôle admin ne peut pas être attribué depuis l''application.';
  end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' and auth.uid() is not null then
    raise exception 'Le rôle admin ne peut pas être retiré depuis l''application.';
  end if;
  return new;
end;
$$;

create trigger users_interdire_role_admin
  before insert or update of role on public.users
  for each row execute function public.interdire_role_admin();

-- 4.3 Paiement enregistré : prolongation automatique de l'accès (PRD 4.8).
create function public.prolonger_acces_apres_paiement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.stalls
  set date_fin_acces = (greatest(date_fin_acces, current_date)
                        + make_interval(months => new.mois_payes))::date
  where id = new.stall_id;
  return new;
end;
$$;

create trigger payments_prolonger_acces
  after insert on public.payments
  for each row execute function public.prolonger_acces_apres_paiement();

-- 4.4 Ventes et pertes : seules modifications permises, même avec la clé
--     secrète : l'annulation (validee -> annulee) et, pour une perte,
--     le rattachement unique de la photo (photo_url vide -> renseignée).
create function public.controler_modification()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  champs_annulation text[] := array['statut', 'raison_annulation', 'annulee_par'];
begin
  -- Rattachement de la photo d'une perte : rien d'autre ne change.
  if (to_jsonb(old) ->> 'photo_url') is null
     and (to_jsonb(new) ->> 'photo_url') is not null
     and (to_jsonb(new) - 'photo_url') = (to_jsonb(old) - 'photo_url') then
    return new;
  end if;

  if (to_jsonb(new) - champs_annulation) <> (to_jsonb(old) - champs_annulation) then
    raise exception 'Une vente ou une perte ne peut pas être modifiée, seulement annulée.';
  end if;
  if not (old.statut = 'validee' and new.statut = 'annulee') then
    raise exception 'Seule l''annulation d''un enregistrement validé est permise.';
  end if;
  if auth.uid() is not null and new.annulee_par is distinct from auth.uid() then
    raise exception 'annulee_par doit être l''utilisateur connecté.';
  end if;
  return new;
end;
$$;

create trigger sales_controler_modification
  before update on public.sales
  for each row execute function public.controler_modification();

create trigger losses_controler_modification
  before update on public.losses
  for each row execute function public.controler_modification();

-- sale_items : jamais modifiées.
create function public.interdire_modification()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Modification interdite sur %.', tg_table_name;
end;
$$;

create trigger sale_items_interdire_modification
  before update on public.sale_items
  for each row execute function public.interdire_modification();

-- 4.5 Aucune suppression, même avec la clé secrète.
create function public.interdire_suppression()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Suppression interdite sur %. Utilisez une annulation avec raison.', tg_table_name;
end;
$$;

create trigger sales_interdire_suppression
  before delete on public.sales
  for each row execute function public.interdire_suppression();
create trigger sale_items_interdire_suppression
  before delete on public.sale_items
  for each row execute function public.interdire_suppression();
create trigger losses_interdire_suppression
  before delete on public.losses
  for each row execute function public.interdire_suppression();
create trigger products_interdire_suppression
  before delete on public.products
  for each row execute function public.interdire_suppression();
create trigger debts_interdire_suppression
  before delete on public.debts
  for each row execute function public.interdire_suppression();
create trigger debt_transactions_interdire_suppression
  before delete on public.debt_transactions
  for each row execute function public.interdire_suppression();
create trigger payments_interdire_suppression
  before delete on public.payments
  for each row execute function public.interdire_suppression();

-- 4.6 Annulation d'ardoise : même client, transaction non-annulation,
--     montant repris de la transaction annulée.
create function public.controler_annulation_dette()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_cible public.debt_transactions;
begin
  if new.type <> 'annulation' then
    return new;
  end if;
  select * into v_cible from public.debt_transactions where id = new.transaction_annulee_id;
  if v_cible.id is null or v_cible.debt_id <> new.debt_id or v_cible.type = 'annulation' then
    raise exception 'Annulation invalide : transaction introuvable ou d''un autre client.';
  end if;
  new.montant := v_cible.montant;
  return new;
end;
$$;

create trigger debt_transactions_controler_annulation
  before insert on public.debt_transactions
  for each row execute function public.controler_annulation_dette();


-- ---------------------------------------------------------------------
-- 5. Fonctions d'écriture des ventes et pertes (seul point d'entrée)
-- ---------------------------------------------------------------------

-- 5.1 Enregistrer une vente et ses lignes en une seule transaction.
--   p_id     : uuid généré sur le téléphone.
--   p_date   : moment de la vente sur le téléphone (ramené à maintenant
--              s'il est dans le futur : horloge du téléphone en avance).
--   p_lignes : [{"product_id": "...", "quantite": 1.5, "unite": "kg",
--               "prix_unitaire": 500}, ...]
--   Le montant total est calculé ici, jamais fourni par le téléphone.
--   Si l'id existe déjà (renvoi après coupure réseau) : ne fait rien.
--   Un fruit désactivé reste accepté : la vente a pu être faite hors-ligne
--   avant sa désactivation.
create function public.enregistrer_vente(
  p_id uuid,
  p_date timestamptz,
  p_methode text,
  p_lignes jsonb
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_stall uuid := public.current_stall_id();
  v_role text := public.current_user_role();
  v_date timestamptz := least(coalesce(p_date, now()), now());
  v_nb_lignes integer;
  v_nb_fruits_ok integer;
  v_total integer;
  v_insere uuid;
  v_ligne record;
begin
  if v_uid is null or v_stall is null or coalesce(v_role, '') not in ('vendeur', 'gerant') then
    raise exception 'Accès refusé.';
  end if;
  if p_id is null then
    raise exception 'Identifiant de vente manquant.';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Une vente doit contenir au moins un fruit.';
  end if;

  -- Fruits de l'étal + total calculé côté serveur.
  select count(*),
         count(p.id),
         coalesce(sum(round((l ->> 'quantite')::numeric * (l ->> 'prix_unitaire')::integer)), 0)::integer
  into v_nb_lignes, v_nb_fruits_ok, v_total
  from jsonb_array_elements(p_lignes) as l
  left join public.products p
    on p.id = (l ->> 'product_id')::uuid and p.stall_id = v_stall;

  if v_nb_fruits_ok <> v_nb_lignes then
    raise exception 'Fruit inconnu pour cet étal.';
  end if;

  -- Idempotence : un renvoi avec le même id ne fait rien.
  insert into public.sales (id, stall_id, user_id, date, montant_total, methode)
  values (p_id, v_stall, v_uid, v_date, v_total, p_methode)
  on conflict (id) do nothing
  returning id into v_insere;

  if v_insere is null then
    return p_id;
  end if;

  insert into public.sale_items (sale_id, product_id, quantite, unite, prix_unitaire)
  select p_id,
         (l ->> 'product_id')::uuid,
         (l ->> 'quantite')::numeric,
         l ->> 'unite',
         (l ->> 'prix_unitaire')::integer
  from jsonb_array_elements(p_lignes) as l;

  -- Dernier prix pratiqué, par fruit et par unité (dernière ligne de la vente).
  -- Une vente plus ancienne synchronisée en retard n'écrase pas un prix plus récent.
  for v_ligne in
    select distinct on (x.product_id, x.unite) x.product_id, x.unite, x.prix_unitaire
    from (
      select (e.l ->> 'product_id')::uuid as product_id,
             e.l ->> 'unite' as unite,
             (e.l ->> 'prix_unitaire')::integer as prix_unitaire,
             e.n
      from jsonb_array_elements(p_lignes) with ordinality as e(l, n)
    ) x
    order by x.product_id, x.unite, x.n desc
  loop
    if not exists (
      select 1
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.product_id = v_ligne.product_id
        and si.unite = v_ligne.unite
        and s.statut = 'validee'
        and s.date > v_date
    ) then
      update public.products
      set dernier_prix_kg = case when v_ligne.unite = 'kg'
                                 then v_ligne.prix_unitaire else dernier_prix_kg end,
          dernier_prix_piece = case when v_ligne.unite = 'piece'
                                    then v_ligne.prix_unitaire else dernier_prix_piece end
      where id = v_ligne.product_id;
    end if;
  end loop;

  return p_id;
end;
$$;

-- 5.2 Enregistrer une perte. Même principe : id du téléphone, idempotent.
--     La photo est rattachée ensuite par attacher_photo_perte.
create function public.enregistrer_perte(
  p_id uuid,
  p_date timestamptz,
  p_product_id uuid,
  p_quantite numeric,
  p_unite text,
  p_raison text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_stall uuid := public.current_stall_id();
  v_role text := public.current_user_role();
  v_date timestamptz := least(coalesce(p_date, now()), now());
begin
  if v_uid is null or v_stall is null or coalesce(v_role, '') not in ('vendeur', 'gerant') then
    raise exception 'Accès refusé.';
  end if;
  if p_id is null then
    raise exception 'Identifiant de perte manquant.';
  end if;
  if not exists (select 1 from public.products
                 where id = p_product_id and stall_id = v_stall) then
    raise exception 'Fruit inconnu pour cet étal.';
  end if;

  insert into public.losses (id, stall_id, user_id, date, product_id, quantite, unite, raison)
  values (p_id, v_stall, v_uid, v_date, p_product_id, p_quantite, p_unite, nullif(trim(p_raison), ''))
  on conflict (id) do nothing;

  return p_id;
end;
$$;

-- 5.3 Rattacher la photo d'une perte (une seule fois, par son auteur).
--     Renvoyer la même photo ne fait rien.
create function public.attacher_photo_perte(p_id uuid, p_photo_url text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_perte public.losses;
begin
  if p_photo_url is null or trim(p_photo_url) = '' then
    raise exception 'Photo manquante.';
  end if;

  select * into v_perte from public.losses where id = p_id for update;

  if v_perte.id is null or v_perte.user_id <> auth.uid() then
    raise exception 'Perte introuvable.';
  end if;
  if v_perte.photo_url = p_photo_url then
    return;
  end if;
  if v_perte.photo_url is not null then
    raise exception 'Cette perte a déjà une photo.';
  end if;

  update public.losses set photo_url = p_photo_url where id = p_id;
end;
$$;

-- 5.4 Droit d'annuler (PRD 4.3) :
--   - le gérant : toute vente/perte de son étal ;
--   - le vendeur : sa propre vente/perte, dans les 5 minutes suivant sa
--     création. Le délai court à partir du plus ancien entre l'heure du
--     téléphone et la réception serveur : une vente faite hors-ligne et
--     synchronisée plus tard n'est plus annulable par le vendeur.
create function public.peut_annuler(
  p_auteur uuid,
  p_stall uuid,
  p_date timestamptz,
  p_created_at timestamptz
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_stall = public.current_stall_id()
     and (
       public.current_user_role() = 'gerant'
       or (public.current_user_role() = 'vendeur'
           and p_auteur = auth.uid()
           and now() <= least(p_date, p_created_at) + interval '5 minutes')
     )
$$;

create function public.annuler_vente(p_id uuid, p_raison text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_vente public.sales;
begin
  if p_raison is null or trim(p_raison) = '' then
    raise exception 'La raison de l''annulation est obligatoire.';
  end if;

  select * into v_vente from public.sales where id = p_id for update;

  if v_vente.id is null or v_vente.stall_id is distinct from public.current_stall_id() then
    raise exception 'Vente introuvable.';
  end if;
  if v_vente.statut = 'annulee' then
    raise exception 'Cette vente est déjà annulée.';
  end if;
  if not public.peut_annuler(v_vente.user_id, v_vente.stall_id, v_vente.date, v_vente.created_at) then
    raise exception 'Annulation impossible : délai de 5 minutes dépassé, demandez au gérant.';
  end if;

  update public.sales
  set statut = 'annulee', raison_annulation = trim(p_raison), annulee_par = auth.uid()
  where id = p_id;
end;
$$;

create function public.annuler_perte(p_id uuid, p_raison text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_perte public.losses;
begin
  if p_raison is null or trim(p_raison) = '' then
    raise exception 'La raison de l''annulation est obligatoire.';
  end if;

  select * into v_perte from public.losses where id = p_id for update;

  if v_perte.id is null or v_perte.stall_id is distinct from public.current_stall_id() then
    raise exception 'Perte introuvable.';
  end if;
  if v_perte.statut = 'annulee' then
    raise exception 'Cette perte est déjà annulée.';
  end if;
  if not public.peut_annuler(v_perte.user_id, v_perte.stall_id, v_perte.date, v_perte.created_at) then
    raise exception 'Annulation impossible : délai de 5 minutes dépassé, demandez au gérant.';
  end if;

  update public.losses
  set statut = 'annulee', raison_annulation = trim(p_raison), annulee_par = auth.uid()
  where id = p_id;
end;
$$;

-- Ces fonctions ne sont appelables que par un utilisateur connecté.
revoke execute on function
  public.enregistrer_vente(uuid, timestamptz, text, jsonb),
  public.enregistrer_perte(uuid, timestamptz, uuid, numeric, text, text),
  public.attacher_photo_perte(uuid, text),
  public.peut_annuler(uuid, uuid, timestamptz, timestamptz),
  public.annuler_vente(uuid, text),
  public.annuler_perte(uuid, text)
from public, anon;

grant execute on function
  public.enregistrer_vente(uuid, timestamptz, text, jsonb),
  public.enregistrer_perte(uuid, timestamptz, uuid, numeric, text, text),
  public.attacher_photo_perte(uuid, text),
  public.peut_annuler(uuid, uuid, timestamptz, timestamptz),
  public.annuler_vente(uuid, text),
  public.annuler_perte(uuid, text)
to authenticated;


-- ---------------------------------------------------------------------
-- 6. Vues
-- ---------------------------------------------------------------------

-- Montant dû par client = prises - paiements (hors transactions annulées).
create view public.debt_balances
with (security_invoker = true)
as
select
  d.id as debt_id,
  d.stall_id,
  d.client_nom,
  d.client_telephone,
  coalesce(sum(
    case t.type when 'prise' then t.montant when 'paiement' then -t.montant end
  ) filter (where a.id is null), 0)::integer as montant_du
from public.debts d
left join public.debt_transactions t
  on t.debt_id = d.id and t.type in ('prise', 'paiement')
left join public.debt_transactions a
  on a.transaction_annulee_id = t.id
group by d.id;

-- Vue admin : chiffres d'activité seulement, jamais le détail des ventes,
-- pertes ou dettes. Vide pour tout utilisateur qui n'est pas admin.
create view public.admin_stalls
as
select
  s.id,
  s.nom,
  g.nom as gerant_nom,
  g.telephone as gerant_telephone,
  public.statut_etal(s) as statut,
  s.date_inscription,
  s.date_fin_acces,
  s.bloque,
  s.raison_blocage,
  (select count(*) from public.users u
    where u.stall_id = s.id and u.role = 'vendeur')::integer as nb_vendeurs,
  (select max(p.date_paiement) from public.payments p
    where p.stall_id = s.id) as date_dernier_paiement,
  (select max(v.date) from public.sales v
    where v.stall_id = s.id and v.statut = 'validee') as date_derniere_vente
from public.stalls s
join public.users g on g.id = s.gerant_id
where public.current_user_role() = 'admin';


-- ---------------------------------------------------------------------
-- 7. Sécurité (RLS)
-- ---------------------------------------------------------------------
alter table public.stalls enable row level security;
alter table public.users enable row level security;
alter table public.payments enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.losses enable row level security;
alter table public.debts enable row level security;
alter table public.debt_transactions enable row level security;
alter table public.daily_reports enable row level security;

-- stalls : chacun lit son étal ; l'admin lit et modifie tout.
create policy stalls_select on public.stalls for select to authenticated
  using (id = (select public.current_stall_id())
         or (select public.current_user_role()) = 'admin');
create policy stalls_update_admin on public.stalls for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

-- users : on voit les membres de son étal ; l'admin voit et modifie tout.
-- Création des comptes : uniquement par le trigger d'inscription.
create policy users_select on public.users for select to authenticated
  using (id = (select auth.uid())
         or stall_id = (select public.current_stall_id())
         or (select public.current_user_role()) = 'admin');
create policy users_update_admin on public.users for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

-- payments : le gérant lit ceux de son étal ; l'admin lit, ajoute, modifie.
create policy payments_select on public.payments for select to authenticated
  using ((stall_id = (select public.current_stall_id())
          and (select public.current_user_role()) = 'gerant')
         or (select public.current_user_role()) = 'admin');
create policy payments_insert_admin on public.payments for insert to authenticated
  with check ((select public.current_user_role()) = 'admin'
              and enregistre_par = (select auth.uid()));
create policy payments_update_admin on public.payments for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

-- products : tout l'étal lit ; seul le gérant ajoute et modifie.
create policy products_select on public.products for select to authenticated
  using (stall_id = (select public.current_stall_id()));
create policy products_insert_gerant on public.products for insert to authenticated
  with check (stall_id = (select public.current_stall_id())
              and (select public.current_user_role()) = 'gerant');
create policy products_update_gerant on public.products for update to authenticated
  using (stall_id = (select public.current_stall_id())
         and (select public.current_user_role()) = 'gerant')
  with check (stall_id = (select public.current_stall_id()));

-- sales / sale_items / losses : LECTURE SEULE par les règles RLS.
-- Aucune policy INSERT ni UPDATE : toute écriture passe par les fonctions
-- de la section 5 (enregistrer_*, attacher_photo_perte, annuler_*).
-- Le gérant voit tout l'étal, le vendeur ses propres enregistrements.
create policy sales_select on public.sales for select to authenticated
  using (stall_id = (select public.current_stall_id())
         and ((select public.current_user_role()) = 'gerant' or user_id = (select auth.uid())));

create policy sale_items_select on public.sale_items for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

create policy losses_select on public.losses for select to authenticated
  using (stall_id = (select public.current_stall_id())
         and ((select public.current_user_role()) = 'gerant' or user_id = (select auth.uid())));

-- debts / debt_transactions / daily_reports : gérant uniquement.
create policy debts_gerant_select on public.debts for select to authenticated
  using (stall_id = (select public.current_stall_id())
         and (select public.current_user_role()) = 'gerant');
create policy debts_gerant_insert on public.debts for insert to authenticated
  with check (stall_id = (select public.current_stall_id())
              and (select public.current_user_role()) = 'gerant');
create policy debts_gerant_update on public.debts for update to authenticated
  using (stall_id = (select public.current_stall_id())
         and (select public.current_user_role()) = 'gerant')
  with check (stall_id = (select public.current_stall_id()));

create policy debt_transactions_gerant_select on public.debt_transactions for select to authenticated
  using ((select public.current_user_role()) = 'gerant'
         and exists (select 1 from public.debts d
                     where d.id = debt_id and d.stall_id = (select public.current_stall_id())));
create policy debt_transactions_gerant_insert on public.debt_transactions for insert to authenticated
  with check ((select public.current_user_role()) = 'gerant'
              and user_id = (select auth.uid())
              and exists (select 1 from public.debts d
                          where d.id = debt_id and d.stall_id = (select public.current_stall_id())));

create policy daily_reports_gerant_select on public.daily_reports for select to authenticated
  using (stall_id = (select public.current_stall_id())
         and (select public.current_user_role()) = 'gerant');
create policy daily_reports_gerant_insert on public.daily_reports for insert to authenticated
  with check (stall_id = (select public.current_stall_id())
              and (select public.current_user_role()) = 'gerant');
create policy daily_reports_gerant_update on public.daily_reports for update to authenticated
  using (stall_id = (select public.current_stall_id())
         and (select public.current_user_role()) = 'gerant')
  with check (stall_id = (select public.current_stall_id()));

-- Les vues ne sont lisibles que par les utilisateurs connectés.
revoke all on public.debt_balances, public.admin_stalls from anon;
grant select on public.debt_balances, public.admin_stalls to authenticated;


-- =====================================================================
-- Création du compte admin (une seule fois, à la main) :
--   1. Authentication > Users > Add user : email technique du téléphone
--      (ex. 221770000000@tel.gerantpme.local) + mot de passe.
--   2. Puis ici :
--      insert into public.users (id, telephone, nom, role)
--      select id, '221770000000', 'Admin', 'admin'
--      from auth.users where email = '221770000000@tel.gerantpme.local';
-- =====================================================================
