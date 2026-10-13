// Ligne de la vue admin_stalls : chiffres d'activité seulement, jamais le
// détail des ventes, pertes ou dettes (PRD 3.3).
export type Abonne = {
  id: string;
  nom: string;
  gerant_nom: string;
  gerant_telephone: string;
  statut: "essai" | "actif" | "expire" | "bloque";
  date_inscription: string;
  date_fin_acces: string;
  bloque: boolean;
  raison_blocage: string | null;
  nb_vendeurs: number;
  date_dernier_paiement: string | null;
  date_derniere_vente: string | null;
};

export const LIBELLE_STATUT: Record<Abonne["statut"], { texte: string; classe: string }> = {
  essai: { texte: "Essai", classe: "bg-orange-pale text-orange-fonce" },
  actif: { texte: "Actif", classe: "bg-vert-pale text-vert" },
  expire: { texte: "Expiré", classe: "bg-alerte-pale text-alerte" },
  bloque: { texte: "Bloqué", classe: "bg-encre text-white" },
};

/** Nombre de jours avant la fin d'accès (négatif si dépassée). */
export function joursRestants(dateFin: string, aujourdhui: string): number {
  return Math.round((Date.parse(`${dateFin}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86_400_000);
}
