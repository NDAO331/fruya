"use client";

import { useActionState, useState } from "react";
import { BoutonEnvoyer, Champ, ChampTelephone, classeChamp, MessageFormulaire } from "@/components/formulaire";
import { FormeFruit } from "@/components/FormeFruit";
import { fcfa } from "@/lib/format";
import type { EtatFormulaire, Fruit, Unite } from "@/lib/types";
import { ajouterPrise, type DetailFruit } from "./actions";

type Ligne = { cle: number; fruit: Fruit; unite: Unite; quantite: string; prix: string };

function nombre(texte: string): number {
  const n = Number(texte.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Prise à crédit : client (si nouveau), fruits et quantités, montant.
// Avec des fruits, le montant est calculé ; sans fruit, on le tape.
export function FormulairePrise({
  debtId,
  fruits,
  onSucces,
}: {
  debtId: string | null;
  fruits: Fruit[];
  onSucces?: (message: string) => void;
}) {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await ajouterPrise(debtId, prec, formData);
    if (resultat?.succes) onSucces?.(resultat.succes);
    return resultat;
  }, null);

  function ajouterLigne(fruit: Fruit) {
    const unite = fruit.unite_defaut;
    const prix = (unite === "kg" ? fruit.dernier_prix_kg ?? fruit.prix_kg : fruit.dernier_prix_piece ?? fruit.prix_piece) ?? "";
    setLignes((l) => [...l, { cle: Date.now(), fruit, unite, quantite: "", prix: String(prix) }]);
  }

  function modifier(cle: number, champ: "quantite" | "prix", valeur: string) {
    setLignes((l) => l.map((x) => (x.cle === cle ? { ...x, [champ]: valeur } : x)));
  }

  const detail: DetailFruit[] = lignes.map((l) => ({
    nom: l.fruit.nom,
    quantite: nombre(l.quantite),
    unite: l.unite,
    prix_unitaire: Math.round(nombre(l.prix)),
  }));
  const total = detail.reduce((s, l) => s + Math.round(l.quantite * l.prix_unitaire), 0);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      {debtId === null && (
        <>
          <Champ label="Nom du client" name="client_nom" required autoComplete="off" />
          <ChampTelephone label="Son numéro (facultatif)" required={false} />
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-encre-doux">Fruits pris (facultatif)</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {fruits.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => ajouterLigne(f)}
              className="flex h-11 flex-none items-center gap-2 rounded-full bg-gris pr-4 pl-1 text-sm font-bold active:bg-trait"
            >
              <FormeFruit forme={f.forme} taille={36} />+ {f.nom}
            </button>
          ))}
        </div>
      </div>

      {lignes.map((l) => (
        <div key={l.cle} className="flex items-end gap-2">
          <div className="flex-1">
            <p className="mb-1 text-sm font-bold">{l.fruit.nom}</p>
            <div className="flex gap-2">
              <input
                aria-label={`Quantité de ${l.fruit.nom} (${l.unite === "kg" ? "kg" : "pièces"})`}
                inputMode="decimal"
                value={l.quantite}
                onChange={(e) => modifier(l.cle, "quantite", e.target.value)}
                placeholder={l.unite === "kg" ? "kg" : "pièces"}
                className={`${classeChamp} h-12`}
              />
              <input
                aria-label={`Prix de ${l.fruit.nom}`}
                inputMode="numeric"
                value={l.prix}
                onChange={(e) => modifier(l.cle, "prix", e.target.value)}
                placeholder="Prix"
                className={`${classeChamp} h-12`}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLignes((x) => x.filter((y) => y.cle !== l.cle))}
            aria-label={`Retirer ${l.fruit.nom}`}
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gris active:bg-trait"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}

      <input type="hidden" name="lignes" value={JSON.stringify(detail)} />

      {lignes.length > 0 ? (
        <p className="flex items-center justify-between rounded-xl bg-orange-pale px-4 py-3 text-lg font-bold text-orange-fonce">
          <span>Montant à crédit</span>
          <span className="montant text-2xl">{fcfa(total)}</span>
        </p>
      ) : (
        <Champ label="Montant à crédit (F)" name="montant" inputMode="numeric" required />
      )}

      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Noter la prise à crédit</BoutonEnvoyer>
    </form>
  );
}
