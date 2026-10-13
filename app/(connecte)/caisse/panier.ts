"use client";

import { fcfa } from "@/lib/format";
import type { Forme } from "@/lib/formes";
import { nouvelId } from "@/lib/hors-ligne/base";
import { enregistrerVenteLocale, montantLigne } from "@/lib/hors-ligne/ventes";
import type { Unite } from "@/lib/types";

// Panier : plusieurs fruits dans une même vente (une seule facture).
export type LignePanier = {
  cle: string;
  product_id: string;
  nom: string;
  forme: Forme;
  quantite: number;
  unite: Unite;
  prix_unitaire: number;
  montant: number;
};

export function nouvelleLigne(l: Omit<LignePanier, "cle" | "montant">): LignePanier {
  return { ...l, cle: nouvelId(), montant: montantLigne(l) };
}

export function quantiteAffichee(quantite: number, unite: Unite): string {
  const texte = String(quantite).replace(".", ",");
  return unite === "kg" ? `${texte} kg` : `${texte} ${quantite > 1 ? "pièces" : "pièce"}`;
}

export function totalPanier(lignes: LignePanier[]): number {
  return lignes.reduce((s, l) => s + l.montant, 0);
}

/** Enregistre la vente (une ou plusieurs lignes) sur le téléphone, avant envoi. */
export async function encaisserLignes(
  lignes: LignePanier[],
  methode: "manuelle" | "vocale",
  stallId: string,
  userId: string,
): Promise<{ id: string; date: Date }> {
  const resume =
    lignes.length === 1
      ? `${lignes[0].nom} · ${quantiteAffichee(lignes[0].quantite, lignes[0].unite)} à ${fcfa(lignes[0].prix_unitaire)}`
      : lignes.map((l) => `${l.nom} ${quantiteAffichee(l.quantite, l.unite)}`).join(", ");
  const vente = await enregistrerVenteLocale({
    stall_id: stallId,
    user_id: userId,
    methode,
    lignes: lignes.map((l) => ({ product_id: l.product_id, quantite: l.quantite, unite: l.unite, prix_unitaire: l.prix_unitaire })),
    resume,
  });
  return { id: vente.id, date: new Date(vente.date) };
}
