"use client";

import { useSyncExternalStore } from "react";

// Le dernier numéro utilisé est gardé sur le téléphone : à la connexion
// suivante, on tape seulement le code PIN (comme Wave).
const CLE = "fruya.telephone";
const abonnes = new Set<() => void>();

function lire(): string | null {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

export function memoriserTelephone(telephone: string | null) {
  try {
    if (telephone) localStorage.setItem(CLE, telephone);
    else localStorage.removeItem(CLE);
  } catch {
    // Stockage indisponible (navigation privée) : on redemandera le numéro.
  }
  abonnes.forEach((f) => f());
}

export function useTelephoneMemorise(): string | null {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    lire,
    () => null,
  );
}
