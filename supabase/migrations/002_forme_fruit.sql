-- =====================================================================
-- Fruya — forme dessinée de chaque fruit (choisie par le gérant).
-- À coller dans le SQL Editor de Supabase, après 001_schema_initial.sql.
-- La liste doit rester identique à lib/formes.ts.
-- =====================================================================

alter table public.products
  add column if not exists forme text not null default 'autre'
  check (forme in (
    'mangue', 'banane', 'pasteque', 'orange', 'mandarine', 'citron',
    'papaye', 'ananas', 'avocat', 'pomme', 'corossol', 'coco',
    'madd', 'raisin', 'autre'
  ));
