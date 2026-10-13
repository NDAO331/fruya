import { loadFont as chargerBarlow } from "@remotion/google-fonts/Barlow";
import { loadFont as chargerBarlowCondensed } from "@remotion/google-fonts/BarlowSemiCondensed";

// Identité Fruya (CLAUDE.md, section Design) : orange mangue et vert feuille
// sur fond blanc, aplats uniquement, texte quasi-noir, rouge pour les pertes.
export const C = {
  fond: "#FFFFFF",
  creme: "#FFF1E6",
  encre: "#15171A",
  encreDoux: "#5F656B",
  gris: "#F4F5F6",
  trait: "#ECEEF0",
  orange: "#FF7A1A",
  orangeClair: "#FFC59A",
  orangeFonce: "#A84A00",
  vert: "#1E6B3A",
  vertFonce: "#16512C",
  vertPale: "#E7F2EB",
  alerte: "#B42318",
  alertePale: "#FDECEA",
};

const { fontFamily: barlow } = chargerBarlow("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] });
const { fontFamily: barlowCondensed } = chargerBarlowCondensed("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });

export const POLICE = { texte: barlow, montant: barlowCondensed };

export const FPS = 30;
export const LARGEUR = 1080;
export const HAUTEUR = 1920;
