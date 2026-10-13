"use client";

import { useState } from "react";
import { FormeFruit } from "@/components/FormeFruit";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { chiffres, fcfa } from "@/lib/format";
import type { Fruit, Unite } from "@/lib/types";
import { encaisserLignes, nouvelleLigne, type LignePanier } from "./panier";
import { lireNombre, PaveNumerique, saisir } from "./PaveNumerique";
import { VenteEncaissee } from "./VenteEncaissee";

type Champ = "quantite" | "prix";

const LIBELLE_UNITE: Record<Unite, { court: string; prix: string }> = {
  kg: { court: "kg", prix: "Prix le kg" },
  piece: { court: "pièce", prix: "Prix la pièce" },
};

// Un fruit : unité (si le fruit a les deux prix), quantité, prix pré-rempli
// et modifiable. Panier vide : « Encaisser » direct (3 touchers) ou « + Autre
// fruit » pour remplir un panier. Panier en cours : « Ajouter au panier ».
export function VenteFeuille({
  fruit,
  prixProposes,
  stallId,
  userId,
  etalNom,
  vendeurNom,
  panierVide,
  initial,
  onAjouter,
  onFermer,
}: {
  fruit: Fruit;
  prixProposes: Record<Unite, number | null>;
  stallId: string;
  userId: string;
  etalNom: string;
  vendeurNom: string;
  panierVide: boolean;
  initial?: { unite: Unite; quantite: number; prix: number };
  onAjouter: (ligne: LignePanier) => void;
  onFermer: () => void;
}) {
  const unitesPossibles = (["kg", "piece"] as Unite[]).filter((u) => prixProposes[u] !== null || initial?.unite === u);
  const [unite, setUnite] = useState<Unite>(
    initial?.unite ??
      (unitesPossibles.includes(fruit.unite_defaut) ? fruit.unite_defaut : unitesPossibles[0] ?? fruit.unite_defaut),
  );
  const [quantite, setQuantite] = useState(initial ? String(initial.quantite).replace(".", ",") : "");
  const [prix, setPrix] = useState(String(initial?.prix ?? prixProposes[unite] ?? ""));
  const [champ, setChamp] = useState<Champ>("quantite");
  const [erreur, setErreur] = useState<string>();
  const [encaisse, setEncaisse] = useState<{ id: string; date: Date; ligne: LignePanier } | null>(null);

  const q = lireNombre(quantite);
  const p = lireNombre(prix);
  const ligne = nouvelleLigne({ product_id: fruit.id, nom: fruit.nom, forme: fruit.forme, quantite: q, unite, prix_unitaire: p });

  function changerUnite(u: Unite) {
    setUnite(u);
    setPrix(String(prixProposes[u] ?? ""));
    if (u === "piece") setQuantite((v) => v.split(",")[0]);
    setChamp("quantite");
  }

  function toucher(touche: string) {
    setErreur(undefined);
    if (champ === "quantite") setQuantite((v) => saisir(v, touche, { virgule: unite === "kg", max: 6 }));
    else setPrix((v) => saisir(v, touche, { virgule: false, max: 7 }));
  }

  function valide(): boolean {
    if (q <= 0) {
      setChamp("quantite");
      setErreur("Tape la quantité.");
      return false;
    }
    if (p <= 0) {
      setChamp("prix");
      setErreur("Tape le prix.");
      return false;
    }
    return true;
  }

  async function encaisser() {
    if (!valide()) return;
    const vente = await encaisserLignes([ligne], "manuelle", stallId, userId);
    setEncaisse({ ...vente, ligne });
  }

  function ajouter() {
    if (!valide()) return;
    onAjouter(ligne);
    onFermer();
  }

  if (encaisse) {
    return (
      <VenteEncaissee
        venteId={encaisse.id}
        date={encaisse.date}
        lignes={[encaisse.ligne]}
        total={encaisse.ligne.montant}
        etalNom={etalNom}
        vendeurNom={vendeurNom}
        onSuivante={onFermer}
      />
    );
  }

  const classeCase = (actif: boolean) =>
    `flex-1 rounded-xl px-3 py-2 text-left ${actif ? "border-2 border-vert bg-fond" : "border-2 border-transparent bg-gris"}`;
  const classeGrosBouton = `${classeBoutonPrincipal.replace("justify-center", "justify-between")} px-5`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <FormeFruit forme={fruit.forme} />
        <p className="flex-1 truncate text-xl font-bold">{fruit.nom}</p>
      </div>

      {unitesPossibles.length > 1 && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gris p-1" role="radiogroup" aria-label="Unité">
          {unitesPossibles.map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unite === u}
              onClick={() => changerUnite(u)}
              className={`h-11 rounded-lg text-base font-bold ${
                unite === u ? "bg-fond text-encre shadow-[0_0_0_1px_var(--color-trait)]" : "text-encre-doux"
              }`}
            >
              {u === "kg" ? "Au kilo" : "À la pièce"}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setChamp("quantite")} className={classeCase(champ === "quantite")}>
          <span className="block text-xs font-bold text-encre-doux">Quantité</span>
          <span className="montant block text-3xl leading-tight">
            {quantite || "0"} <span className="text-lg">{LIBELLE_UNITE[unite].court}</span>
          </span>
        </button>
        <button type="button" onClick={() => setChamp("prix")} className={classeCase(champ === "prix")}>
          <span className="block text-xs font-bold text-encre-doux">{LIBELLE_UNITE[unite].prix}</span>
          <span className="montant block text-3xl leading-tight">{chiffres(p)} F</span>
        </button>
      </div>

      <p role="alert" className="min-h-6 text-center text-base font-semibold text-alerte">
        {erreur}
      </p>

      <PaveNumerique virgule={champ === "quantite" && unite === "kg"} onTouche={toucher} />

      {panierVide ? (
        <>
          <button type="button" onClick={encaisser} className={classeGrosBouton}>
            <span>Encaisser</span>
            <span className="montant text-2xl">{fcfa(ligne.montant)}</span>
          </button>
          <button
            type="button"
            onClick={ajouter}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-orange-pale text-base font-bold text-orange-fonce active:bg-orange/20"
          >
            + Autre fruit pour ce client
          </button>
        </>
      ) : (
        <button type="button" onClick={ajouter} className={classeGrosBouton}>
          <span>Ajouter au panier</span>
          <span className="montant text-2xl">{fcfa(ligne.montant)}</span>
        </button>
      )}
    </div>
  );
}
