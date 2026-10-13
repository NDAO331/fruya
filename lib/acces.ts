// Accès à l'app selon l'abonnement de l'étal (PRD 4.8). Calcul pur, utilisé
// par le serveur et par le téléphone (y compris hors-ligne : la dernière
// date de fin connue suffit pour couper l'accès sans réseau).

export const DELAI_GRACE_JOURS = 3;
export const RAPPEL_JOURS = 3;

export type EtatAcces =
  | { statut: "ok" }
  | { statut: "bientot"; fin: string } // rappel : 3 jours avant la fin
  | { statut: "grace"; limite: string } // expiré, encore utilisable
  | { statut: "coupe"; motif: "expire" | "bloque" };

function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Jour d'aujourd'hui à Dakar (UTC+0 toute l'année), « AAAA-MM-JJ ». */
export function aujourdhuiDakar(maintenant: Date = new Date()): string {
  return maintenant.toISOString().slice(0, 10);
}

export function etatAcces(etal: { date_fin_acces: string; bloque: boolean }, maintenant: Date = new Date()): EtatAcces {
  if (etal.bloque) return { statut: "coupe", motif: "bloque" };
  const jour = aujourdhuiDakar(maintenant);
  const limite = ajouterJours(etal.date_fin_acces, DELAI_GRACE_JOURS);
  if (jour > limite) return { statut: "coupe", motif: "expire" };
  if (jour > etal.date_fin_acces) return { statut: "grace", limite };
  if (jour >= ajouterJours(etal.date_fin_acces, -RAPPEL_JOURS)) return { statut: "bientot", fin: etal.date_fin_acces };
  return { statut: "ok" };
}

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** « 2026-10-15 » -> « 15 octobre » */
export function dateLisible(jour: string): string {
  return formatDate.format(new Date(`${jour}T12:00:00Z`));
}
