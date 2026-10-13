-- =====================================================================
-- Fruya — le trigger d'inscription ne gère plus que les gérants.
-- À coller dans le SQL Editor de Supabase, après 002_forme_fruit.sql.
--
-- Pourquoi : à la création d'un compte par la clé secrète, Supabase
-- insère le compte AVANT d'y attacher app_metadata ; le trigger ne voyait
-- donc jamais role = 'vendeur'. La fiche vendeur est désormais créée par
-- le serveur de l'app (app/gerant/vendeurs/actions.ts), après avoir
-- vérifié que l'utilisateur connecté est le gérant de l'étal.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nom text := trim(new.raw_user_meta_data ->> 'nom');
  v_tel text := trim(new.raw_user_meta_data ->> 'telephone');
  v_nom_etal text := trim(new.raw_user_meta_data ->> 'nom_etal');
  v_stall_id uuid;
begin
  -- Inscription d'un gérant (signUp) : user_metadata = {nom, telephone, nom_etal}
  -- -> crée l'étal (essai 14 jours) et le profil gérant.
  if v_nom_etal is not null and v_nom_etal <> '' then
    insert into public.stalls (nom, gerant_id)
    values (v_nom_etal, new.id)
    returning id into v_stall_id;

    insert into public.users (id, telephone, nom, role, stall_id)
    values (new.id, v_tel, v_nom, 'gerant', v_stall_id);
  end if;
  -- Sinon (vendeur créé par le serveur, admin créé à la main) : rien.
  return new;
end;
$$;
