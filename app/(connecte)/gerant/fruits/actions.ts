"use server";

import { revalidatePath } from "next/cache";
import { majuscule } from "@/lib/format";
import { estForme, type Forme } from "@/lib/formes";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire, Unite } from "@/lib/types";

type DonneesFruit = {
  nom: string;
  forme: Forme;
  unite_defaut: Unite;
  prix_kg: number | null;
  prix_piece: number | null;
};

/** « 1 500 » -> 1500 ; vide -> null ; invalide -> NaN */
function lirePrix(valeur: FormDataEntryValue | null): number | null {
  const texte = String(valeur ?? "").replace(/\s/g, "");
  if (texte === "") return null;
  return /^\d+$/.test(texte) ? Number(texte) : NaN;
}

// Règles du PRD : au moins un prix, et obligatoirement celui de l'unité par défaut.
function lireFruit(formData: FormData): DonneesFruit | { erreur: string } {
  const nom = majuscule(String(formData.get("nom") ?? ""));
  const forme = String(formData.get("forme") ?? "autre");
  const unite = String(formData.get("unite_defaut") ?? "");
  const prixKg = lirePrix(formData.get("prix_kg"));
  const prixPiece = lirePrix(formData.get("prix_piece"));

  if (!nom) return { erreur: "Écris le nom du fruit." };
  if (!estForme(forme)) return { erreur: "Choisis un dessin pour ce fruit." };
  if (unite !== "kg" && unite !== "piece") return { erreur: "Choisis : au kilo ou à la pièce." };
  if (Number.isNaN(prixKg) || Number.isNaN(prixPiece)) {
    return { erreur: "Les prix s'écrivent en chiffres, en francs. Exemple : 1500." };
  }
  if (prixKg === null && prixPiece === null) {
    return { erreur: "Mets au moins un prix : au kilo ou à la pièce." };
  }
  if (unite === "kg" && prixKg === null) {
    return { erreur: "Tu vends au kilo : mets le prix au kilo." };
  }
  if (unite === "piece" && prixPiece === null) {
    return { erreur: "Tu vends à la pièce : mets le prix à la pièce." };
  }

  return { nom, forme, unite_defaut: unite, prix_kg: prixKg, prix_piece: prixPiece };
}

function messageErreur(code: string | undefined, message?: string): string {
  if (code === "23505") return "Ce fruit est déjà dans ton étal.";
  if (code === "P0001" && message) return message; // ex. unité verrouillée par le stock
  return "Pas enregistré. Réessaie.";
}

export async function ajouterFruit(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const profil = await exigerRole(["gerant"]);
  const fruit = lireFruit(formData);
  if ("erreur" in fruit) return fruit;

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .insert({ ...fruit, stall_id: profil.stall_id });

  if (error) return { erreur: messageErreur(error.code) };

  revalidatePath("/gerant/fruits");
  revalidatePath("/caisse");
  return { succes: `${fruit.nom} ajouté.` };
}

export async function modifierFruit(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const fruit = lireFruit(formData);
  if ("erreur" in fruit) return fruit;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(fruit)
    .eq("id", id)
    .select("id");

  if (error) return { erreur: messageErreur(error.code, error.message) };
  if (!data?.length) return { erreur: "Fruit introuvable." };

  revalidatePath("/gerant/fruits");
  revalidatePath("/caisse");
  return { succes: "C'est noté." };
}

// Un fruit n'est jamais supprimé : il est retiré de la caisse (et peut revenir).
export async function changerActif(id: string, actif: boolean): Promise<void> {
  await exigerRole(["gerant"]);
  const supabase = await createClient();
  await supabase.from("products").update({ actif }).eq("id", id);
  revalidatePath("/gerant/fruits");
  revalidatePath("/caisse");
}
