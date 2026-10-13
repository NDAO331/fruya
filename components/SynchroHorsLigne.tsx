"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { synchroniser } from "@/lib/hors-ligne/synchro";

// Tourne en fond sur les écrans connectés : envoie les ventes en attente au
// démarrage, au retour du réseau, au retour dans l'app et toutes les 20 s.
// Après un envoi, l'écran est rafraîchi pour afficher les totaux du serveur.
export function SynchroHorsLigne({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    let actif = true;

    async function lancer() {
      const envoyees = await synchroniser(userId).catch(() => 0);
      if (actif && envoyees > 0) router.refresh();
    }

    function auRetour() {
      if (document.visibilityState === "visible") void lancer();
    }

    void lancer();
    window.addEventListener("online", lancer);
    window.addEventListener("fruya:vente", lancer);
    document.addEventListener("visibilitychange", auRetour);
    const minuteur = window.setInterval(lancer, 20_000);

    return () => {
      actif = false;
      window.removeEventListener("online", lancer);
      window.removeEventListener("fruya:vente", lancer);
      document.removeEventListener("visibilitychange", auRetour);
      window.clearInterval(minuteur);
    };
  }, [userId, router]);

  return null;
}
