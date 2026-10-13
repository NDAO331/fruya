"use client";

import { useState } from "react";
import { initiales } from "@/components/EnTete";
import { Feuille } from "@/components/Feuille";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { formaterTelephone } from "@/lib/telephone";
import type { Profil } from "@/lib/types";
import { FormulaireVendeur } from "./FormulaireVendeur";

export function ListeVendeurs({ vendeurs }: { vendeurs: Profil[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState<string>();

  return (
    <main className="flex flex-1 flex-col">
      {message && (
        <p role="status" className="mx-4 mb-2 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      {vendeurs.length === 0 ? (
        <p className="px-4 text-lg font-semibold text-encre-doux">
          Pas encore de vendeur. Chacun a son propre compte : ne donne jamais le tien.
        </p>
      ) : (
        <ul>
          {vendeurs.map((vendeur) => (
            <li key={vendeur.id} className="flex h-[68px] items-center gap-3 border-b border-trait px-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gris text-sm font-bold">
                {initiales(vendeur.nom)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{vendeur.nom}</span>
                <span className="block text-sm font-semibold text-encre-doux">{formaterTelephone(vendeur.telephone)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-16 mt-auto bg-fond px-4 pt-3 pb-4">
        <button type="button" onClick={() => setOuvert(true)} className={classeBoutonPrincipal}>
          Ajouter un vendeur
        </button>
      </div>

      <Feuille ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Nouveau vendeur">
        {ouvert && (
          <FormulaireVendeur
            onSucces={(texte) => {
              setOuvert(false);
              setMessage(texte);
            }}
          />
        )}
      </Feuille>
    </main>
  );
}
