-- =====================================================================
-- Fruya — fin de journée et analyses, calculées par le serveur.
-- À coller dans le SQL Editor de Supabase, après 004.
--
-- Fin de journée (PRD 4.4) : la caisse théorique n'est JAMAIS envoyée par
-- le téléphone. Le gérant envoie seulement l'argent compté ; le serveur
-- calcule ventes au comptant + paiements de dettes du jour, et l'écart.
-- Les journées sont celles de Dakar (Africa/Dakar).
-- =====================================================================

-- Le rapport ne s'écrit plus directement : uniquement par cloturer_journee.
drop policy if exists daily_reports_gerant_insert on public.daily_reports;
drop policy if exists daily_reports_gerant_update on public.daily_reports;

-- Chiffres d'un jour pour l'étal du gérant connecté.
create or replace function public.chiffres_journee(p_jour date)
returns table (
  total_ventes_comptant integer,
  total_paiements_dettes integer,
  caisse_theorique integer,
  total_pertes integer,
  nb_ventes integer,
  nb_pertes integer
)
language sql stable security definer set search_path = ''
as $$
  with bornes as (
    select (p_jour::timestamp at time zone 'Africa/Dakar') as debut,
           ((p_jour + 1)::timestamp at time zone 'Africa/Dakar') as fin
  ),
  ventes as (
    select coalesce(sum(s.montant_total), 0)::integer as total, count(*)::integer as nb
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
  select ventes.total, paiements.total, ventes.total + paiements.total, pertes.total, ventes.nb, pertes.nb
  from ventes, paiements, pertes
  where public.current_user_role() = 'gerant'
$$;

-- Clôture : enregistre (ou recompte) le rapport du jour.
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
    caisse_declaree, ecart, total_pertes
  ) values (
    v_stall, p_jour, v_chiffres.total_ventes_comptant, v_chiffres.total_paiements_dettes,
    v_chiffres.caisse_theorique, p_caisse_declaree, p_caisse_declaree - v_chiffres.caisse_theorique,
    v_chiffres.total_pertes
  )
  on conflict (stall_id, date) do update set
    total_ventes_comptant = excluded.total_ventes_comptant,
    total_paiements_dettes = excluded.total_paiements_dettes,
    caisse_theorique = excluded.caisse_theorique,
    caisse_declaree = excluded.caisse_declaree,
    ecart = excluded.ecart,
    total_pertes = excluded.total_pertes,
    created_at = now()
  returning * into v_rapport;

  return v_rapport;
end;
$$;

-- Analyses (PRD 4.6) : ventes et pertes regroupées par fruit et par unité,
-- sur une période [p_debut, p_fin) en jours de Dakar.
create or replace function public.ventes_par_fruit(p_debut date, p_fin date)
returns table (product_id uuid, unite text, quantite numeric, montant bigint)
language sql stable security definer set search_path = ''
as $$
  select si.product_id, si.unite, sum(si.quantite), sum(round(si.quantite * si.prix_unitaire))::bigint
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where s.stall_id = public.current_stall_id()
    and public.current_user_role() = 'gerant'
    and s.statut = 'validee'
    and s.date >= (p_debut::timestamp at time zone 'Africa/Dakar')
    and s.date < (p_fin::timestamp at time zone 'Africa/Dakar')
  group by si.product_id, si.unite
$$;

create or replace function public.pertes_par_fruit(p_debut date, p_fin date)
returns table (product_id uuid, unite text, quantite numeric, valeur bigint)
language sql stable security definer set search_path = ''
as $$
  select l.product_id, l.unite, sum(l.quantite),
         sum(round(l.quantite * coalesce(
           case when l.unite = 'kg' then coalesce(p.dernier_prix_kg, p.prix_kg)
                else coalesce(p.dernier_prix_piece, p.prix_piece) end, 0)))::bigint
  from public.losses l
  join public.products p on p.id = l.product_id
  where l.stall_id = public.current_stall_id()
    and public.current_user_role() = 'gerant'
    and l.statut = 'validee'
    and l.date >= (p_debut::timestamp at time zone 'Africa/Dakar')
    and l.date < (p_fin::timestamp at time zone 'Africa/Dakar')
  group by l.product_id, l.unite
$$;

revoke execute on function
  public.chiffres_journee(date),
  public.cloturer_journee(date, integer),
  public.ventes_par_fruit(date, date),
  public.pertes_par_fruit(date, date)
from public, anon;

grant execute on function
  public.chiffres_journee(date),
  public.cloturer_journee(date, integer),
  public.ventes_par_fruit(date, date),
  public.pertes_par_fruit(date, date)
to authenticated;
