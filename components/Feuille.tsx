"use client";

import { useEffect, useRef } from "react";

// Panneau qui monte du bas de l'écran (formulaires), comme dans une app mobile.
export function Feuille({
  ouvert,
  onFermer,
  titre,
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (ouvert && !dialog.open) dialog.showModal();
    if (!ouvert && dialog.open) dialog.close();
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      onClose={onFermer}
      onClick={(e) => {
        // Toucher le fond sombre ferme le panneau.
        if (e.target === e.currentTarget) onFermer();
      }}
      className="feuille mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-[480px] rounded-t-3xl bg-fond p-0 text-encre backdrop:bg-encre/50"
    >
      <div className="px-5 pt-3 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-trait" aria-hidden="true" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-gris"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
