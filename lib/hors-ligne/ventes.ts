"use client";

import { baseLocale, nouvelId, type LigneVente, type VenteLocale } from "./base";

/** Montant d'une ligne, arrondi au franc (même règle que le serveur). */
export function montantLigne(ligne: Pick<LigneVente, "quantite" | "prix_unitaire">): number {
  return Math.round(ligne.quantite * ligne.prix_unitaire);
}

/**
 * Enregistre une vente sur le téléphone (immédiat, même sans réseau), puis
 * prévient la synchronisation qui l'enverra au serveur dès que possible.
 */
export async function enregistrerVenteLocale(vente: {
  stall_id: string;
  user_id: string;
  methode: VenteLocale["methode"];
  lignes: LigneVente[];
  resume: string;
}): Promise<VenteLocale> {
  const locale: VenteLocale = {
    ...vente,
    id: nouvelId(),
    date: new Date().toISOString(),
    montant_total: vente.lignes.reduce((s, l) => s + montantLigne(l), 0),
    etat: "en_attente",
  };
  await baseLocale().ventes.add(locale);
  window.dispatchEvent(new Event("fruya:vente"));
  return locale;
}
