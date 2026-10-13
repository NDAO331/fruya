"use client";

import { useEffect, useRef, useState } from "react";
import { FormeFruit } from "@/components/FormeFruit";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import type { Paiement } from "@/lib/types";
import { interpreterPropositions, type FruitDictee, type VenteReconnue } from "@/lib/vente-dictee";
import { ErreurVoix, transcrire, type Ecoute } from "@/lib/voix";
import { encaisserLignes, nouvelleLigne, quantiteAffichee, totalPanier, type LignePanier } from "./panier";
import { ChoixPaiement } from "./ChoixPaiement";
import { VenteEncaissee } from "./VenteEncaissee";

type Etat =
  | { etape: "ecoute" }
  | { etape: "comprise"; lignes: LignePanier[]; supposees: boolean; texte: string }
  | { etape: "erreur"; message: string; texte?: string }
  | { etape: "encaissee"; id: string; date: Date; lignes: LignePanier[] };

function enLignes(ventes: VenteReconnue[]): LignePanier[] {
  return ventes.map((v) =>
    nouvelleLigne({
      product_id: v.fruit.id,
      nom: v.fruit.nom,
      forme: v.fruit.forme,
      quantite: v.quantite,
      unite: v.unite,
      prix_unitaire: v.prix_unitaire,
    }),
  );
}

// Dictée : le micro écoute dès l'ouverture ; un ou plusieurs fruits peuvent
// être dits (« 2 kilos de mangues et 3 bananes »). La vente reconnue
// s'affiche et le vendeur la confirme d'un toucher, ou la corrige dans le panier.
export function DicteeFeuille({
  fruits,
  stallId,
  userId,
  etalNom,
  vendeurNom,
  panierVide,
  onVersPanier,
  onFermer,
}: {
  fruits: FruitDictee[];
  stallId: string;
  userId: string;
  etalNom: string;
  vendeurNom: string;
  panierVide: boolean;
  onVersPanier: (lignes: LignePanier[]) => void; // corriger, ou compléter un panier en cours
  onFermer: () => void;
}) {
  const [etat, setEtat] = useState<Etat>({ etape: "ecoute" });
  const [paiement, setPaiement] = useState<Paiement>("especes");
  const ecoute = useRef<Ecoute | null>(null);

  function ecouter() {
    setEtat({ etape: "ecoute" });
    demarrer();
  }

  function demarrer() {
    const e = transcrire();
    ecoute.current = e;
    e.resultat.then(
      (textes) => {
        const r = interpreterPropositions(textes, fruits);
        setEtat(
          r.ok
            ? { etape: "comprise", lignes: enLignes(r.ventes), supposees: r.ventes.some((v) => v.quantiteSupposee), texte: r.texte }
            : { etape: "erreur", message: r.erreur, texte: r.texte },
        );
      },
      (erreur) =>
        setEtat({
          etape: "erreur",
          message: erreur instanceof ErreurVoix ? erreur.message : "La dictée n'a pas marché. Saisis à la main.",
        }),
    );
  }

  // Le micro s'ouvre directement ; il est coupé si on ferme le panneau.
  useEffect(() => {
    demarrer();
    return () => ecoute.current?.annuler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function encaisser(lignes: LignePanier[]) {
    const vente = await encaisserLignes(lignes, "vocale", paiement, stallId, userId);
    setEtat({ etape: "encaissee", ...vente, lignes });
  }

  if (etat.etape === "encaissee") {
    return (
      <VenteEncaissee
        venteId={etat.id}
        date={etat.date}
        lignes={etat.lignes}
        total={totalPanier(etat.lignes)}
        paiement={paiement}
        etalNom={etalNom}
        vendeurNom={vendeurNom}
        onSuivante={onFermer}
      />
    );
  }

  if (etat.etape === "ecoute") {
    return (
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <button
          type="button"
          onClick={() => ecoute.current?.arreter()}
          aria-label="J'ai fini de parler"
          className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-orange"
        >
          <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"
              fill="none"
              stroke="#15171A"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <p className="text-2xl font-bold">Je t&apos;écoute…</p>
        <p className="text-base font-semibold text-encre-doux">
          Dis par exemple : « 2 kilos de mangues et 3 bananes »
        </p>
      </div>
    );
  }

  if (etat.etape === "erreur") {
    return (
      <div className="flex flex-col gap-4 pb-2">
        {etat.texte && (
          <p className="rounded-xl bg-gris px-4 py-3 text-base font-semibold text-encre-doux">J&apos;ai entendu : « {etat.texte} »</p>
        )}
        <p role="alert" className="rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
          {etat.message}
        </p>
        <button type="button" onClick={ecouter} className={classeBoutonPrincipal}>
          Réessayer
        </button>
        <button
          type="button"
          onClick={onFermer}
          className="flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold active:bg-gris"
        >
          Saisir à la main
        </button>
      </div>
    );
  }

  const total = totalPanier(etat.lignes);
  const classeGrosBouton = `${classeBoutonPrincipal.replace("justify-center", "justify-between")} px-5`;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <p className="rounded-xl bg-gris px-4 py-3 text-base font-semibold text-encre-doux">J&apos;ai entendu : « {etat.texte} »</p>

      <ul className="rounded-2xl border-2 border-vert px-4 py-1">
        {etat.lignes.map((l) => (
          <li key={l.cle} className="flex items-center gap-3 border-b border-trait py-2 last:border-b-0">
            <FormeFruit forme={l.forme} taille={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold">{l.nom}</span>
              <span className="block text-sm font-semibold text-encre-doux">
                {quantiteAffichee(l.quantite, l.unite)} à {fcfa(l.prix_unitaire)} {l.unite === "kg" ? "le kg" : "la pièce"}
              </span>
            </span>
            <span className="montant text-lg">{fcfa(l.montant)}</span>
          </li>
        ))}
      </ul>
      {etat.supposees && <p className="text-sm font-bold text-orange-fonce">Quantité non entendue pour un fruit : 1 par défaut.</p>}

      {panierVide ? (
        <>
        <ChoixPaiement valeur={paiement} onChange={setPaiement} />
        <button type="button" onClick={() => encaisser(etat.lignes)} className={classeGrosBouton}>
          <span>Encaisser</span>
          <span className="montant text-2xl">{fcfa(total)}</span>
        </button>
        </>
      ) : (
        <button type="button" onClick={() => onVersPanier(etat.lignes)} className={classeGrosBouton}>
          <span>Ajouter au panier</span>
          <span className="montant text-2xl">{fcfa(total)}</span>
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onVersPanier(etat.lignes)}
          className="flex h-12 items-center justify-center rounded-2xl bg-gris text-base font-bold active:bg-trait"
        >
          Corriger
        </button>
        <button
          type="button"
          onClick={ecouter}
          className="flex h-12 items-center justify-center rounded-2xl bg-gris text-base font-bold active:bg-trait"
        >
          Redire
        </button>
      </div>
    </div>
  );
}
