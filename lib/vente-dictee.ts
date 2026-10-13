// Interprétation d'une vente dictée, par règles simples (sans IA, PRD 4.2).
// « 2 kilos de mangues, 1000 francs » -> Mangue, 2 kg, 500 F le kg (1000 F)
// « 3 mangues 500 francs »            -> Mangue, 3 pièces (PRD 2)
// « deux kilos et demi d'oranges à 600 » -> Orange, 2,5 kg à 600 F le kg
// Le vendeur confirme toujours la vente reconnue avant qu'elle soit enregistrée.

import { FORMES, type Forme } from "./formes";
import type { Unite } from "./types";

export type FruitDictee = {
  id: string;
  nom: string;
  forme: Forme;
  unite_defaut: Unite;
  prix: Record<Unite, number | null>; // prix proposé par unité (null = pas vendu ainsi)
};

export type VenteReconnue = {
  fruit: FruitDictee;
  quantite: number;
  unite: Unite;
  prix_unitaire: number;
  montant: number;
  quantiteSupposee: boolean; // aucune quantité entendue : 1 par défaut
};

export type Interpretation = { ok: true; vente: VenteReconnue } | { ok: false; erreur: string };

// --- Normalisation -----------------------------------------------------------

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`-]/g, " ")
    .replace(/(\d)\s*(f|fr|frs|fcfa|cfa|francs?)\b/g, "$1 $2") // « 1500f » -> « 1500 f »
    .replace(/(\d)\s*(kg|kilos?)\b/g, "$1 $2")
    .replace(/(\d),(\d)/g, "$1.$2") // décimale « 2,5 »
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singulier(mot: string): string {
  return mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

// --- Nombres dits en lettres -----------------------------------------------

const NOMBRES: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  cent: 100, cents: 100, mille: 1000,
};

const DEVISE = new Set(["f", "fr", "frs", "franc", "francs", "fcfa", "cfa", "balle", "balles"]);
const KILO = new Set(["kg", "kilo", "kilos", "kilogramme", "kilogrammes"]);
const PIECE = new Set(["piece", "pieces", "unite", "unites"]);
const PAR_UNITE = new Set(["chacun", "chacune", "chaque", "piece", "pieces", "unite", "kilo", "kg"]);
const VIDES = new Set(["de", "des", "du", "d", "l", "le", "la", "les", "et", "a", "pour", "par", "au", "aux", "en"]);

type Jeton = { mot: string; nombre?: number };

/** Découpe la phrase en mots, en regroupant les nombres (« deux mille cinq cents », « 1 500 »). */
function jetons(texte: string): Jeton[] {
  const mots = normaliser(texte).split(" ").filter(Boolean);
  const sortie: Jeton[] = [];

  for (let i = 0; i < mots.length; i++) {
    const mot = mots[i];

    // Chiffres : « 2.5 », « 1500 », « 1 500 » (milliers séparés par un espace).
    if (/^\d+(\.\d+)?$/.test(mot)) {
      let valeur = Number(mot);
      while (/^\d{1,3}$/.test(mots[i]) && /^\d{3}$/.test(mots[i + 1] ?? "")) {
        valeur = valeur * 1000 + Number(mots[i + 1]);
        i++;
      }
      sortie.push({ mot, nombre: valeur });
      continue;
    }

    // Lettres : on lit la suite de mots-nombres (avec « et » dans « vingt et un »).
    if (mot in NOMBRES) {
      let total = 0;
      let courant = 0;
      let j = i;
      while (j < mots.length) {
        const m = mots[j];
        if (m === "et" && mots[j + 1] in NOMBRES && mots[j + 1] !== "mille" && courant % 10 === 0 && courant >= 20) {
          j++;
          continue;
        }
        if (!(m in NOMBRES)) break;
        const v = NOMBRES[m];
        if (v === 1000) {
          total += (courant || 1) * 1000;
          courant = 0;
        } else if (v === 100) {
          courant = (courant || 1) * 100;
        } else if (v === 20 && courant % 100 === 4) {
          courant += 76; // quatre-vingt
        } else {
          courant += v;
        }
        j++;
      }
      // « deux virgule cinq »
      if (mots[j] === "virgule" && mots[j + 1] in NOMBRES && NOMBRES[mots[j + 1]] < 10) {
        courant += NOMBRES[mots[j + 1]] / 10;
        j += 2;
      }
      sortie.push({ mot, nombre: total + courant });
      i = j - 1;
      continue;
    }

    // « et demi » : ajoute 0,5 au dernier nombre ; « un demi kilo » / « demi kilo » : 0,5.
    if (mot === "demi" || mot === "demie") {
      const precedent = sortie[sortie.length - 1];
      if (precedent?.mot === "et") {
        sortie.pop();
        const dernier = [...sortie].reverse().find((j) => j.nombre !== undefined);
        if (dernier) dernier.nombre! += 0.5;
      } else if (precedent?.nombre === 1) {
        precedent.nombre = 0.5;
      } else {
        sortie.push({ mot, nombre: 0.5 });
      }
      continue;
    }

    sortie.push({ mot });
  }
  return sortie;
}

// --- Fruit (tolérance aux fautes) -------------------------------------------

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function tolerance(longueur: number): number {
  return longueur <= 4 ? 1 : longueur <= 7 ? 2 : 3;
}

type Trouvaille = { fruit: FruitDictee; debut: number; fin: number; score: number };

/** Cherche le fruit dit dans la phrase, parmi les fruits de l'étal. */
function trouverFruit(liste: Jeton[], fruits: FruitDictee[]): Trouvaille | null {
  let meilleur: Trouvaille | null = null;

  for (const fruit of fruits) {
    // Nom complet (« mangue kent »), premier mot (« mangue ») et nom du dessin.
    const noms = [normaliser(fruit.nom), normaliser(fruit.nom).split(" ")[0], normaliser(FORMES[fruit.forme].libelle)];
    noms.forEach((nom, rang) => {
      const motsNom = nom.split(" ").map(singulier);
      for (let i = 0; i + motsNom.length <= liste.length; i++) {
        const morceau = liste.slice(i, i + motsNom.length);
        if (morceau.some((j) => j.nombre !== undefined || VIDES.has(j.mot) || DEVISE.has(j.mot))) continue;
        const dit = morceau.map((j) => singulier(j.mot)).join(" ");
        const cible = motsNom.join(" ");
        const ecart = distance(dit, cible);
        if (ecart > tolerance(cible.length)) continue;
        const score = ecart + rang * 0.5 + (fruit.forme === "autre" && rang === 2 ? 99 : 0);
        if (!meilleur || score < meilleur.score) {
          meilleur = { fruit, debut: i, fin: i + motsNom.length - 1, score };
        }
      }
    });
  }
  return meilleur;
}

// --- Interprétation ----------------------------------------------------------

export function interpreterVente(texte: string, fruits: FruitDictee[]): Interpretation {
  const liste = jetons(texte);
  const trouve = trouverFruit(liste, fruits);
  if (!trouve) {
    return { ok: false, erreur: "Je n'ai pas reconnu le fruit. Dis par exemple « 2 kilos de mangues, 1000 francs »." };
  }
  const { fruit } = trouve;

  // Prix : nombre suivi de « francs » ; sinon nombre après « à » / « pour ».
  let iPrix = liste.findIndex((j, i) => j.nombre !== undefined && DEVISE.has(liste[i + 1]?.mot ?? ""));
  if (iPrix < 0) {
    iPrix = liste.findIndex(
      (j, i) => j.nombre !== undefined && i > trouve.fin && (liste[i - 1]?.mot === "a" || liste[i - 1]?.mot === "pour"),
    );
  }

  // Quantité : premier autre nombre ; sinon, s'il reste deux nombres, le premier.
  const nombres = liste.map((j, i) => ({ j, i })).filter(({ j, i }) => j.nombre !== undefined && i !== iPrix);
  if (iPrix < 0 && nombres.length >= 2) {
    iPrix = nombres[nombres.length - 1].i;
    nombres.pop();
  }
  const quantiteDite = nombres[0];

  // Unité : mot « kilo » / « pièce » juste après la quantité ; sinon, un
  // nombre collé au nom du fruit (« 3 mangues ») veut dire des pièces ;
  // sinon l'unité par défaut du fruit.
  let unite: Unite = fruit.unite_defaut;
  if (quantiteDite) {
    const apres = liste[quantiteDite.i + 1]?.mot ?? "";
    const motUnite = apres === "de" || apres === "d" ? liste[quantiteDite.i + 2]?.mot ?? "" : apres;
    if (KILO.has(motUnite)) unite = "kg";
    else if (PIECE.has(motUnite)) unite = "piece";
    else if (quantiteDite.i + 1 === trouve.debut && fruit.prix.piece !== null) unite = "piece";
  } else if (liste.some((j) => KILO.has(j.mot))) {
    unite = "kg";
  }

  let quantite = quantiteDite?.j.nombre ?? 1;
  if (unite === "piece") quantite = Math.max(1, Math.round(quantite));
  if (quantite <= 0) return { ok: false, erreur: "Je n'ai pas compris la quantité. Réessaie." };

  // Prix dit : prix du kilo / de la pièce (« à 600 », « 500 le kilo »,
  // « 100 chacune ») ou prix total (« 1000 francs », « pour 1000 »).
  let prixUnitaire: number | null = fruit.prix[unite];
  if (iPrix >= 0) {
    const montantDit = liste[iPrix].nombre!;
    const suite = liste.slice(iPrix + 1, iPrix + 4).map((j) => j.mot);
    const parUnite =
      liste[iPrix - 1]?.mot === "a" ||
      suite.some((m, k) => PAR_UNITE.has(m) && (k === 0 || ["le", "la", "l", "par", ...DEVISE].includes(suite[k - 1])));
    prixUnitaire = parUnite ? montantDit : Math.round(montantDit / quantite);
  }
  if (prixUnitaire === null || prixUnitaire <= 0) {
    return { ok: false, erreur: `Je n'ai pas entendu le prix de ${fruit.nom}. Dis-le avec la quantité.` };
  }

  return {
    ok: true,
    vente: {
      fruit,
      quantite,
      unite,
      prix_unitaire: prixUnitaire,
      montant: Math.round(quantite * prixUnitaire),
      quantiteSupposee: !quantiteDite,
    },
  };
}

// --- Plusieurs fruits dans une même phrase -----------------------------------
// « 2 kilos de mangues et 3 bananes à 100 » -> deux lignes dans le panier.

const MOTS_NOMBRES = new Set(Object.keys(NOMBRES));

/** Morceau qui ne fait que compléter le précédent : prix, quantité ou unité seuls. */
function estComplement(morceau: string): boolean {
  return jetons(morceau).every(
    (j) => j.nombre !== undefined || DEVISE.has(j.mot) || KILO.has(j.mot) || PIECE.has(j.mot) || PAR_UNITE.has(j.mot) || VIDES.has(j.mot),
  );
}

/** Découpe la phrase en morceaux, un par fruit (« et », « , », « plus », « puis »). */
function decouper(texte: string, fruits: FruitDictee[]): string[] {
  const brut = texte
    .split(/\s*,\s*(?!\d)|\s+(?:et|plus|puis)\s+/i)
    .map((m) => m.trim())
    .filter(Boolean);

  // Recolle « vingt et un », « et demi », et les morceaux sans fruit
  // (« 2 kilos de mangues, 1000 francs » reste une seule ligne).
  const morceaux: string[] = [];
  for (const m of brut) {
    const precedent = morceaux[morceaux.length - 1];
    const premierMot = normaliser(m).split(" ")[0] ?? "";
    const dernierMotPrecedent = precedent ? normaliser(precedent).split(" ").pop() ?? "" : "";
    const recoller =
      precedent !== undefined &&
      (/^demie?$/.test(premierMot) ||
        (MOTS_NOMBRES.has(dernierMotPrecedent) && /^(un|une|onze)$/.test(premierMot)) ||
        (trouverFruit(jetons(m), fruits) === null && estComplement(m)));
    if (recoller) morceaux[morceaux.length - 1] = `${precedent} et ${m}`;
    else morceaux.push(m);
  }
  return morceaux;
}

export type InterpretationPanier = { ok: true; ventes: VenteReconnue[] } | { ok: false; erreur: string };

export function interpreterPanier(texte: string, fruits: FruitDictee[]): InterpretationPanier {
  const morceaux = decouper(texte, fruits);
  const ventes: VenteReconnue[] = [];
  for (const morceau of morceaux) {
    const r = interpreterVente(morceau, fruits);
    if (!r.ok) return morceaux.length > 1 ? { ok: false, erreur: `« ${morceau} » : ${r.erreur}` } : r;
    ventes.push(r.vente);
  }
  return ventes.length > 0 ? { ok: true, ventes } : { ok: false, erreur: "Je n'ai rien compris. Réessaie." };
}

/** Essaie chaque proposition du navigateur et garde la première comprise. */
export function interpreterPropositions(textes: string[], fruits: FruitDictee[]): InterpretationPanier & { texte: string } {
  let premiere: (InterpretationPanier & { texte: string }) | null = null;
  for (const texte of textes) {
    const r = interpreterPanier(texte, fruits);
    if (r.ok) return { ...r, texte };
    premiere ??= { ...r, texte };
  }
  return premiere ?? { ok: false, erreur: "Je n'ai rien compris. Réessaie.", texte: "" };
}
