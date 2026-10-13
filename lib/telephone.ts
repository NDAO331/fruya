// Connexion par téléphone + PIN : Supabase Auth est utilisé en mode
// email/mot de passe avec un email technique dérivé du numéro. Aucun email
// n'est jamais envoyé (confirmation désactivée).
const DOMAINE_EMAIL_TECHNIQUE = "tel.gerantpme.local";

/**
 * Normalise un numéro sénégalais au format 221XXXXXXXXX.
 * Accepte « 77 123 45 67 », « +221 77 123 45 67 », « 00221771234567 ».
 * Renvoie null si le numéro n'est pas un mobile sénégalais valide.
 */
export function normaliserTelephone(saisie: string): string | null {
  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (chiffres.length === 9) chiffres = `221${chiffres}`;
  return /^2217\d{8}$/.test(chiffres) ? chiffres : null;
}

export function emailDepuisTelephone(telephone: string): string {
  return `${telephone}@${DOMAINE_EMAIL_TECHNIQUE}`;
}

/** 221771234567 -> « 77 123 45 67 » */
export function formaterTelephone(telephone: string): string {
  const local = telephone.startsWith("221") ? telephone.slice(3) : telephone;
  return local.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
}

export function pinValide(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
