"use server";

import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/types";

// Annulation par le gérant (jamais de suppression). Les règles — étal,
// délai, raison obligatoire — sont vérifiées par les fonctions SQL
// annuler_vente / annuler_perte.
export async function annuler(
  cible: { type: "vente" | "perte"; id: string },
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const raison = String(formData.get("raison") ?? "").trim();
  if (!raison) return { erreur: "Écris la raison de l'annulation." };

  const supabase = await createClient();
  const { error } = await supabase.rpc(cible.type === "vente" ? "annuler_vente" : "annuler_perte", {
    p_id: cible.id,
    p_raison: raison,
  });
  if (error) {
    console.error("[annuler]", cible.type, error.code, error.message);
    return { erreur: error.code === "P0001" ? error.message : "L'annulation n'a pas marché. Réessaie." };
  }

  revalidatePath("/gerant/ventes");
  revalidatePath("/caisse");
  return { succes: cible.type === "vente" ? "Vente annulée." : "Perte annulée." };
}
