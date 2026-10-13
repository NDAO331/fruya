"use client";

import { useSyncExternalStore } from "react";

// Reconnaissance vocale — interface unique de l'app.
// Pilote : reconnaissance gratuite du navigateur (Web Speech API, fr-FR).
// Pour passer à Whisper plus tard (PRD 4.2), il suffit de réécrire
// transcrire() et voixPossible() ici : le reste de l'app ne change pas.

export class ErreurVoix extends Error {}

// Types minimaux de la Web Speech API (absents de la bibliothèque TypeScript).
type ResultatReconnaissance = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Reconnaissance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: ResultatReconnaissance) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type ConstructeurReconnaissance = new () => Reconnaissance;

function constructeur(): ConstructeurReconnaissance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructeurReconnaissance;
    webkitSpeechRecognition?: ConstructeurReconnaissance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * La dictée est-elle possible maintenant ? Il faut un navigateur qui la gère,
 * une adresse sécurisée (https, exigée pour le micro) et du réseau (la
 * reconnaissance du navigateur passe par Internet).
 */
export function voixPossible(): boolean {
  return constructeur() !== null && window.isSecureContext && navigator.onLine;
}

/** Même chose, mise à jour quand le réseau va et vient (pour afficher ou cacher le micro). */
export function useVoixPossible(): boolean {
  return useSyncExternalStore(
    (changement) => {
      window.addEventListener("online", changement);
      window.addEventListener("offline", changement);
      return () => {
        window.removeEventListener("online", changement);
        window.removeEventListener("offline", changement);
      };
    },
    voixPossible,
    () => false,
  );
}

export type Ecoute = {
  /** Le texte entendu (plusieurs propositions, la plus probable d'abord). */
  resultat: Promise<string[]>;
  /** Arrête d'écouter et garde ce qui a été dit. */
  arreter: () => void;
  /** Abandonne sans résultat. */
  annuler: () => void;
};

const MESSAGES: Record<string, string> = {
  "no-speech": "Je n'ai rien entendu. Réessaie en parlant près du téléphone.",
  "audio-capture": "Le micro ne marche pas sur ce téléphone.",
  "not-allowed": "Le micro est bloqué. Autorise-le dans les réglages du navigateur.",
  "service-not-allowed": "Le micro est bloqué. Autorise-le dans les réglages du navigateur.",
  network: "Pas de réseau pour la dictée. Saisis la vente à la main.",
};

/** Écoute une phrase en français et renvoie le texte reconnu. */
export function transcrire(): Ecoute {
  const Reco = constructeur();
  if (!Reco) {
    const erreur = Promise.reject(new ErreurVoix("La dictée n'est pas disponible sur ce téléphone."));
    return { resultat: erreur, arreter: () => {}, annuler: () => {} };
  }

  const reco = new Reco();
  reco.lang = "fr-FR";
  reco.interimResults = false;
  reco.continuous = false;
  reco.maxAlternatives = 3;

  let annule = false;
  const resultat = new Promise<string[]>((ok, ko) => {
    let textes: string[] = [];
    reco.onresult = (e) => {
      const premier = e.results[0];
      textes = Array.from({ length: premier?.length ?? 0 }, (_, i) => premier[i].transcript.trim()).filter(Boolean);
    };
    reco.onerror = (e) => {
      if (e.error === "aborted") return;
      ko(new ErreurVoix(MESSAGES[e.error] ?? "La dictée n'a pas marché. Réessaie ou saisis à la main."));
    };
    reco.onend = () => {
      if (annule) return;
      if (textes.length > 0) ok(textes);
      else ko(new ErreurVoix(MESSAGES["no-speech"]));
    };
  });

  reco.start();
  return {
    resultat,
    arreter: () => reco.stop(),
    annuler: () => {
      annule = true;
      reco.abort();
    },
  };
}
