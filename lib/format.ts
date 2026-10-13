const formatFcfa = new Intl.NumberFormat("fr-FR");

/** 1500 -> « 1 500 F » */
export function fcfa(montant: number): string {
  return `${formatFcfa.format(montant)} F`;
}

/** 1500 -> « 1 500 » (sans unité, pour les gros montants affichés à part) */
export function chiffres(montant: number): string {
  return formatFcfa.format(montant);
}

/** « mangue kent » -> « Mangue kent » : seule la première lettre change. */
export function majuscule(texte: string): string {
  const propre = texte.trim().replace(/\s+/g, " ");
  return propre.charAt(0).toLocaleUpperCase("fr-FR") + propre.slice(1);
}

const formatJour =new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Africa/Dakar",
});

/** « mardi 12 oct. » */
export function jourAffiche(date: Date = new Date()): string {
  return formatJour.format(date);
}

/** Moment situé n jours avant maintenant, au format ISO. */
export function ilYaJours(n: number, maintenant: Date = new Date()): string {
  return new Date(maintenant.getTime() - n * 86_400_000).toISOString();
}

/** Début du jour à Dakar (UTC+0 toute l'année), au format ISO. */
export function debutJourDakar(date: Date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
}
