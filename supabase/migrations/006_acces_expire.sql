-- =====================================================================
-- Fruya — accès coupé côté serveur (PRD 4.8).
-- À coller dans le SQL Editor de Supabase, après 005.
--
-- enregistrer_vente et enregistrer_perte refusent un étal bloqué, ou
-- expiré depuis plus de 3 jours (délai de grâce) À LA DATE DE LA VENTE :
-- une vente faite hors-ligne pendant la période autorisée reste acceptée
-- même si elle arrive au serveur plus tard. Un renvoi d'une vente déjà
-- reçue (coupure réseau) est toujours accepté sans rien changer.
-- =====================================================================

create or replace function public.acces_etal_ok(p_stall uuid, p_date timestamptz)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.stalls s
    where s.id = p_stall
      and not s.bloque
      and (p_date at time zone 'Africa/Dakar')::date <= s.date_fin_acces + 3
  )
$$;

create or replace function public.enregistrer_vente(
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

  -- Renvoi après coupure réseau : déjà reçue, rien à faire.
  if exists (select 1 from public.sales where id = p_id) then
    return p_id;
  end if;

  if not public.acces_etal_ok(v_stall, v_date) then
    raise exception 'Abonnement expiré ou étal bloqué : vente refusée.';
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

create or replace function public.enregistrer_perte(
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

  -- Renvoi après coupure réseau : déjà reçue, rien à faire.
  if exists (select 1 from public.losses where id = p_id) then
    return p_id;
  end if;

  if not public.acces_etal_ok(v_stall, v_date) then
    raise exception 'Abonnement expiré ou étal bloqué : perte refusée.';
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

revoke execute on function public.acces_etal_ok(uuid, timestamptz) from public, anon;
grant execute on function public.acces_etal_ok(uuid, timestamptz) to authenticated;
