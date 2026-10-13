"use client";

import { LIBELLE_PAIEMENT, type Paiement } from "@/lib/types";

const MOYENS: Paiement[] = ["especes", "wave", "orange_money"];

// Comment le client paie : espèces par défaut (aucun toucher de plus dans
// le cas courant), Wave ou Orange Money d'un toucher.
export function ChoixPaiement({ valeur, onChange }: { valeur: Paiement; onChange: (p: Paiement) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-gris p-1" role="radiogroup" aria-label="Payé par">
      {MOYENS.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={valeur === m}
          onClick={() => onChange(m)}
          className={`h-11 rounded-lg text-base font-bold leading-tight ${
            valeur === m ? "bg-fond text-encre shadow-[0_0_0_2px_var(--color-vert)]" : "text-encre-doux"
          }`}
        >
          {LIBELLE_PAIEMENT[m]}
        </button>
      ))}
    </div>
  );
}
