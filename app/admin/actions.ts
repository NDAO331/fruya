"use server";

import { revalidatePath } from "next/cache";
import { aujourdhuiDakar } from "@/lib/acces";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/types";

// Actions de l'administrateur (PRD 3.3). Les règles RLS limitent déjà
// l'écriture de stalls et payments au rôle admin.

function rafraichir(stallId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/etals/${stallId}`);
}

function entier(valeur: FormDataEntryValue | null): number {
  const texte = String(valeur ?? "").replace(/\s/g, "");
  return /^\d+$/.test(texte) ? Number(texte) : NaN;
}

/** Paiement reçu : la date de fin d'accès est prolongée par le serveur (trigger). */
export async function enregistrerPaiement(stallId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const admin = await exigerRole(["admin"]);
  const montant = entier(formData.get("montant"));
  const mois = entier(formData.get("mois_payes"));
  const moyen = String(formData.get("moyen") ?? "");
  const date = String(formData.get("date_paiement") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Montant invalide." };
  if (!Number.isFinite(mois) || mois < 1 || mois > 24) return { erreur: "Nombre de mois invalide." };
  if (!["wave", "orange_money", "especes"].includes(moyen)) return { erreur: "Choisis le moyen de paiement." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > aujourdhuiDakar()) return { erreur: "Date invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    stall_id: stallId,
    montant,
    mois_payes: mois,
    moyen,
    date_paiement: date,
    note: note || null,
    enregistre_par: admin.id,
  });
  if (error) {
    console.error("[enregistrerPaiement]", error.code, error.message);
    return { erreur: "Le paiement n'a pas été enregistré. Réessaie." };
  }
  rafraichir(stallId);
  return { succes: `Paiement enregistré : accès prolongé de ${mois} mois.` };
}

/** Blocage manuel (fraude, demande du client…), raison obligatoire. */
export async function bloquer(stallId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["admin"]);
  const raison = String(formData.get("raison") ?? "").trim();
  if (!raison) return { erreur: "La raison du blocage est obligatoire." };

  const supabase = await createClient();
  const { error } = await supabase.from("stalls").update({ bloque: true, raison_blocage: raison }).eq("id", stallId);
  if (error) return { erreur: "Le blocage n'a pas marché. Réessaie." };
  rafraichir(stallId);
  return { succes: "Étal bloqué." };
}

export async function debloquer(stallId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["admin"]);
  const raison = String(formData.get("raison") ?? "").trim();
  if (!raison) return { erreur: "Indique pourquoi tu débloques cet étal." };

  const supabase = await createClient();
  const { error } = await supabase.from("stalls").update({ bloque: false, raison_blocage: null }).eq("id", stallId);
  if (error) return { erreur: "Le déblocage n'a pas marché. Réessaie." };
  console.info("[debloquer]", stallId, raison);
  rafraichir(stallId);
  return { succes: "Étal débloqué." };
}

/** Prolongation gratuite de l'essai (pilote), à partir d'aujourd'hui si déjà expiré. */
export async function prolongerEssai(stallId: string, _e: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["admin"]);
  const jours = entier(formData.get("jours"));
  if (!Number.isFinite(jours) || jours < 1 || jours > 60) return { erreur: "Nombre de jours invalide (1 à 60)." };

  const supabase = await createClient();
  const { data: etal } = await supabase.from("stalls").select("date_fin_acces").eq("id", stallId).maybeSingle();
  if (!etal) return { erreur: "Étal introuvable." };

  const depart = etal.date_fin_acces > aujourdhuiDakar() ? etal.date_fin_acces : aujourdhuiDakar();
  const fin = new Date(`${depart}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + jours);

  const { error } = await supabase
    .from("stalls")
    .update({ date_fin_acces: fin.toISOString().slice(0, 10) })
    .eq("id", stallId);
  if (error) return { erreur: "La prolongation n'a pas marché. Réessaie." };
  rafraichir(stallId);
  return { succes: `Accès prolongé de ${jours} jours.` };
}
