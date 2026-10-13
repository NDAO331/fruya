"use client";

// Pavé numérique de la caisse. La virgule n'apparaît que si elle est permise
// (quantité au kilo).
export function PaveNumerique({
  virgule,
  onTouche,
}: {
  virgule: boolean;
  onTouche: (touche: string) => void;
}) {
  const touches = ["1", "2", "3", "4", "5", "6", "7", "8", "9", virgule ? "," : "", "0", "effacer"];

  return (
    <div className="grid grid-cols-3">
      {touches.map((touche, i) =>
        touche === "" ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onTouche(touche)}
            aria-label={touche === "effacer" ? "Effacer" : touche === "," ? "Virgule" : touche}
            className="flex h-14 items-center justify-center rounded-full text-3xl font-semibold active:bg-gris"
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
  );
}

/** Applique une touche à une saisie (« 2,5 » + « 0 » -> « 2,50 »). */
export function saisir(valeur: string, touche: string, options: { virgule: boolean; max: number }): string {
  if (touche === "effacer") return valeur.slice(0, -1);
  if (touche === ",") {
    if (!options.virgule || valeur.includes(",")) return valeur;
    return valeur === "" ? "0," : `${valeur},`;
  }
  const [, decimales] = valeur.split(",");
  if (decimales !== undefined && decimales.length >= 3) return valeur;
  if (valeur === "0") return touche;
  const suivant = valeur + touche;
  return suivant.replace(",", "").length > options.max ? valeur : suivant;
}

/** « 2,5 » -> 2.5 ; vide -> 0 */
export function lireNombre(valeur: string): number {
  const n = Number(valeur.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
