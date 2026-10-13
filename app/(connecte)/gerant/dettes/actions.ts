"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { majuscule } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { normaliserTelephone } from "@/lib/telephone";
import type { EtatFormulaire } from "@/lib/types";

// Ardoise (PRD 4.5) : chaque prise et chaque paiement est une transaction
// datée ; le montant dû est calculé (vue debt_balances). Jamais de
// suppression : une erreur se corrige par une transaction d'annulation.

export type DetailFruit = { nom: string; quantite: number; unite: "kg" | "piece"; prix_unitaire: number };

function lireMontant(valeur: FormDataEntryValue | null): number {
  const texte = String(valeur ?? "").replace(/\s/g, "");
  return /^\d+$/.test(texte) ? Number(texte) : NaN;
}

function lireLignes(valeur: FormDataEntryValue | null): DetailFruit[] | null {
  try {
    const lignes = JSON.parse(String(valeur || "[]")) as DetailFruit[];
    if (!Array.isArray(lignes)) return null;
    const valides = lignes.every(
      (l) =>
        typeof l.nom === "string" &&
        l.nom.length > 0 &&
        Number.isFinite(l.quantite) &&
        l.quantite > 0 &&
        (l.unite === "kg" || l.unite === "piece") &&
        Number.isInteger(l.prix_unitaire) &&
        l.prix_unitaire >= 0,
    );
    return valides ? lignes : null;
  } catch {
    return null;
  }
}

function rafraichir(debtId?: string) {
  revalidatePath("/gerant/dettes");
  if (debtId) revalidatePath(`/gerant/dettes/${debtId}`);
}

/** Prise à crédit, pour un client existant (debtId) ou nouveau (debtId = null). */
export async function ajouterPrise(
  debtId: string | null,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const profil = await exigerRole(["gerant"]);
  const supabase = await createClient();

  const lignes = lireLignes(formData.get("lignes"));
  if (!lignes) return { erreur: "Vérifie les fruits : quantité et prix." };
  const montant = lignes.length
    ? lignes.reduce((s, l) => s + Math.round(l.quantite * l.prix_unitaire), 0)
    : lireMontant(formData.get("montant"));
  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Mets le montant pris à crédit." };

  let idClient = debtId;
  if (!idClient) {
    const nom = majuscule(String(formData.get("client_nom") ?? ""));
    const saisieTel = String(formData.get("client_telephone") ?? "").trim();
    const telephone = saisieTel ? normaliserTelephone(saisieTel) : null;
    if (!nom) return { erreur: "Écris le nom du client." };
    if (saisieTel && !telephone) return { erreur: "Numéro invalide. Exemple : 77 123 45 67." };

    const { data, error } = await supabase
      .from("debts")
      .insert({ stall_id: profil.stall_id, client_nom: nom, client_telephone: telephone })
      .select("id")
      .single();
    if (error || !data) return { erreur: "Le client n'a pas été créé. Réessaie." };
    idClient = data.id as string;
  }

  const { error } = await supabase.from("debt_transactions").insert({
    debt_id: idClient,
    user_id: profil.id,
    type: "prise",
    montant,
    detail_fruits: lignes.length ? lignes : null,
  });
  if (error) {
    console.error("[ajouterPrise]", error.code, error.message);
    return { erreur: "La prise n'a pas été notée. Réessaie." };
  }

  rafraichir(idClient);
  if (!debtId) redirect(`/gerant/dettes/${idClient}`);
  return { succes: "Prise à crédit notée." };
}

/** Paiement total ou partiel d'un client. */
export async function encaisserPaiement(
  debtId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const profil = await exigerRole(["gerant"]);
  const montant = lireMontant(formData.get("montant"));
  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Mets le montant payé." };

  const supabase = await createClient();
  const { data: solde } = await supabase.from("debt_balances").select("montant_du").eq("debt_id", debtId).maybeSingle();
  if (!solde) return { erreur: "Client introuvable." };
  if (montant > solde.montant_du) {
    return { erreur: `Il ne doit que ${new Intl.NumberFormat("fr-FR").format(solde.montant_du)} F.` };
  }

  const { error } = await supabase
    .from("debt_transactions")
    .insert({ debt_id: debtId, user_id: profil.id, type: "paiement", montant });
  if (error) {
    console.error("[encaisserPaiement]", error.code, error.message);
    return { erreur: "Le paiement n'a pas été noté. Réessaie." };
  }

  rafraichir(debtId);
  return { succes: montant === solde.montant_du ? "Payé en entier. Jërëjëf !" : "Paiement noté." };
}

/** Annule une prise ou un paiement (transaction d'annulation, raison obligatoire). */
export async function annulerTransaction(
  cible: { debtId: string; transactionId: string; montant: number },
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const profil = await exigerRole(["gerant"]);
  const raison = String(formData.get("raison") ?? "").trim();
  if (!raison) return { erreur: "Écris la raison de l'annulation." };

  const supabase = await createClient();
  const { error } = await supabase.from("debt_transactions").insert({
    debt_id: cible.debtId,
    user_id: profil.id,
    type: "annulation",
    montant: cible.montant, // repris de la transaction annulée par le serveur
    transaction_annulee_id: cible.transactionId,
    raison,
  });
  if (error) {
    console.error("[annulerTransaction]", error.code, error.message);
    return { erreur: error.code === "23505" ? "Déjà annulée." : "L'annulation n'a pas marché. Réessaie." };
  }

  rafraichir(cible.debtId);
  return { succes: "Annulation notée." };
}
