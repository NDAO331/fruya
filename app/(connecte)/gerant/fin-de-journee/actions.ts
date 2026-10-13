"use server";

import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/types";

// Le téléphone n'envoie que l'argent compté : la caisse théorique et
// l'écart sont calculés par le serveur (fonction cloturer_journee).
export async function cloturer(jour: string, _etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerRole(["gerant"]);
  const texte = String(formData.get("caisse_declaree") ?? "").replace(/\s/g, "");
  if (!/^\d+$/.test(texte)) return { erreur: "Écris l'argent compté, en francs." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cloturer_journee", { p_jour: jour, p_caisse_declaree: Number(texte) });
  if (error) {
    console.error("[cloturer]", error.code, error.message);
    return { erreur: error.code === "P0001" ? error.message : "La fin de journée n'a pas été enregistrée. Réessaie." };
  }

  revalidatePath("/gerant/fin-de-journee");
  return { succes: "Fin de journée enregistrée." };
}
