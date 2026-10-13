# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Fruya — Version 6.7 (MVP Vendeurs de Fruits uniquement)

> Remplace la v5.0. Le périmètre est volontairement limité aux vendeurs de fruits de marché. Toute référence à d'autres profils (boutique fixe, commerce en ligne) et aux formules associées a été retirée. Ce document décrit uniquement ce qui sera construit et testé.
>
> v6.1 : ajout d'une interface Administrateur dans l'app (abonnés, paiements, blocage) et expiration automatique de l'accès.
>
> v6.2 : plus de fruits pré-chargés (le gérant ajoute ses fruits, écran « Ajoutez vos fruits » après l'inscription) ; connexion par téléphone + code PIN à 6 chiffres ; précisions sur la visibilité des ventes, les annulations et les annulations d'ardoise.
>
> v6.3 : ajout de la gestion de stock (arrivages notés par le gérant, stock restant calculé, alerte stock bas, inventaire du soir, marge par fruit).
>
> v6.4 : l'application s'appelle désormais **Fruya** (anciennement GérantPME), avec son logo.
>
> v6.5 : pour le pilote, la dictée utilise la reconnaissance vocale gratuite du navigateur (Web Speech API, fr-FR) au lieu de Whisper ; la vente reconnue est confirmée d'un toucher ; pas de dictée hors-ligne (le micro est caché, la saisie manuelle reste). Whisper est envisagé après le pilote.
>
> v6.6 : panier (plusieurs fruits dans une même vente, à la main comme à la voix) ; le reçu devient une vraie facture PDF partagée par WhatsApp ; annulation par le vendeur dans les 5 minutes depuis la caisse.
>
> v6.7 : moyen de paiement de chaque vente (espèces, Wave ou Orange Money), demandé par un commerçant ; la caisse théorique ne compte que les espèces, Wave et Orange Money sont affichés à part en fin de journée.

---

## 1. Vision Produit

Fruya est une application PWA (installable sur smartphone, utilisable hors-ligne) pour les **vendeurs de fruits de marché** au Sénégal (mangues, oranges, bananes, pastèques, papayes, etc.). Elle leur permet de :

- Encaisser rapidement leurs ventes, **au kilo ou à la pièce**, même sans connexion
- Déclarer leurs pertes (fruits abîmés, pourris, cassés) avec preuve photo
- Dicter leurs ventes à la voix (français)
- Suivre les dettes clients (ardoise)
- Suivre leur stock (arrivages, stock restant, inventaire)
- Consulter des analyses simples de leur activité

---

## 2. Unités de vente : kilo et pièce

Sur le terrain, les vendeurs utilisent les deux unités, parfois pour le même fruit (ex. pastèque vendue entière à la pièce, ou au kilo).

**Règles :**
- Chaque fruit a une **unité par défaut** (kg ou pièce) et peut avoir **un prix au kilo, un prix à la pièce, ou les deux**.
- Lors d'une vente, l'unité par défaut est pré-sélectionnée. Si le fruit a les deux prix, un simple bouton bascule **kg / pièce** est affiché.
- Les quantités au kilo acceptent les décimales (0,5 kg ; 1,5 kg). Les quantités à la pièce sont des entiers.
- Le prix proposé est le **dernier prix utilisé pour ce fruit et cette unité**, modifiable à chaque vente (les prix varient dans la journée et selon le client).
- Les pertes se déclarent avec la même logique d'unité.
- La dictée vocale reconnaît les deux formes : « 2 kilos de mangues, 1000 francs » → 2 kg ; « 3 mangues, 500 francs » → 3 pièces. Si l'unité n'est pas dite, l'unité par défaut du fruit est utilisée.

---

## 3. Deux interfaces

### 3.1 Interface Vendeur (usage quotidien, simplicité maximale)
Pour quelqu'un debout à son étal, avec peu de temps, parfois une faible aisance avec le numérique.

- **Écran principal** : un gros bouton par fruit (nom + icône), total du jour affiché en grand en haut, bouton **Perte** (rouge) toujours visible en bas, bouton **micro** pour la dictée.
- **Vendre** : taper le fruit → quantité (+ bascule kg/pièce si besoin) → prix pré-rempli → **Encaisser** → coche verte. 3 taps maximum dans le cas courant.
- **Moyen de paiement** : juste au-dessus d'**Encaisser**, choix **Espèces / Wave / Orange Money** (Espèces pré-sélectionné : aucun toucher de plus dans le cas courant). Le moyen choisi apparaît sur l'écran « Encaissé ! », la facture et l'historique du gérant.
- **Panier** : pour un client qui prend plusieurs fruits, « + Autre fruit pour ce client » ajoute la ligne à un panier ; les fruits suivants s'y ajoutent ; un seul **Encaisser** pour le total (une seule vente, une seule facture). Chaque ligne du panier peut être retirée avant d'encaisser. La dictée accepte aussi plusieurs fruits dans une phrase (« 2 kilos de mangues et 3 bananes »).
- **Annuler une erreur** : la caisse affiche les dernières opérations du vendeur, avec « Annuler » (raison obligatoire) pendant 5 minutes.
- **Déclarer une perte** : bouton Perte → appareil photo s'ouvre directement → fruit + quantité → confirmer. Même schéma que la vente.
- **Dicter une vente** : appui sur le micro, phrase dite à voix haute, la vente reconnue (fruit, quantité, unité, prix) s'affiche et le vendeur la confirme d'un toucher, ou la corrige (voir sections 4.1 et 4.2).
- Pas d'accès aux dettes, au stock, aux analyses ni aux paramètres.

### 3.2 Interface Gérant
Pour le propriétaire de l'étal, qui peut confier la caisse à un ou plusieurs vendeurs.

- **Accueil** : total du jour, détaillé par vendeur s'il y en a plusieurs. Accès aux sections ci-dessous.
- **Ventes** : historique des ventes et des pertes, avec l'auteur de chaque enregistrement, et les annulations avec leur raison.
- **Dettes (ardoise)** : liste des clients avec montant dû. Fiche client : historique des prises et paiements, bouton **Encaisser un paiement** (total ou partiel). Ajout d'une prise à crédit : client (nom, téléphone), fruits, quantités, montant.
- **Analyses** : voir section 4.6.
- **Fin de journée** : saisie du montant réellement en caisse, comparaison avec la caisse théorique (section 4.4).
- **Fruits et prix** : ajouter un fruit (nom, unité par défaut kg ou pièce, prix au kg et/ou prix à la pièce — au moins un des deux, et obligatoirement celui de l'unité par défaut), modifier ses prix, le désactiver ou le réactiver. Un fruit n'est **jamais supprimé** : il est désactivé et disparaît de la caisse, son historique est conservé.
- **Vendeurs** : le gérant crée le compte de chacun de ses vendeurs (nom, téléphone, code PIN).
- **Stock** : stock restant par fruit, saisie d'un arrivage, inventaire du soir, alertes stock bas (voir section 4.9).

Le gérant peut aussi encaisser des ventes lui-même (il a accès à l'écran de caisse).

**Premier lancement** : aucun fruit n'est pré-chargé. Après l'inscription, le gérant arrive sur l'écran **« Ajoutez vos fruits »**. Tant qu'aucun fruit actif n'existe, la caisse reste vide (avec un message invitant le gérant à ajouter ses fruits).

**Visibilité et annulations** : le vendeur ne voit que ses propres ventes et pertes ; le gérant voit celles de tout l'étal. Le vendeur peut annuler sa propre vente ou perte dans les **5 minutes** suivant sa création, avec raison obligatoire ; passé ce délai (ou pour une vente faite hors-ligne et synchronisée plus tard), seul le gérant peut annuler.

### 3.3 Interface Administrateur (toi uniquement)
Accessible seulement avec un compte de rôle `admin`. Pensée pour être utilisée depuis le téléphone comme depuis un ordinateur.

- **Tableau de bord** : nombre d'étals actifs, en essai, expirés, bloqués ; revenus encaissés ce mois-ci ; nombre d'étals qui expirent dans les 3 prochains jours.
- **Liste des abonnés** : nom de l'étal, nom et téléphone du gérant, statut (essai / actif / expiré / bloqué), date de fin d'accès, date du dernier paiement. Recherche par nom ou téléphone.
- **Filtres rapides** : « Expire dans 3 jours », « En retard », « En essai », « Bloqués ».
- **Fiche abonné** : informations de l'étal, nombre de vendeurs, historique des paiements, date d'inscription, activité récente (date de la dernière vente, pour repérer les étals qui n'utilisent plus l'app).
- **Enregistrer un paiement** : montant (3 000 FCFA par défaut), date, moyen (Wave / Orange Money / espèces), nombre de mois payés (1 par défaut). La date de fin d'accès est prolongée automatiquement.
- **Bloquer / débloquer** un étal manuellement, avec raison obligatoire (cas particuliers : fraude, demande du client, etc.).
- **Prolonger l'essai** gratuitement (ex. +7 jours) si besoin pendant le pilote.
- **Contacter** : bouton qui ouvre WhatsApp vers le gérant avec un message de rappel pré-rempli (« Votre abonnement Fruya expire le … »).

L'administrateur ne voit **pas** le détail des ventes, pertes ou dettes des étals (seulement les chiffres d'activité ci-dessus), pour respecter la confidentialité des commerçants.

Supabase reste accessible en secours pour les opérations exceptionnelles.

---

## 4. Règles de fonctionnement

### 4.1 Hors-ligne
- Toute vente et toute perte est enregistrée **d'abord localement** (IndexedDB), puis synchronisée avec Supabase dès que le réseau est disponible.
- **Vente manuelle** : le total du jour se met à jour immédiatement sur le téléphone, avant toute confirmation serveur.
- **Vente dictée (pilote)** : la reconnaissance vocale du navigateur a besoin du réseau. Sans réseau (ou si le navigateur ne la gère pas), le bouton micro est caché et la vente se saisit à la main. Une fois confirmée, la vente dictée suit exactement le même chemin qu'une vente manuelle (enregistrée d'abord sur le téléphone, puis synchronisée).
- *Après le pilote, avec Whisper* : l'audio pourra être enregistré localement et transcrit au retour du réseau (ligne « Vente vocale en attente », non comptée dans le total tant qu'elle n'est pas transcrite).
- **Photo de perte** : stockée localement, envoyée vers Supabase Storage au retour du réseau. La perte est enregistrée immédiatement, la photo suit.
- Un indicateur discret montre le nombre d'éléments en attente de synchronisation.
- La saisie manuelle reste toujours possible : le vocal n'est jamais bloquant.

### 4.2 Langue vocale
- **MVP / pilote : français uniquement**, via la reconnaissance vocale gratuite du navigateur (Web Speech API, langue fr-FR), puis extraction par règles simples : fruit (parmi les fruits de l'étal, fautes tolérées), quantité (chiffres ou lettres, « et demi »), unité (kilo ou pièce, sinon l'unité par défaut du fruit), prix (« 1000 francs » = prix total ; « à 600 », « 500 le kilo », « 100 chacune » = prix unitaire). La vente reconnue est toujours confirmée par le vendeur avant d'être enregistrée.
- La reconnaissance est isolée derrière une interface unique (`lib/voix.ts`, fonction `transcrire()`) : passer à **Whisper (OpenAI)** après le pilote ne demande de modifier que ce fichier.
- **Après le pilote** : peulh/pulaar via Omnilingual ASR (Meta, open-source), qui couvre le pulaar. Intégration plus lourde (modèle à héberger), donc reportée.

### 4.3 Anti-fraude
- Chaque vente et perte est horodatée et liée au compte connecté. Un compte par personne, jamais de compte partagé.
- Connexion par **numéro de téléphone + code PIN à 6 chiffres** (pas de SMS). Le gérant crée son compte en s'inscrivant (nom, téléphone, nom de l'étal, PIN) ; il crée ensuite les comptes de ses vendeurs.
- Aucune suppression : seulement une **annulation avec raison obligatoire**, l'historique est conservé.
- Le gérant voit qui a enregistré et qui a annulé chaque transaction.
- Photo obligatoire pour toute perte.
- Écart de caisse calculé chaque soir (section 4.4).

### 4.4 Caisse théorique et fin de journée
**Caisse théorique du jour** =
ventes validées du jour payées en espèces
\+ paiements de dettes encaissés dans la journée.

Les prises à crédit (ardoise) **n'entrent pas** dans la caisse théorique : aucun argent n'a été reçu.

Les ventes payées par **Wave** ou **Orange Money** n'entrent pas non plus dans la caisse (l'argent arrive sur le téléphone) : elles sont affichées à part, par moyen, pour que le gérant les vérifie sur son compte.

Le gérant saisit le montant réellement compté. L'application affiche l'écart (positif ou négatif), mis en évidence au-delà d'un seuil (ex. 500 FCFA). Le rapport est enregistré et consultable ensuite.

### 4.5 Dettes (ardoise)
- Une prise à crédit est enregistrée par le gérant depuis la section Dettes (pas depuis l'interface Vendeur pour le MVP).
- Chaque prise et chaque paiement est une transaction datée. Le montant dû est la somme des prises moins la somme des paiements.
- Pas de suppression : correction par une transaction d'annulation avec raison.

### 4.6 Analyses (règles simples, sans IA)
- Total du mois vs mois précédent
- Fruit le plus vendu et le moins vendu (en montant)
- Total des pertes du mois (en quantité et en valeur estimée au dernier prix)
- Taux de perte par fruit (pertes / ventes), pour repérer les fruits qui pourrissent le plus
- Total des dettes en cours
- Marge par fruit : chiffre d'affaires − coût d'achat des quantités vendues (au prix d'achat moyen des arrivages, voir section 4.9)
- Messages automatiques basés sur des seuils, ex. « Vos pertes de mangues ont augmenté de 20 % ce mois-ci »

### 4.7 Facture WhatsApp
Après une vente, bouton optionnel **« Envoyer la facture »** : une vraie facture **PDF** est créée sur le téléphone (même sans réseau) — nom de l'étal, numéro de facture (F-AAAAMMJJ-XXXXXX), date et heure, vendeur, fruits, quantités, prix unitaires, montants, total — puis le menu **Partager** du téléphone s'ouvre : le vendeur choisit WhatsApp puis le client. WhatsApp ne permet pas à une app d'envoyer un fichier directement à un numéro, d'où le passage par le menu Partager. Si le téléphone ne sait pas partager de fichier, le PDF est téléchargé pour être joint à la main. En secours, le reçu en **message texte** (lien `wa.me` vers le numéro du client) reste disponible. Aucune API WhatsApp nécessaire.

### 4.8 Accès et paiement
- Pas de paiement en ligne dans l'application pour le MVP.
- **Essai gratuit de 14 jours** à l'inscription : `date_fin_acces` = date d'inscription + 14 jours.
- Ensuite, abonnement **3 000 FCFA/mois**, payé directement à toi via Wave ou Orange Money, en dehors de l'app.
- **Expiration automatique** : quand la date du jour dépasse `date_fin_acces`, l'accès est coupé automatiquement, sans action de ta part.
- **Délai de grâce de 3 jours** après la date de fin : l'app reste utilisable mais affiche un bandeau « Votre abonnement a expiré, payez avant le … ». Après ces 3 jours, accès coupé.
- **Rappel** : 3 jours avant la date de fin, le gérant voit un bandeau « Votre abonnement expire le … ».
- **Écran d'accès coupé** : « Abonnement expiré. Payez 3 000 FCFA par Wave ou Orange Money au [ton numéro], puis appelez-nous. » Aucune donnée n'est supprimée : tout revient dès le paiement enregistré.
- **Hors-ligne** : le téléphone garde en mémoire la dernière date de fin connue. Un étal expiré ne peut pas continuer indéfiniment hors-ligne : passé la date + délai de grâce, l'écran d'accès coupé s'affiche même sans réseau.
- **Statut affiché** (calculé, pas saisi) :
  - `essai` : pas encore de paiement, date de fin non dépassée
  - `actif` : au moins un paiement, date de fin non dépassée
  - `expiré` : date de fin dépassée
  - `bloqué` : blocage manuel par l'admin (prioritaire sur tout le reste)
- Quand tu enregistres un paiement : nouvelle `date_fin_acces` = max(ancienne date de fin, aujourd'hui) + nombre de mois payés.

### 4.9 Stock
- **Arrivage** : seul le gérant enregistre ce qu'il achète au grossiste — fruit, quantité, prix d'achat total, date. Chaque arrivage est horodaté et lié à son auteur. Pas de suppression : annulation avec raison obligatoire.
- **Une seule unité de stock par fruit** : l'unité par défaut du fruit (kg ou pièce). L'arrivage est saisi dans cette unité. L'unité par défaut ne peut plus être changée une fois qu'un arrivage existe.
- **Stock restant (calculé, jamais saisi)** = dernier inventaire compté (ou 0) + arrivages depuis − ventes validées depuis − pertes validées depuis, en ne comptant que les quantités exprimées dans l'unité de stock. Les ventes et pertes dans l'autre unité (ex. pastèque stockée à la pièce mais vendue au kilo) ne sont pas déduites.
- Les ventes et pertes faites hors-ligne sont déduites à leur synchronisation ; le stock affiché peut donc être en léger retard.
- **Alerte stock bas** : le gérant fixe un seuil par fruit (facultatif). Sous ce seuil, un bandeau l'avertit sur son accueil. Le stock ne bloque jamais une vente (un stock négatif est affiché tel quel, signe d'un arrivage oublié ou d'un écart).
- **Inventaire du soir** : le gérant compte ce qui reste pour un ou plusieurs fruits. L'app affiche l'écart avec le stock calculé (positif ou négatif), comme l'écart de caisse. Le compte devient le nouveau point de départ du stock. L'inventaire est enregistré et consultable.
- **Prix d'achat moyen** d'un fruit = somme des prix d'achat ÷ somme des quantités des arrivages validés du mois ; il sert au calcul de la marge (section 4.6).
- Le vendeur ne voit ni le stock, ni les arrivages, ni les prix d'achat.

---

## 5. Architecture technique

| Composant | Technologie | Rôle |
|---|---|---|
| Frontend & PWA | Next.js (App Router) + Tailwind CSS | Interface mobile, installable |
| Langage | TypeScript | Typage des entités |
| Base de données & Auth | Supabase (Postgres) | Stockage, authentification, temps réel |
| Hors-ligne | IndexedDB (Dexie.js) + Service Worker | File d'attente locale (ventes, pertes, audio, photos) |
| Dictée vocale | Pilote : Web Speech API du navigateur (fr-FR) ; ensuite : API Whisper (OpenAI) | Voix → texte → vente structurée (règles simples) |
| Photos | Supabase Storage | Photos de pertes |

---

## 6. Modèle de données

- **stalls** (id, nom, gérant_id, date_inscription, date_fin_acces, bloqué [oui/non], raison_blocage) — le statut (essai/actif/expiré/bloqué) est calculé, voir section 4.8
- **users** (id, téléphone, nom, rôle [vendeur/gérant/admin], stall_id — vide pour l'admin)
- **payments** (id, stall_id, montant, date_paiement, moyen [wave/orange_money/espèces], mois_payés, enregistré_par, note)
- **products** (id, stall_id, nom, unité_défaut [kg/pièce], prix_kg, prix_pièce, dernier_prix_kg, dernier_prix_pièce, actif) — ajoutés par le gérant ; les derniers prix sont mis à jour à chaque vente et pré-remplissent la caisse, aucun fruit pré-chargé ; au moins un prix renseigné ; jamais supprimés, seulement désactivés (actif = non)
- **sales** (id, stall_id, user_id, date, montant_total, méthode [manuelle/vocale], paiement [espèces/wave/orange_money], statut [validée/annulée], raison_annulation, annulée_par)
- **sale_items** (id, sale_id, product_id, quantité [décimal], unité [kg/pièce], prix_unitaire)
- **voice_queue** (local uniquement, IndexedDB) (id, audio, date, statut [en_attente/transcrite/échec]) — *après le pilote seulement, avec Whisper*
- **losses** (id, stall_id, user_id, date, product_id, quantité, unité, raison, photo_url, statut [validée/annulée], raison_annulation, annulée_par)
- **debts** (id, stall_id, client_nom, client_téléphone) — montant dû calculé à partir des transactions
- **debt_transactions** (id, debt_id, user_id, type [prise/paiement/annulation], montant, détail_fruits, transaction_annulée_id, raison, date) — une annulation pointe vers la prise ou le paiement qu'elle corrige, avec raison obligatoire
- **daily_reports** (id, stall_id, date, total_ventes_comptant, total_paiements_dettes, caisse_théorique, caisse_déclarée, écart, total_pertes, total_wave, total_orange_money)
- **stock_arrivals** (id, stall_id, product_id, user_id, date, quantité, unité, prix_achat_total, statut [validée/annulée], raison_annulation, annulée_par)
- **stock_counts** (id, stall_id, product_id, user_id, date, quantité_comptée, quantité_théorique, écart, unité) — inventaires
- **products** reçoit aussi seuil_alerte (facultatif, dans l'unité de stock)

Règles de sécurité Supabase (RLS) :
- Un vendeur ou un gérant ne voit que les données de son étal.
- Un vendeur n'a pas accès aux tables debts, debt_transactions, daily_reports, payments, stock_arrivals et stock_counts.
- Un gérant peut lire les paiements de son étal, mais pas les modifier.
- L'admin peut lire et modifier stalls, users et payments de tous les étals, mais n'a pas accès au détail des ventes, pertes et dettes (seulement des totaux via une vue dédiée).
- Le rôle `admin` ne peut pas être attribué depuis l'app : il est défini une seule fois, à la main, dans Supabase.

---

## 7. Critères de succès du pilote

Sur 5 à 10 vendeurs de fruits pendant 2 semaines :
- Une vente est encaissée en moins de 15 secondes en usage normal
- Au moins 70 % des ventes passent correctement en hors-ligne puis se synchronisent sans perte
- Au moins 50 % des utilisateurs déclarent au moins une perte avec photo
- Le gérant utilise la section Dettes au moins une fois
- Au moins 3 étals paient l'abonnement à la fin de l'essai gratuit

---

## 8. Planning (temps plein jusqu'en novembre 2026)

**Développement (semaines 1 à 7)**
- Semaines 1-2 : Next.js + Supabase, authentification, rôles Vendeur/Gérant, étals, modèle de données, ajout des fruits par le gérant (écran « Ajoutez vos fruits »)
- Semaines 3-4 : caisse (kg/pièce), mode hors-ligne et synchronisation, pertes avec photo
- Semaine 5 : dictée vocale (navigateur pour le pilote), reçu WhatsApp, section Dettes
- Semaine 6 : Analyses, fin de journée, interface Admin (abonnés, paiements, blocage), expiration automatique de l'accès
- Semaine 7 : stock (arrivages, stock restant, alerte stock bas, inventaire du soir, marge par fruit), tests internes (prévoir 2 jours de plus si nécessaire)

**Pilote (semaines 8-9)**
- Déploiement chez 5 à 10 vendeurs de fruits
- Corrections selon les retours
- Mesure des critères de succès

**Après le pilote**
- Dictée en peulh/pulaar (Omnilingual ASR)

---

## 9. Risques

- **Reconnaissance du navigateur (pilote)** : gratuite, mais qualité variable selon le téléphone, besoin de réseau et d'une adresse sécurisée (https) pour le micro ; pas disponible sur tous les navigateurs (le micro est alors caché)
- **Coût de l'API Whisper** (après le pilote) : à mesurer pour vérifier qu'il reste compatible avec 3 000 FCFA/mois
- **Reconnaissance vocale en marché** : bruit ambiant, noms de fruits locaux, montants dits rapidement. À tester tôt (semaine 5) dans un vrai marché
- **Données personnelles** : vérifier les obligations sénégalaises (CDP) sur les numéros de téléphone, photos et dettes clients avant le lancement public
- **Concurrence** : les caisses existantes au Sénégal (Baol Caisse, YoriinApp, Meejo Manage, Mixx Business) ciblent les boutiques avec code-barres, pas les vendeurs de fruits. À surveiller

---

*Document de référence pour Claude Code / Cursor, à utiliser section par section pendant le développement.*
