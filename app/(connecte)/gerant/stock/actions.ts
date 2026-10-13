"use server";

import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/types";

// Stock (PRD 4.9) : toutes les écritures passent par les fonctions SQL
// (enregistrer_arrivage, annuler_arrivage, enregistrer_inventaire).

function nombre(valeur: FormDataEntryValue | null): number {
  const n = Number(String(valeur ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function rafraichir() {
  revalidatePath("/gerant/stock");
  revalidatePath("/caisse");
  revalidatePath("/gerant/analyses");
}

function message(code: string | undefined, texte: string, defaut: string): string {
  return code === "P0001" ? texte : defaut;
}

export async function ajouterArrivage(productId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const quantite = nombre(formData.get("quantite"));
  const prix = nombre(formData.get("prix_achat_total"));
  if (!(quantite > 0)) return { erreur: "Écris la quantité reçue." };
  if (!(prix >= 0) || !Number.isInteger(prix)) return { erreur: "Écris le prix d'achat total, en francs." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("enregistrer_arrivage", {
    p_product_id: productId,
    p_quantite: quantite,
    p_prix_achat_total: prix,
  });
  if (error) {
    console.error("[ajouterArrivage]", error.code, error.message);
    return { erreur: message(error.code, error.message, "L'arrivage n'a pas été noté. Réessaie.") };
  }
  rafraichir();
  return { succes: "Arrivage noté." };
}

export async function annulerArrivage(arrivageId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const raison = String(formData.get("raison") ?? "").trim();
  if (!raison) return { erreur: "Écris la raison de l'annulation." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("annuler_arrivage", { p_id: arrivageId, p_raison: raison });
  if (error) return { erreur: message(error.code, error.message, "L'annulation n'a pas marché. Réessaie.") };
  rafraichir();
  return { succes: "Arrivage annulé." };
}

export async function changerSeuil(productId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const texte = String(formData.get("seuil") ?? "").trim();
  const seuil = texte === "" ? null : nombre(texte);
  if (seuil !== null && !(seuil >= 0)) return { erreur: "Seuil invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ seuil_alerte: seuil }).eq("id", productId);
  if (error) return { erreur: "Le seuil n'a pas été enregistré. Réessaie." };
  rafraichir();
  return { succes: seuil === null ? "Alerte retirée." : "Seuil d'alerte enregistré." };
}

export type ResultatInventaire = {
  product_id: string;
  unite: "kg" | "piece";
  quantite_theorique: number;
  quantite_comptee: number;
  ecart: number;
};

/** Inventaire du soir : on n'envoie que les quantités comptées. */
export async function faireInventaire(
  _e: { erreur?: string; resultats?: ResultatInventaire[] } | null,
  formData: FormData,
): Promise<{ erreur?: string; resultats?: ResultatInventaire[] } | null> {
  await exigerRole(["gerant"]);
  const lignes: { product_id: string; quantite: number }[] = [];
  for (const [cle, valeur] of formData.entries()) {
    if (!cle.startsWith("compte:") || String(valeur).trim() === "") continue;
    const quantite = nombre(valeur);
    if (!(quantite >= 0)) return { erreur: "Une quantité comptée est invalide." };
    lignes.push({ product_id: cle.slice("compte:".length), quantite });
  }
  if (lignes.length === 0) return { erreur: "Écris ce que tu as compté pour au moins un fruit." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enregistrer_inventaire", { p_lignes: lignes });
  if (error) {
    console.error("[faireInventaire]", error.code, error.message);
    return { erreur: message(error.code, error.message, "L'inventaire n'a pas été enregistré. Réessaie.") };
  }
  rafraichir();
  return { resultats: (data as ResultatInventaire[]) ?? [] };
}
