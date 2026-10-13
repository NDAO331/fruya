"use client";

import { useEffect } from "react";

// Installe le service worker (ouverture de l'app sans réseau).
// Seulement en production : en développement, il gênerait le rechargement
// automatique du code.
export function EnregistrementSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Navigateur sans service worker (ou http non local) : l'app marche
      // quand même avec réseau.
    });
  }, []);
  return null;
}
