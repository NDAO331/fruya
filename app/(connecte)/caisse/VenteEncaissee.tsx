"use client";

import { FactureVente } from "@/components/FactureVente";
import { classeBoutonPrincipal } from "@/components/formulaire";
import type { LigneRecu } from "@/components/RecuWhatsApp";
import { fcfa } from "@/lib/format";
import type { Unite } from "@/lib/types";

function quantite(q: number, unite: Unite): string {
  const t = String(q).replace(".", ",");
  return unite === "kg" ? `${t} kg` : `${t} ${q > 1 ? "pièces" : "pièce"}`;
}

// Écran « Encaissé ! », commun à la saisie manuelle, au panier et à la dictée.
export function VenteEncaissee({
  venteId,
  date,
  lignes,
  total,
  etalNom,
  vendeurNom,
  onSuivante,
}: {
  venteId: string;
  date: Date;
  lignes: LigneRecu[];
  total: number;
  etalNom: string;
  vendeurNom: string;
  onSuivante: () => void;
}) {
  return (
    <div className="flex flex-col items-center pb-2 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-vert">
        <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-4 text-2xl font-bold">Encaissé !</p>
      <p className="montant text-4xl">{fcfa(total)}</p>
      <ul className="mt-1 text-base font-semibold text-encre-doux">
        {lignes.map((l, i) => (
          <li key={i}>
            {l.nom} · {quantite(l.quantite, l.unite)} à {fcfa(l.prix_unitaire)}
          </li>
        ))}
      </ul>
      {typeof navigator !== "undefined" && !navigator.onLine && (
        <p className="mt-3 rounded-full bg-orange-pale px-3 py-1 text-sm font-bold text-orange-fonce">
          Pas de réseau : envoyée plus tard
        </p>
      )}
      <div className="mt-6 flex w-full flex-col gap-2">
        <FactureVente venteId={venteId} date={date} etal={etalNom} vendeur={vendeurNom} lignes={lignes} total={total} />
        <button type="button" onClick={onSuivante} className={classeBoutonPrincipal}>
          Vente suivante
        </button>
      </div>
    </div>
  );
}
