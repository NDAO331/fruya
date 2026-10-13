-- =====================================================================
-- Fruya — moyen de paiement de chaque vente : espèces, Wave ou Orange Money.
-- À coller dans le SQL Editor de Supabase, après 007.
--
-- Les ventes déjà enregistrées sont considérées payées en espèces.
-- Fin de journée : seule la part en ESPÈCES (+ paiements de dettes) doit
-- se trouver dans la caisse ; Wave et Orange Money sont affichés à part,
-- à vérifier sur le téléphone du gérant.
-- =====================================================================

alter table public.sales
  add column if not exists paiement text not null default 'especes'
  check (paiement in ('especes', 'wave', 'orange_money'));

alter table public.daily_reports
  add column if not exists total_wave integer not null default 0,
  add column if not exists total_orange_money integer not null default 0;

-- Nouvelle signature (avec le moyen de paiement, espèces par défaut).
-- L'ancienne est retirée pour éviter deux fonctions du même nom ; un
-- téléphone pas encore mis à jour (4 paramètres) tombe sur la nouvelle
-- grâce à la valeur par défaut.
drop function if exists public.enregistrer_vente(uuid, timestamptz, text, jsonb);

create function public.enregistrer_vente(
  p_id uuid,
  p_date timestamptz,
  p_methode text,
  p_lignes jsonb,
  p_paiement text default 'especes'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_stall uuid := public.current_stall_id();
  v_role text := public.current_user_role();
  v_date timestamptz := least(coalesce(p_date, now()), now());
  v_paiement text := coalesce(p_paiement, 'especes');
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

  -- Renvoi après coupure réseau : déjà reçue, rien à faire.
  if exists (select 1 from public.sales where id = p_id) then
    return p_id;
  end if;

  if not public.acces_etal_ok(v_stall, v_date) then
    raise exception 'Abonnement expiré ou étal bloqué : vente refusée.';
  end if;
  if v_paiement not in ('especes', 'wave', 'orange_money') then
    raise exception 'Moyen de paiement inconnu.';
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

  -- Idempotence : un renvoi simultané avec le même id ne fait rien.
  insert into public.sales (id, stall_id, user_id, date, montant_total, methode, paiement)
  values (p_id, v_stall, v_uid, v_date, v_total, p_methode, v_paiement)
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

revoke execute on function public.enregistrer_vente(uuid, timestamptz, text, jsonb, text) from public, anon;
grant execute on function public.enregistrer_vente(uuid, timestamptz, text, jsonb, text) to authenticated;

-- Chiffres du jour : ventes en espèces (dans la caisse), Wave et Orange
-- Money à part. Caisse théorique = espèces + paiements de dettes.
drop function if exists public.chiffres_journee(date);

create function public.chiffres_journee(p_jour date)
returns table (
  total_ventes_comptant integer,
  total_paiements_dettes integer,
  caisse_theorique integer,
  total_pertes integer,
  nb_ventes integer,
  nb_pertes integer,
  total_wave integer,
  total_orange_money integer
)
language sql stable security definer set search_path = ''
as $$
  with bornes as (
    select (p_jour::timestamp at time zone 'Africa/Dakar') as debut,
           ((p_jour + 1)::timestamp at time zone 'Africa/Dakar') as fin
  ),
  ventes as (
    select coalesce(sum(s.montant_total) filter (where s.paiement = 'especes'), 0)::integer as especes,
           coalesce(sum(s.montant_total) filter (where s.paiement = 'wave'), 0)::integer as wave,
           coalesce(sum(s.montant_total) filter (where s.paiement = 'orange_money'), 0)::integer as orange_money,
           count(*)::integer as nb
    from public.sales s, bornes b
    where s.stall_id = public.current_stall_id()
      and s.statut = 'validee'
      and s.date >= b.debut and s.date < b.fin
  ),
  paiements as (
    select coalesce(sum(t.montant), 0)::integer as total
    from public.debt_transactions t
    join public.debts d on d.id = t.debt_id, bornes b
    where d.stall_id = public.current_stall_id()
      and t.type = 'paiement'
      and t.date >= b.debut and t.date < b.fin
      and not exists (select 1 from public.debt_transactions a where a.transaction_annulee_id = t.id)
  ),
  pertes as (
    -- Valeur estimée au dernier prix connu du fruit (PRD 4.6).
    select coalesce(sum(round(l.quantite * coalesce(
             case when l.unite = 'kg' then coalesce(p.dernier_prix_kg, p.prix_kg)
                  else coalesce(p.dernier_prix_piece, p.prix_piece) end, 0))), 0)::integer as total,
           count(*)::integer as nb
    from public.losses l
    join public.products p on p.id = l.product_id, bornes b
    where l.stall_id = public.current_stall_id()
      and l.statut = 'validee'
      and l.date >= b.debut and l.date < b.fin
  )
  select ventes.especes, paiements.total, ventes.especes + paiements.total, pertes.total, ventes.nb, pertes.nb,
         ventes.wave, ventes.orange_money
  from ventes, paiements, pertes
  where public.current_user_role() = 'gerant'
$$;

create or replace function public.cloturer_journee(p_jour date, p_caisse_declaree integer)
returns public.daily_reports
language plpgsql security definer set search_path = ''
as $$
declare
  v_stall uuid := public.current_stall_id();
  v_chiffres record;
  v_rapport public.daily_reports;
begin
  if v_stall is null or public.current_user_role() <> 'gerant' then
    raise exception 'Seul le gérant peut faire la fin de journée.';
  end if;
  if p_caisse_declaree is null or p_caisse_declaree < 0 then
    raise exception 'Montant compté invalide.';
  end if;
  if p_jour > (now() at time zone 'Africa/Dakar')::date then
    raise exception 'Impossible de clôturer un jour qui n''est pas encore arrivé.';
  end if;

  select * into v_chiffres from public.chiffres_journee(p_jour);

  insert into public.daily_reports (
    stall_id, date, total_ventes_comptant, total_paiements_dettes, caisse_theorique,
    caisse_declaree, ecart, total_pertes, total_wave, total_orange_money
  ) values (
    v_stall, p_jour, v_chiffres.total_ventes_comptant, v_chiffres.total_paiements_dettes,
    v_chiffres.caisse_theorique, p_caisse_declaree, p_caisse_declaree - v_chiffres.caisse_theorique,
    v_chiffres.total_pertes, v_chiffres.total_wave, v_chiffres.total_orange_money
  )
  on conflict (stall_id, date) do update set
    total_ventes_comptant = excluded.total_ventes_comptant,
    total_paiements_dettes = excluded.total_paiements_dettes,
    caisse_theorique = excluded.caisse_theorique,
    caisse_declaree = excluded.caisse_declaree,
    ecart = excluded.ecart,
    total_pertes = excluded.total_pertes,
    total_wave = excluded.total_wave,
    total_orange_money = excluded.total_orange_money,
    created_at = now()
  returning * into v_rapport;

  return v_rapport;
end;
$$;

revoke execute on function public.chiffres_journee(date) from public, anon;
grant execute on function public.chiffres_journee(date) to authenticated;
