@AGENTS.md
@docs/PRD.md

## Règles du projet
- L'application s'appelle **Fruya** (anciennement GérantPME). Logo et icônes : `public/logo/`, `public/icons/`, `app/icon.svg`, `app/apple-icon.png`. L'identifiant technique `tel.gerantpme.local` (email de connexion dérivé du téléphone) ne doit pas changer : les comptes existants en dépendent.
- Interface en français, pensée mobile d'abord (vendeurs debout à l'étal).
- Le PRD (docs/PRD.md) est la référence : ne pas ajouter de fonctionnalités hors périmètre.
- Toute vente/perte doit fonctionner hors-ligne (IndexedDB) avant d'être synchronisée.
- Ne jamais supprimer une vente ou une perte : uniquement annuler avec raison.
- L'interface Admin est réservée au rôle admin et ne montre jamais le détail des ventes, pertes ou dettes des étals.

## Design

### À éviter absolument (l'app ne doit pas avoir l'air générée par IA)
- Pas de dégradés, pas de violet ni de bleu « tech ».
- Pas de cartes blanches arrondies avec ombres partout, pas d'effets de verre ou de flou.
- Pas d'emojis comme icônes, pas d'icônes « étoiles / magie ».
- Pas de textes génériques (« Bienvenue 👋 », « Gérez votre activité facilement »).
- Pas de police fine et grise.

### Identité visuelle (direction « app pro », référence : Wave)
- **C'est une application mobile, pas un site** : plein écran, installable (PWA), barre d'onglets en bas pour le gérant, en-tête simple avec titre et retour, formulaires dans des panneaux qui montent du bas, clavier PIN à l'écran pour la connexion. Pas de liens soulignés ni de pages-formulaires interminables.
- Un écran = une action principale, un seul gros bouton d'action par écran.
- **Couleurs Fruya** : orange mangue **#FF7A1A** et vert feuille **#1E6B3A** comme couleurs principales, sur fond blanc, texte en quasi-noir (#15171A). Vert : bouton d'action principal, carte du total, onglet actif, messages de réussite (texte blanc sur vert, ou vert sur #E7F2EB). Orange : marque, pastilles, éléments mis en avant (jamais de texte blanc sur orange : contraste insuffisant ; texte foncé sur orange, ou orange clair #FFC59A sur vert). Rouge (#B42318 sur #FDECEA) réservé à Perte et aux erreurs. Aplats uniquement.
- Montants dans une police épaisse et un peu étroite (Barlow Semi Condensed 700, chiffres de même largeur) ; texte en Barlow 500-700.
- Chaque fruit a une forme simple dessinée en SVG dans un rond de sa couleur pâle (pas d'emoji, pas de photo).
- Caisse : carte verte en haut (ventes du jour, nombre de ventes, éléments en attente), boutons Perte et Dicter, liste des fruits avec prix alignés à droite.
- Textes courts, ton du marché : « Encaissé ! », « Perte notée », « Il te doit 2 500 F ».
- **Tutoiement partout**, avec un peu de wolof pour les salutations et remerciements, jamais pour les informations importantes (montants, erreurs, consignes restent en français). Expressions utilisées : « Nanga def ? » (ça va ?), « Jërëjëf » (merci), « Waaw » (oui), « Ba beneen yoon » (à la prochaine).
- Le gérant choisit la forme de chaque fruit dans une grille (colonne `products.forme`) ; « autre » = cercle de couleur neutre.
- Thème clair uniquement (lisible en plein soleil), pas de mode sombre.
