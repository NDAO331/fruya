// Facture PDF d'une vente, créée sur le téléphone (même sans réseau), sans
// bibliothèque externe : texte en Helvetica, colonnes de chiffres en
// Courier (largeur fixe, alignement à droite exact). Format A6.

import type { Unite } from "./types";

export type LigneFacture = { nom: string; quantite: number; unite: Unite; prix_unitaire: number; montant: number };

export type Facture = {
  numero: string;
  date: Date;
  etal: string;
  vendeur: string;
  lignes: LigneFacture[];
  total: number;
};

const LARGEUR = 298; // A6 en points (105 × 148 mm)
const HAUTEUR = 420;
const MARGE = 20;

/** Numéro lisible et unique : F-AAAAMMJJ-XXXXXX (tiré de l'id de la vente). */
export function numeroFacture(idVente: string, date: Date): string {
  const jour = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `F-${jour}-${idVente.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// Le PDF utilise l'encodage WinAnsi (latin) : on remplace les caractères qui
// n'y existent pas (espaces fines des nombres français, signe moins…).
function latin(texte: string): string {
  return texte
    .replace(/[   ]/g, " ")
    .replace(/[−–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?");
}

function echapper(texte: string): string {
  return latin(texte).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const nombre = new Intl.NumberFormat("fr-FR");
const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

function f(montant: number): string {
  return `${nombre.format(montant)} F`;
}

function qte(q: number, unite: Unite): string {
  const t = String(Math.round(q * 1000) / 1000).replace(".", ",");
  return unite === "kg" ? `${t} kg` : `${t} pc`;
}

/** Construit le contenu (flux de dessin) de la page. */
function dessiner(fa: Facture): string {
  const ops: string[] = [];
  const texte = (x: number, y: number, police: "F1" | "F2" | "F3", taille: number, t: string) =>
    ops.push(`BT /${police} ${taille} Tf ${x} ${y} Td (${echapper(t)}) Tj ET`);
  // Courier : chaque caractère fait 0,6 × la taille -> alignement à droite exact.
  const adroite = (xFin: number, y: number, taille: number, t: string) =>
    texte(xFin - latin(t).length * taille * 0.6, y, "F3", taille, t);
  const rectangle = (x: number, y: number, l: number, h: number, couleur: string) =>
    ops.push(`${couleur} rg ${x} ${y} ${l} ${h} re f 0 0 0 rg`);
  const trait = (y: number) => ops.push(`0.85 0.85 0.85 RG 0.6 w ${MARGE} ${y} m ${LARGEUR - MARGE} ${y} l S`);

  // En-tête : bandeau orange Fruya, nom de l'étal.
  rectangle(0, HAUTEUR - 6, LARGEUR, 6, "1 0.478 0.102");
  texte(MARGE, HAUTEUR - 40, "F2", 18, fa.etal);
  texte(MARGE, HAUTEUR - 56, "F1", 9, "Vente de fruits");
  texte(LARGEUR - MARGE - 52, HAUTEUR - 40, "F2", 12, "FACTURE");

  let y = HAUTEUR - 84;
  texte(MARGE, y, "F1", 9, `N° ${fa.numero}`);
  texte(MARGE, y - 13, "F1", 9, `Date : ${formatDate.format(fa.date)}`);
  texte(MARGE, y - 26, "F1", 9, `Vendeur : ${fa.vendeur}`);

  // Tableau des fruits.
  y -= 50;
  const colQte = LARGEUR - MARGE - 128;
  const colPrix = LARGEUR - MARGE - 62;
  const colMontant = LARGEUR - MARGE;
  texte(MARGE, y, "F2", 8, "Fruit");
  texte(colQte - 34, y, "F2", 8, "Qté");
  texte(colPrix - 42, y, "F2", 8, "Prix unit.");
  texte(colMontant - 40, y, "F2", 8, "Montant");
  trait(y - 5);
  y -= 19;

  for (const l of fa.lignes) {
    texte(MARGE, y, "F1", 9, l.nom.length > 18 ? `${l.nom.slice(0, 17)}.` : l.nom);
    adroite(colQte, y, 8, qte(l.quantite, l.unite));
    adroite(colPrix, y, 8, f(l.prix_unitaire));
    adroite(colMontant, y, 8, f(l.montant));
    y -= 16;
  }
  trait(y + 8);

  // Total.
  y -= 12;
  rectangle(MARGE, y - 8, LARGEUR - 2 * MARGE, 26, "0.906 0.949 0.922");
  ops.push("0.118 0.420 0.227 rg");
  texte(MARGE + 8, y, "F2", 11, "TOTAL");
  texte(colMontant - 8 - latin(f(fa.total)).length * 13 * 0.6, y, "F3", 13, f(fa.total));
  ops.push("0 0 0 rg");
  texte(MARGE, y - 26, "F1", 9, "Payé comptant.");

  // Pied de page.
  texte(MARGE, 44, "F2", 10, "Jërëjëf ! Merci pour ton achat.");
  texte(MARGE, 28, "F1", 7, "Facture créée avec Fruya");
  return ops.join("\n");
}

/** Assemble un PDF valide (objets + table des références). */
function assembler(contenu: string): Uint8Array {
  // Les textes sont déjà convertis en latin (echapper) ; ici on garde tout le
  // reste tel quel, retours à la ligne compris.
  const octets = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] /Contents 4 0 R ` +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>",
    `<< /Length ${octets(contenu).length} >>\nstream\n${contenu}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(octets(pdf).length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const debutXref = octets(pdf).length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) pdf += `${String(p).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;
  return octets(pdf);
}

export function creerFacturePdf(facture: Facture): Blob {
  const donnees = assembler(dessiner(facture));
  return new Blob([donnees.buffer as ArrayBuffer], { type: "application/pdf" });
}
