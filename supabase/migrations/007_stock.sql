-- =====================================================================
-- Fruya — gestion du stock (PRD 4.9).
-- À coller dans le SQL Editor de Supabase, après 006.
--
-- - Arrivages notés par le gérant seul ; jamais supprimés, annulés avec raison.
-- - Une seule unité de stock par fruit : son unité par défaut, qui ne peut
--   plus changer une fois qu'un arrivage existe.
-- - Stock restant CALCULÉ par le serveur : dernier inventaire + arrivages
--   − ventes − pertes depuis, dans l'unité de stock uniquement.
-- - Le stock ne bloque jamais une vente.
-- - Le vendeur ne voit ni le stock, ni les arrivages, ni les prix d'achat.
-- =====================================================================

alter table public.products
  add column if not exists seuil_alerte numeric(10, 3) check (seuil_alerte >= 0);

create table if not exists public.stock_arrivals (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  date timestamptz not null default now(),
  quantite numeric(10, 3) not null check (quantite > 0),
  unite text not null check (unite in ('kg', 'piece')),
  prix_achat_total integer not null check (prix_achat_total >= 0),
  statut text not null default 'validee' check (statut in ('validee', 'annulee')),
  raison_annulation text,
  annulee_par uuid references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint stock_arrivals_piece_entiere_chk check (unite = 'kg' or quantite = trunc(quantite)),
  constraint stock_arrivals_annulation_chk check (
    (statut = 'validee' and raison_annulation is null and annulee_par is null)
    or (statut = 'annulee' and raison_annulation is not null and annulee_par is not null)
  )
);
create index if not exists stock_arrivals_produit_date_idx on public.stock_arrivals (product_id, date);

-- Inventaires : le gérant compte ce qui reste ; le serveur calcule l'écart.
create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  date timestamptz not null default now(),
  quantite_comptee numeric(10, 3) not null check (quantite_comptee >= 0),
  quantite_theorique numeric(10, 3) not null,
  ecart numeric(10, 3) not null,
  unite text not null check (unite in ('kg', 'piece'))
);
create index if not exists stock_counts_produit_date_idx on public.stock_counts (product_id, date);

alter table public.stock_arrivals enable row level security;
alter table public.stock_counts enable row level security;

-- Lecture : gérant de l'étal uniquement. Écriture : uniquement par les
-- fonctions ci-dessous (aucune policy INSERT / UPDATE).
drop policy if exists stock_arrivals_gerant_select on public.stock_arrivals;
create policy stock_arrivals_gerant_select on public.stock_arrivals for select to authenticated
  using (stall_id = (select public.current_stall_id()) and (select public.current_user_role()) = 'gerant');
drop policy if exists stock_counts_gerant_select on public.stock_counts;
create policy stock_counts_gerant_select on public.stock_counts for select to authenticated
  using (stall_id = (select public.current_stall_id()) and (select public.current_user_role()) = 'gerant');

-- Jamais de suppression ; un arrivage ne se modifie que pour être annulé ;
-- un inventaire ne se modifie pas.
drop trigger if exists stock_arrivals_controler_modification on public.stock_arrivals;
create trigger stock_arrivals_controler_modification
  before update on public.stock_arrivals for each row execute function public.controler_modification();
drop trigger if exists stock_arrivals_interdire_suppression on public.stock_arrivals;
create trigger stock_arrivals_interdire_suppression
  before delete on public.stock_arrivals for each row execute function public.interdire_suppression();
drop trigger if exists stock_counts_interdire_modification on public.stock_counts;
create trigger stock_counts_interdire_modification
  before update on public.stock_counts for each row execute function public.interdire_modification();
drop trigger if exists stock_counts_interdire_suppression on public.stock_counts;
create trigger stock_counts_interdire_suppression
  before delete on public.stock_counts for each row execute function public.interdire_suppression();

-- L'unité par défaut (= unité de stock) ne change plus après un arrivage.
create or replace function public.verrouiller_unite_stock()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.unite_defaut <> old.unite_defaut
     and exists (select 1 from public.stock_arrivals a where a.product_id = new.id and a.statut = 'validee') then
    raise exception 'Ce fruit a déjà du stock : son unité ne peut plus changer.';
  end if;
  return new;
end;
$$;
drop trigger if exists products_verrouiller_unite_stock on public.products;
create trigger products_verrouiller_unite_stock
  before update of unite_defaut on public.products for each row execute function public.verrouiller_unite_stock();

-- Stock d'un fruit (unité de stock), depuis le dernier inventaire.
create or replace function public.stock_produit(p_product uuid)
returns table (stock numeric, dernier_inventaire timestamptz)
language sql stable security definer set search_path = ''
as $$
  with p as (select id, unite_defaut from public.products where id = p_product),
  c as (
    select sc.quantite_comptee, sc.date from public.stock_counts sc
    where sc.product_id = p_product order by sc.date desc limit 1
  ),
  depuis as (select coalesce((select date from c), '-infinity'::timestamptz) as d)
  select
    coalesce((select quantite_comptee from c), 0)
    + coalesce((select sum(a.quantite) from public.stock_arrivals a, p, depuis
                where a.product_id = p.id and a.statut = 'validee' and a.unite = p.unite_defaut and a.date > depuis.d), 0)
    - coalesce((select sum(si.quantite) from public.sale_items si join public.sales s on s.id = si.sale_id, p, depuis
                where si.product_id = p.id and s.statut = 'validee' and si.unite = p.unite_defaut and s.date > depuis.d), 0)
    - coalesce((select sum(l.quantite) from public.losses l, p, depuis
                where l.product_id = p.id and l.statut = 'validee' and l.unite = p.unite_defaut and l.date > depuis.d), 0),
    (select date from c)
$$;

-- Stock de tous les fruits actifs de l'étal du gérant connecté.
create or replace function public.stock_restant()
returns table (product_id uuid, unite text, stock numeric, seuil_alerte numeric, dernier_inventaire timestamptz, a_des_arrivages boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.unite_defaut, s.stock, p.seuil_alerte, s.dernier_inventaire,
         exists (select 1 from public.stock_arrivals a where a.product_id = p.id and a.statut = 'validee')
  from public.products p
  cross join lateral public.stock_produit(p.id) s
  where p.stall_id = public.current_stall_id()
    and p.actif
    and public.current_user_role() = 'gerant'
$$;

-- Nouvel arrivage (dans l'unité de stock du fruit).
create or replace function public.enregistrer_arrivage(p_product_id uuid, p_quantite numeric, p_prix_achat_total integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_produit public.products;
  v_id uuid;
begin
  if public.current_user_role() is distinct from 'gerant' then
    raise exception 'Seul le gérant note les arrivages.';
  end if;
  select * into v_produit from public.products where id = p_product_id and stall_id = public.current_stall_id();
  if v_produit.id is null then
    raise exception 'Fruit inconnu pour cet étal.';
  end if;
  if p_quantite is null or p_quantite <= 0 then
    raise exception 'Quantité invalide.';
  end if;
  if p_prix_achat_total is null or p_prix_achat_total < 0 then
    raise exception 'Prix d''achat invalide.';
  end if;

  insert into public.stock_arrivals (stall_id, product_id, user_id, quantite, unite, prix_achat_total)
  values (v_produit.stall_id, v_produit.id, auth.uid(),
          case when v_produit.unite_defaut = 'piece' then round(p_quantite) else p_quantite end,
          v_produit.unite_defaut, p_prix_achat_total)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.annuler_arrivage(p_id uuid, p_raison text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'gerant' then
    raise exception 'Seul le gérant annule un arrivage.';
  end if;
  if p_raison is null or trim(p_raison) = '' then
    raise exception 'La raison de l''annulation est obligatoire.';
  end if;
  update public.stock_arrivals
  set statut = 'annulee', raison_annulation = trim(p_raison), annulee_par = auth.uid()
  where id = p_id and stall_id = public.current_stall_id() and statut = 'validee';
  if not found then
    raise exception 'Arrivage introuvable ou déjà annulé.';
  end if;
end;
$$;

-- Inventaire du soir : p_lignes = [{"product_id": "...", "quantite": 4.5}, ...]
-- Le stock théorique et l'écart sont calculés ici ; le compte devient le
-- nouveau point de départ du stock.
create or replace function public.enregistrer_inventaire(p_lignes jsonb)
returns table (product_id uuid, unite text, quantite_theorique numeric, quantite_comptee numeric, ecart numeric)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ligne jsonb;
  v_produit public.products;
  v_theorique numeric;
  v_compte numeric;
begin
  if public.current_user_role() is distinct from 'gerant' then
    raise exception 'Seul le gérant fait l''inventaire.';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Compte au moins un fruit.';
  end if;

  for v_ligne in select * from jsonb_array_elements(p_lignes) loop
    select * into v_produit from public.products
    where id = (v_ligne ->> 'product_id')::uuid and stall_id = public.current_stall_id();
    if v_produit.id is null then
      raise exception 'Fruit inconnu pour cet étal.';
    end if;
    v_compte := (v_ligne ->> 'quantite')::numeric;
    if v_compte is null or v_compte < 0 then
      raise exception 'Quantité comptée invalide.';
    end if;

    select s.stock into v_theorique from public.stock_produit(v_produit.id) s;

    insert into public.stock_counts (stall_id, product_id, user_id, quantite_comptee, quantite_theorique, ecart, unite)
    values (v_produit.stall_id, v_produit.id, auth.uid(), v_compte, v_theorique, v_compte - v_theorique, v_produit.unite_defaut);

    product_id := v_produit.id;
    unite := v_produit.unite_defaut;
    quantite_theorique := v_theorique;
    quantite_comptee := v_compte;
    ecart := v_compte - v_theorique;
    return next;
  end loop;
end;
$$;

-- Achats du mois par fruit (prix d'achat moyen et marge, PRD 4.6 / 4.9).
create or replace function public.achats_par_fruit(p_debut date, p_fin date)
returns table (product_id uuid, unite text, quantite numeric, montant bigint)
language sql stable security definer set search_path = ''
as $$
  select a.product_id, a.unite, sum(a.quantite), sum(a.prix_achat_total)::bigint
  from public.stock_arrivals a
  where a.stall_id = public.current_stall_id()
    and public.current_user_role() = 'gerant'
    and a.statut = 'validee'
    and a.date >= (p_debut::timestamp at time zone 'Africa/Dakar')
    and a.date < (p_fin::timestamp at time zone 'Africa/Dakar')
  group by a.product_id, a.unite
$$;

revoke execute on function
  public.stock_produit(uuid),
  public.stock_restant(),
  public.enregistrer_arrivage(uuid, numeric, integer),
  public.annuler_arrivage(uuid, text),
  public.enregistrer_inventaire(jsonb),
  public.achats_par_fruit(date, date)
from public, anon;

grant execute on function
  public.stock_restant(),
  public.enregistrer_arrivage(uuid, numeric, integer),
  public.annuler_arrivage(uuid, text),
  public.enregistrer_inventaire(jsonb),
  public.achats_par_fruit(date, date)
to authenticated;
