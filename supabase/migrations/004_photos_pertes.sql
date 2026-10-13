-- =====================================================================
-- Fruya — stockage des photos de pertes (Supabase Storage).
-- À coller dans le SQL Editor de Supabase, après 003.
--
-- Rangement : bucket privé « pertes », un dossier par étal :
--   pertes/<stall_id>/<loss_id>.jpg
-- Envoi : uniquement par l'auteur de la perte, une fois la perte enregistrée,
--         dans le dossier de son étal. Jamais de remplacement ni de suppression.
-- Lecture : le gérant de l'étal et l'auteur de la perte uniquement.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pertes', 'pertes', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Id de la perte à partir du chemin « <stall_id>/<loss_id>.jpg ».
create or replace function public.perte_du_fichier(p_chemin text)
returns uuid
language sql stable set search_path = ''
as $$
  select case
    when split_part(storage.filename(p_chemin), '.', 1)
         ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(storage.filename(p_chemin), '.', 1)::uuid
  end
$$;

drop policy if exists "pertes_photo_envoi" on storage.objects;
drop policy if exists "pertes_photo_lecture" on storage.objects;

create policy "pertes_photo_envoi" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pertes'
    and (storage.foldername(name))[1] = (select public.current_stall_id())::text
    and exists (
      select 1 from public.losses l
      where l.id = public.perte_du_fichier(name)
        and l.user_id = (select auth.uid())
        and l.stall_id = (select public.current_stall_id())
    )
  );

create policy "pertes_photo_lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'pertes'
    and (storage.foldername(name))[1] = (select public.current_stall_id())::text
    and (
      (select public.current_user_role()) = 'gerant'
      or exists (
        select 1 from public.losses l
        where l.id = public.perte_du_fichier(name)
          and l.user_id = (select auth.uid())
      )
    )
  );

-- La photo rattachée à une perte doit être exactement son fichier dans le
-- dossier de son étal (pas un lien vers autre chose).
create or replace function public.attacher_photo_perte(p_id uuid, p_photo_url text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_perte public.losses;
begin
  select * into v_perte from public.losses where id = p_id for update;

  if v_perte.id is null or v_perte.user_id <> auth.uid() then
    raise exception 'Perte introuvable.';
  end if;
  if p_photo_url is null
     or p_photo_url !~ ('^' || v_perte.stall_id::text || '/' || v_perte.id::text || '\.(jpg|png|webp)$') then
    raise exception 'Chemin de photo invalide.';
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

revoke execute on function public.attacher_photo_perte(uuid, text) from public, anon;
grant execute on function public.attacher_photo_perte(uuid, text) to authenticated;
