// Formes dessinées des fruits. La liste des clés doit rester identique à la
// contrainte SQL de products.forme (supabase/migrations/002_forme_fruit.sql).

export const FORMES = {
  mangue: { libelle: "Mangue", fond: "#FBE7C4" },
  banane: { libelle: "Banane", fond: "#F8EDB8" },
  pasteque: { libelle: "Pastèque", fond: "#F6D5CF" },
  orange: { libelle: "Orange", fond: "#F9DCC6" },
  mandarine: { libelle: "Mandarine", fond: "#FADFC2" },
  citron: { libelle: "Citron", fond: "#E3EDCF" },
  papaye: { libelle: "Papaye", fond: "#F8DCCD" },
  ananas: { libelle: "Ananas", fond: "#F6E6BE" },
  avocat: { libelle: "Avocat", fond: "#DCE6CC" },
  pomme: { libelle: "Pomme", fond: "#F4D3CF" },
  corossol: { libelle: "Corossol", fond: "#DDE9CF" },
  coco: { libelle: "Coco", fond: "#E9DCCB" },
  madd: { libelle: "Madd", fond: "#F6E2BF" },
  raisin: { libelle: "Raisin", fond: "#E4EDCB" },
  autre: { libelle: "Autre", fond: "#EDE3CF" },
} as const;

export type Forme = keyof typeof FORMES;

export const LISTE_FORMES = Object.keys(FORMES) as Forme[];

export function estForme(valeur: string): valeur is Forme {
  return valeur in FORMES;
}
