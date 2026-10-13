"use client";

import { useRef, useState } from "react";
import { baseLocale } from "@/lib/hors-ligne/base";

// « Quitter l'app ». Les ventes pas encore envoyées restent sur le téléphone
// et partiront quand ce compte se reconnectera : on prévient avant de quitter.
// Les pages gardées pour l'ouverture hors-ligne sont effacées (elles
// contiennent les données de ce compte).
export function BoutonQuitter({ userId }: { userId: string }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [aConfirmer, setAConfirmer] = useState(0);

  async function quitter(confirme: boolean) {
    if (!confirme) {
      const enAttente = await baseLocale()
        .ventes.where("etat")
        .equals("en_attente")
        .filter((v) => v.user_id === userId)
        .count()
        .catch(() => 0);
      if (enAttente > 0) {
        setAConfirmer(enAttente);
        return;
      }
    }
    navigator.serviceWorker?.controller?.postMessage("fruya:oublier-pages");
    formulaire.current?.requestSubmit();
  }

  return (
    <form ref={formulaire} action="/deconnexion" method="post" className="px-4 pt-8 pb-6">
      {aConfirmer > 0 && (
        <p role="alert" className="mb-3 rounded-xl bg-orange-pale px-4 py-3 text-base font-semibold text-orange-fonce">
          {aConfirmer === 1 ? "1 vente n'est" : `${aConfirmer} ventes ne sont`} pas encore envoyée
          {aConfirmer > 1 ? "s" : ""}. Elles partiront quand tu te reconnecteras avec réseau. Quitter quand même ?
        </p>
      )}
      <button
        type="button"
        onClick={() => quitter(aConfirmer > 0)}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-alerte-pale text-lg font-bold text-alerte active:bg-alerte/15"
      >
        {aConfirmer > 0 ? "Oui, quitter" : "Quitter l'app"}
      </button>
      <p className="mt-2 text-center text-sm font-semibold text-encre-doux">Ba beneen yoon !</p>
    </form>
  );
}
