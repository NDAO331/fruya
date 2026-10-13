"use client";

import { useEffect, useState } from "react";

const LONGUEUR = 6;
const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "effacer"];

// Pavé numérique façon app mobile : 6 points, validation automatique au
// 6e chiffre. Le clavier physique marche aussi (utile sur ordinateur).
export function ClavierPin({
  titre,
  onComplet,
  enCours = false,
  erreur,
}: {
  titre: string;
  onComplet: (pin: string) => void;
  enCours?: boolean;
  erreur?: string;
}) {
  const [pin, setPin] = useState("");

  function taper(touche: string) {
    if (enCours) return;
    if (touche === "effacer") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const suivant = (pin + touche).slice(0, LONGUEUR);
    setPin(suivant);
    if (suivant.length === LONGUEUR) {
      setPin("");
      onComplet(suivant);
    }
  }

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) taper(e.key);
      else if (e.key === "Backspace") taper("effacer");
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center px-6 pt-6">
        <p className="text-base font-semibold text-encre-doux">{enCours ? "Vérification…" : titre}</p>
        <div className="mt-4 flex gap-4" aria-label={`${pin.length} chiffres sur ${LONGUEUR}`}>
          {Array.from({ length: LONGUEUR }, (_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full ${
                i < pin.length ? "bg-vert" : enCours ? "bg-orange" : "border-2 border-encre-doux/40"
              }`}
            />
          ))}
        </div>
        <p role="alert" className="mt-4 min-h-6 text-center text-base font-semibold text-alerte">
          {erreur}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-3 px-6 pb-6">
        {TOUCHES.map((touche, i) =>
          touche === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => taper(touche)}
              aria-label={touche === "effacer" ? "Effacer" : touche}
              className="flex h-16 items-center justify-center rounded-full text-3xl font-semibold active:bg-gris"
            >
              {touche === "effacer" ? (
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5-6 5-6zM12 10l4 4m0-4l-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                touche
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
