"use client";

import { useState } from "react";
import { FormeFruit } from "@/components/FormeFruit";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import { encaisserLignes, quantiteAffichee, totalPanier, type LignePanier } from "./panier";
import { VenteEncaissee } from "./VenteEncaissee";

// Le panier : les fruits du client, retirables, puis un seul « Encaisser ».
export function PanierFeuille({
  lignes,
  methode,
  stallId,
  userId,
  etalNom,
  vendeurNom,
  onRetirer,
  onAutreFruit,
  onEncaisse,
  onTermine,
}: {
  lignes: LignePanier[];
  methode: "manuelle" | "vocale";
  stallId: string;
  userId: string;
  etalNom: string;
  vendeurNom: string;
  onRetirer: (cle: string) => void;
  onAutreFruit: () => void;
  onEncaisse: () => void; // vide le panier
  onTermine: () => void; // ferme le panneau
}) {
  const [encaisse, setEncaisse] = useState<{ id: string; date: Date; lignes: LignePanier[] } | null>(null);
  const total = totalPanier(lignes);

  if (encaisse) {
    return (
      <VenteEncaissee
        venteId={encaisse.id}
        date={encaisse.date}
        lignes={encaisse.lignes}
        total={totalPanier(encaisse.lignes)}
        etalNom={etalNom}
        vendeurNom={vendeurNom}
        onSuivante={onTermine}
      />
    );
  }

  async function encaisser() {
    if (lignes.length === 0) return;
    const vente = await encaisserLignes(lignes, methode, stallId, userId);
    setEncaisse({ ...vente, lignes });
    onEncaisse();
  }

  return (
    <div className="flex flex-col gap-3">
      {lignes.length === 0 ? (
        <p className="text-base font-semibold text-encre-doux">Le panier est vide.</p>
      ) : (
        <ul>
          {lignes.map((l) => (
            <li key={l.cle} className="flex min-h-14 items-center gap-3 border-b border-trait py-2">
              <FormeFruit forme={l.forme} taille={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{l.nom}</span>
                <span className="block text-sm font-semibold text-encre-doux">
                  {quantiteAffichee(l.quantite, l.unite)} à {fcfa(l.prix_unitaire)}
                </span>
              </span>
              <span className="montant text-lg">{fcfa(l.montant)}</span>
              <button
                type="button"
                onClick={() => onRetirer(l.cle)}
                aria-label={`Retirer ${l.nom} du panier`}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gris active:bg-trait"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAutreFruit}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-orange-pale text-base font-bold text-orange-fonce active:bg-orange/20"
      >
        + Ajouter un fruit
      </button>
      {lignes.length > 0 && (
        <button
          type="button"
          onClick={encaisser}
          className={`${classeBoutonPrincipal.replace("justify-center", "justify-between")} px-5`}
        >
          <span>Encaisser</span>
          <span className="montant text-2xl">{fcfa(total)}</span>
        </button>
      )}
    </div>
  );
}
