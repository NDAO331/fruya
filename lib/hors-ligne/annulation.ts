"use client";

import { createClient } from "@/lib/supabase/client";
import { baseLocale } from "./base";
import { synchroniser } from "./synchro";

// Annulation par le vendeur de sa propre vente ou perte, dans les 5 minutes
// (PRD 3.2). Jamais de suppression : la vente part d'abord au serveur si
// elle n'y est pas encore, puis elle y est annulée avec sa raison
// (fonctions annuler_vente / annuler_perte, qui vérifient le délai).

export const DELAI_ANNULATION_MS = 5 * 60 * 1000;

export class ErreurAnnulation extends Error {}

export async function annulerOperation(
  type: "vente" | "perte",
  id: string,
  raison: string,
  userId: string,
): Promise<void> {
  if (!raison.trim()) throw new ErreurAnnulation("Écris la raison de l'annulation.");
  if (!navigator.onLine) throw new ErreurAnnulation("Il faut du réseau pour annuler. Réessaie quand le réseau revient.");

  const base = baseLocale();
  const table = type === "vente" ? base.ventes : base.pertes;

  // Pas encore envoyée : on l'envoie d'abord (sinon le serveur ne la connaît pas).
  if ((await table.get(id))?.etat === "en_attente") await synchroniser(userId);
  const locale = await table.get(id);
  if (locale?.etat !== "envoyee") {
    throw new ErreurAnnulation("Pas encore envoyée au serveur. Réessaie dans un instant.");
  }

  const { error } = await createClient().rpc(type === "vente" ? "annuler_vente" : "annuler_perte", {
    p_id: id,
    p_raison: raison.trim(),
  });
  if (error) {
    throw new ErreurAnnulation(
      error.code === "P0001" ? error.message : "L'annulation n'a pas marché. Réessaie ou demande au gérant.",
    );
  }

  await table.update(id, { annulee: true });
}
