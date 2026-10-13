"use client";

import { baseLocale, nouvelId, type PerteLocale } from "./base";

const COTE_MAX = 1280;

/**
 * Réduit la photo avant de la garder sur le téléphone : 1280 px maximum,
 * JPEG (≈ 150 Ko au lieu de plusieurs Mo), pour l'envoyer vite sur un
 * réseau mobile faible.
 */
export async function compresserPhoto(fichier: File): Promise<Blob> {
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.72));
    return blob ?? fichier;
  } catch {
    // Format non lisible par le navigateur : on garde l'original.
    return fichier;
  }
}

/** Enregistre une perte sur le téléphone, la photo suivra au réseau. */
export async function enregistrerPerteLocale(
  perte: Omit<PerteLocale, "id" | "date" | "etat" | "photo_envoyee">,
): Promise<PerteLocale> {
  const locale: PerteLocale = {
    ...perte,
    id: nouvelId(),
    date: new Date().toISOString(),
    etat: "en_attente",
    photo_envoyee: false,
  };
  await baseLocale().pertes.add(locale);
  window.dispatchEvent(new Event("fruya:vente"));
  return locale;
}
