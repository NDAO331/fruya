# Fruya

Caisse mobile (PWA) pour les vendeurs de fruits de marché au Sénégal : ventes au kilo ou à la pièce,
même sans réseau, pertes avec photo, dictée vocale, facture PDF par WhatsApp, ardoise, stock,
fin de journée et analyses. Interface administrateur pour les abonnements.

- Spécifications : [docs/PRD.md](docs/PRD.md)
- Tests avant le pilote : [docs/TESTS_PILOTE.md](docs/TESTS_PILOTE.md)
- Points à suivre : [docs/A_FAIRE.md](docs/A_FAIRE.md)

## Technique

- Next.js 16 (App Router) + Tailwind CSS 4, TypeScript
- Supabase (Postgres, Auth, Storage) — schéma et règles de sécurité dans `supabase/migrations/` (à coller dans l'ordre dans le SQL Editor)
- Hors-ligne : IndexedDB (Dexie) + service worker (`public/sw.js`)
- Hébergement : Vercel (région Dublin, à côté de Supabase eu-west-1), mise en ligne automatique à chaque envoi sur `main`

## Lancer en local

Créer `.env.local` avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY` et `FRUYA_NUMERO_PAIEMENT`, puis :

```bash
npm install
npm run dev
```

Version optimisée (pour tester sur téléphone) : `npm run prod`.
