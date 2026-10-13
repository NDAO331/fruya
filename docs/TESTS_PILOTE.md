# Fruya — tests avant le pilote

À faire sur **https://fruya.vercel.app**, de préférence sur un vrai téléphone Android (Chrome).
Coche chaque ligne quand c'est bon ; si quelque chose cloche, note le numéro du test et envoie une capture.

Comptes à utiliser : **G** = ton compte gérant (76 773 68 63), **V** = le vendeur (ndao), **A** = l'admin (70 000 00 00).

## 0. Avant de commencer
- [ ] 0.1 Les fichiers SQL **004, 005, 006 et 007** ont été collés dans Supabase (SQL Editor), sans erreur.
- [ ] 0.2 Le compte admin existe (70 000 00 00).

## 1. Installation et connexion
- [ ] 1.1 L'app s'ouvre sur https://fruya.vercel.app, logo Fruya visible.
- [ ] 1.2 Menu ⋮ de Chrome → « Installer l'application » / « Ajouter à l'écran d'accueil » : l'icône orange « f » apparaît.
- [ ] 1.3 L'icône ouvre Fruya en plein écran (sans barre d'adresse), directement sur la caisse.
- [ ] 1.4 (G) Connexion : numéro puis code PIN sur le pavé → caisse.
- [ ] 1.5 Mauvais PIN → « Numéro ou code PIN incorrect ».
- [ ] 1.6 À la connexion suivante, le numéro est déjà rempli : seul le PIN est demandé.

## 2. Caisse (G puis V)
- [ ] 2.1 Toucher un fruit au kilo → taper 2,5 → le bouton affiche le bon total → « Encaisser » → « Encaissé ! ».
- [ ] 2.2 Le total du jour et le nombre de ventes augmentent tout de suite.
- [ ] 2.3 Fruit avec prix au kilo ET à la pièce : la bascule kilo / pièce apparaît et change le prix.
- [ ] 2.4 Changer le prix avant d'encaisser → à la vente suivante, ce nouveau prix est proposé.
- [ ] 2.5 « Envoyer la facture » → le menu Partager s'ouvre → WhatsApp → client : le client reçoit un PDF lisible (étal, n° de facture, fruits, total). « Envoyer plutôt un message texte » marche aussi.
- [ ] 2.5b Panier : Mangue 2 kg → « + Autre fruit pour ce client » → Banane 3 → « Panier · 2 fruits » → « Encaisser » : une seule vente, une seule facture avec les 2 fruits ; ✕ retire une ligne avant d'encaisser.
- [ ] 2.5c Dictée de plusieurs fruits : « deux kilos de mangues et trois bananes » → les 2 lignes s'affichent → « Encaisser ».
- [ ] 2.6 (V) Le vendeur ne voit que ses propres ventes dans son total ; il n'a pas de barre d'onglets.

## 3. Hors-ligne
- [ ] 3.1 Mode avion → faire 2 ventes → « Encaissé ! » + « Pas de réseau : envoyée plus tard ».
- [ ] 3.2 Le total les compte, avec « 2 en attente d'envoi ».
- [ ] 3.3 Réactiver le réseau → en moins de 30 s, « en attente » disparaît ; les ventes apparaissent chez le gérant (Ventes → Journal).
- [ ] 3.4 Fermer complètement l'app, mode avion, rouvrir depuis l'icône → la caisse s'ouvre quand même.
- [ ] 3.5 En mode avion, le bouton « Dicter » est caché ; la saisie à la main marche.

## 4. Pertes
- [ ] 4.1 « Perte » → l'appareil photo s'ouvre directement → photo → fruit → quantité → « Pourri » → « Noter la perte » → « Perte notée ».
- [ ] 4.2 La perte ne change pas le total des ventes.
- [ ] 4.3 (G) Ventes → Journal : la perte apparaît avec son auteur ; en la touchant, la photo s'affiche.
- [ ] 4.4 Perte faite en mode avion → au retour du réseau, la perte puis sa photo arrivent chez le gérant.

## 5. Dictée
- [ ] 5.1 « Dicter » → autoriser le micro → dire « deux kilos de mangues, mille francs » → la vente reconnue s'affiche (Mangue, 2 kg, 500 F le kg, 1 000 F).
- [ ] 5.2 « Encaisser » l'enregistre ; dans le journal du gérant elle est marquée « dictée ».
- [ ] 5.3 « Corriger » ouvre l'écran de vente pré-rempli ; « Redire » réécoute.
- [ ] 5.4 Dire un fruit qui n'existe pas → message clair + « Saisir à la main ».

## 6. Annulations (G et V)
- [ ] 6.1 (V) Caisse → « Tes dernières opérations » : juste après une vente, « Annuler » + raison → la vente est barrée et le total baisse. Au bout de 5 minutes, le bouton disparaît (seul le gérant peut alors annuler).
- [ ] 6.2 (G) Ventes → Journal → toucher une vente → « Annuler » avec une raison → elle reste visible, barrée, avec « Annulée par … : raison ».
- [ ] 6.3 Le total du jour diminue de ce montant.

## 7. Gérant : fruits, vendeurs, étal
- [ ] 7.1 Étal → Fruits et prix : ajouter un fruit (dessin, unité, prix) → il apparaît dans la caisse.
- [ ] 7.2 Retirer un fruit → il disparaît de la caisse ; « Remettre » le fait revenir.
- [ ] 7.3 Étal → Vendeurs : créer un vendeur → il peut se connecter et arrive sur la caisse.
- [ ] 7.4 L'onglet Étal montre la date de fin d'essai.

## 8. Ardoise (dettes)
- [ ] 8.1 Ardoise → « Nouveau client à crédit » → nom, fruits, montant → la fiche affiche « Il te doit … ».
- [ ] 8.2 « Encaisser un paiement » partiel → le montant dû baisse.
- [ ] 8.3 Payer plus que le dû → refusé.
- [ ] 8.4 Annuler une ligne (⋮) avec raison → barrée, le montant dû est recalculé.
- [ ] 8.5 (V) Le vendeur n'a aucun accès à l'ardoise.

## 9. Fin de journée et analyses (G)
- [ ] 9.1 Ventes → « Fin de journée » : caisse théorique = ventes du jour + paiements de dettes du jour.
- [ ] 9.2 Taper l'argent compté → l'écart s'affiche (rouge au-delà de 500 F) → « Enregistrer ».
- [ ] 9.3 Le jour apparaît ensuite dans « Jours précédents ».
- [ ] 9.4 Ventes → Analyses : total du mois, plus / moins vendu, pertes, dettes en cours affichés.

## 10. Stock (G)
- [ ] 10.1 Stock → « Nouvel arrivage » → fruit, quantité, prix d'achat total → le stock augmente.
- [ ] 10.2 Après une vente de ce fruit (dans son unité), le stock baisse.
- [ ] 10.3 Toucher le fruit → « M'alerter sous » → mettre un seuil au-dessus du stock → bandeau « Stock bas » sur la caisse.
- [ ] 10.4 « Inventaire du soir » → taper une quantité → l'écart avec le stock calculé s'affiche.
- [ ] 10.5 Analyses : la marge du fruit apparaît (s'il a un arrivage ce mois-ci).
- [ ] 10.6 Fruits et prix : changer l'unité d'un fruit qui a un arrivage → refusé avec un message clair.

## 11. Admin (A)
- [ ] 11.1 Connexion avec 70 000 00 00 → écran « Administration » (pas de caisse).
- [ ] 11.2 Ton étal de test apparaît, avec son statut « Essai » et sa date de fin.
- [ ] 11.3 Fiche de l'étal → « Enregistrer un paiement » (3 000 F, 1 mois) → statut « Actif », fin d'accès prolongée d'un mois ; « Encaissé ce mois-ci » augmente.
- [ ] 11.4 « Rappel WhatsApp » → WhatsApp s'ouvre vers le gérant avec le message de rappel.
- [ ] 11.5 « Bloquer l'étal » avec raison → (G) le gérant et le vendeur voient « Accès suspendu » ; (A) « Débloquer » → tout revient.
- [ ] 11.6 L'admin ne voit jamais le détail des ventes, pertes ou dettes.

## 12. Expiration (A + G)
- [ ] 12.1 (A) Prolonger l'essai de +7 jours → la date de fin change.
- [ ] 12.2 Pour tester les bandeaux sans attendre, demande à Claude une requête SQL qui avance la date de fin de ton étal de test (rappel, délai de grâce, puis « Abonnement expiré » avec le numéro 76 773 68 63).
