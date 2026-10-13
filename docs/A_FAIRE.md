# Fruya — Points à ne pas oublier

## Semaines 1-2
- [x] **Création des vendeurs** : la Server Action qui crée un vendeur avec la clé secrète (`SUPABASE_SECRET_KEY`) doit vérifier côté serveur que l'utilisateur connecté est bien le gérant de l'étal indiqué dans `stall_id`. → Fait dans `app/gerant/vendeurs/actions.ts` : l'étal vient du profil connecté (jamais du formulaire) et `stalls.gerant_id` est vérifié avant d'utiliser la clé.

## Logo
- [x] Logo Fruya intégré (voir fruya-logo/LISEZMOI.md) : `app/icon.svg`, `app/apple-icon.png`, `public/icons/` (PWA), `public/logo/` (écran de connexion).

## Semaines 3-4
- [x] **Stockage des photos de pertes** : règles de sécurité Supabase Storage — un dossier par étal, lecture autorisée au gérant de l'étal et à l'auteur de la perte uniquement. → `supabase/migrations/004_photos_pertes.sql` (bucket privé `pertes`, envoi par l'auteur de la perte seulement, ni remplacement ni suppression).

## Semaine 6
- [x] **Accès coupé côté serveur** : `enregistrer_vente` et `enregistrer_perte` doivent refuser un étal bloqué, ou expiré depuis plus de 3 jours (délai de grâce) à la date de la vente. → `supabase/migrations/006_acces_expire.sql` (un renvoi d'une vente déjà reçue reste accepté).
- [x] **Numéro de paiement** : ajouter `FRUYA_NUMERO_PAIEMENT=77 xxx xx xx` dans `.env.local` (affiché sur l'écran « Abonnement expiré » et dans le rappel WhatsApp).
- [ ] **Compte admin** : à créer à la main dans Supabase (voir la fin de `001_schema_initial.sql`), mot de passe = code PIN à 6 chiffres.
- [x] **Fin de journée** : la caisse théorique du rapport (`daily_reports`) doit être calculée par le serveur, pas envoyée par le téléphone. → `supabase/migrations/005_fin_de_journee_analyses.sql` (`cloturer_journee` : le téléphone n'envoie que l'argent compté ; écriture directe dans `daily_reports` retirée).
