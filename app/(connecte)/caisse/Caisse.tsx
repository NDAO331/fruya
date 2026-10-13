"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { FormeFruit } from "@/components/FormeFruit";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { chiffres, debutJourDakar, fcfa, jourAffiche } from "@/lib/format";
import { baseLocale, type VenteLocale } from "@/lib/hors-ligne/base";
import { compresserPhoto } from "@/lib/hors-ligne/pertes";
import type { Fruit, Unite } from "@/lib/types";
import { useVoixPossible } from "@/lib/voix";
import { totalPanier, type LignePanier } from "./panier";
import { PanierFeuille } from "./PanierFeuille";
import { DernieresOperations } from "./DernieresOperations";
import { DicteeFeuille } from "./DicteeFeuille";
import { PerteFeuille } from "./PerteFeuille";
import { VenteFeuille } from "./VenteFeuille";

type Props = {
  fruits: Fruit[];
  totalServeur: number;
  nbServeur: number;
  renduA: string; // moment où le serveur a calculé le total
  utilisateur: { id: string; nom: string; stall_id: string; estGerant: boolean; etal: string };
};

// Prix proposé : dernier prix pratiqué sur ce téléphone, sinon dernier prix
// connu du serveur, sinon prix de référence du gérant.
function prixProposes(fruit: Fruit, locaux: Map<string, number>): Record<Unite, number | null> {
  return {
    kg: fruit.prix_kg === null ? null : locaux.get(`${fruit.id}:kg`) ?? fruit.dernier_prix_kg ?? fruit.prix_kg,
    piece:
      fruit.prix_piece === null ? null : locaux.get(`${fruit.id}:piece`) ?? fruit.dernier_prix_piece ?? fruit.prix_piece,
  };
}

export function Caisse({ fruits, totalServeur, nbServeur, renduA, utilisateur }: Props) {
  const [fruitOuvert, setFruitOuvert] = useState<Fruit | null>(null);
  const [dictee, setDictee] = useState(false);
  // Panier : plusieurs fruits pour un même client (une seule vente, une facture).
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [panierVocal, setPanierVocal] = useState(false); // le panier vient d'une dictée
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [photoPerte, setPhotoPerte] = useState<Blob | null>(null);
  const appareilPhoto = useRef<HTMLInputElement>(null);
  // Micro caché si le navigateur ne gère pas la dictée ou sans réseau :
  // la saisie manuelle reste toujours possible.
  const voix = useVoixPossible();

  // « Perte » ouvre directement l'appareil photo (PRD 3.1) ; la photo est
  // obligatoire, le reste se remplit ensuite.
  async function photoPrise(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (fichier) setPhotoPerte(await compresserPhoto(fichier));
  }

  // Pertes de ce téléphone pas encore envoyées (perte ou photo).
  const pertesEnAttente = useLiveQuery(
    async () =>
      (await baseLocale().pertes.where("stall_id").equals(utilisateur.stall_id).toArray()).filter(
        (p) => p.user_id === utilisateur.id && (p.etat === "en_attente" || (p.etat === "envoyee" && !p.photo_envoyee && p.photo)),
      ).length,
    [utilisateur.stall_id, utilisateur.id],
    0,
  );

  // Ventes de ce téléphone pour cet étal (le vendeur ne compte que les siennes).
  const locales = useLiveQuery(
    async () =>
      (await baseLocale().ventes.where("stall_id").equals(utilisateur.stall_id).sortBy("date")).filter(
        (v) => utilisateur.estGerant || v.user_id === utilisateur.id,
      ),
    [utilisateur.stall_id, utilisateur.id, utilisateur.estGerant],
    [] as VenteLocale[],
  );

  // Le total du serveur ne contient pas encore les ventes en attente, ni
  // celles envoyées après son calcul : on les ajoute (PRD 4.1).
  const debutJour = debutJourDakar();
  const enPlus = locales.filter(
    (v) =>
      v.date >= debutJour &&
      !v.annulee &&
      (v.etat === "en_attente" || (v.etat === "envoyee" && (v.envoyee_le ?? "") > renduA)),
  );
  const total = totalServeur + enPlus.reduce((s, v) => s + v.montant_total, 0);
  const nbVentes = nbServeur + enPlus.length;
  const enAttente = locales.filter((v) => v.etat === "en_attente").length + pertesEnAttente;
  const refusees = locales.filter((v) => v.etat === "refusee");

  const derniersPrix = new Map<string, number>();
  for (const v of locales) {
    for (const l of v.lignes) derniersPrix.set(`${l.product_id}:${l.unite}`, l.prix_unitaire);
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-4 rounded-3xl bg-vert px-5 py-5 text-white">
        <p className="text-sm font-semibold text-orange-clair first-letter:uppercase">
          {jourAffiche()} · {utilisateur.estGerant ? "tout l'étal" : utilisateur.nom}
        </p>
        <p className="montant mt-1 text-5xl leading-none">{chiffres(total)} F</p>
        <p className="mt-2 text-sm font-semibold text-white/75">
          {nbVentes} {nbVentes > 1 ? "ventes" : "vente"} aujourd&apos;hui
          {enAttente > 0 && <span className="text-orange-clair"> · {enAttente} en attente d&apos;envoi</span>}
        </p>
      </section>

      {refusees.length > 0 && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
          {refusees.length === 1 ? "1 vente n'a pas été acceptée" : `${refusees.length} ventes n'ont pas été acceptées`}{" "}
          par le serveur : {refusees[0].resume}. Préviens le gérant.
        </p>
      )}

      {fruits.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
          <p className="text-xl font-bold">Pas encore de fruits</p>
          <p className="mt-1 text-base font-semibold text-encre-doux">
            {utilisateur.estGerant
              ? "Ajoute les fruits que tu vends pour commencer."
              : "Le gérant doit d'abord ajouter les fruits de l'étal."}
          </p>
          {utilisateur.estGerant && (
            <Link href="/gerant/fruits" className={`${classeBoutonPrincipal} mt-6`}>
              Ajouter mes fruits
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4">
          {fruits.map((fruit) => {
            const prix = prixProposes(fruit, derniersPrix);
            const propose = prix[fruit.unite_defaut];
            return (
              <li key={fruit.id}>
                <button
                  type="button"
                  onClick={() => setFruitOuvert(fruit)}
                  className="flex h-[68px] w-full items-center gap-3 border-b border-trait px-4 text-left active:bg-vert-pale"
                >
                  <FormeFruit forme={fruit.forme} />
                  <span className="min-w-0 flex-1 truncate text-lg font-bold">{fruit.nom}</span>
                  {propose !== null && (
                    <span className="text-right">
                      <span className="montant block text-xl leading-none">{fcfa(propose)}</span>
                      <span className="block text-xs font-semibold text-encre-doux">
                        {fruit.unite_defaut === "kg" ? "le kg" : "la pièce"}
                      </span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DernieresOperations userId={utilisateur.id} />

      {fruits.length > 0 && (
        <div className={`sticky ${utilisateur.estGerant ? "bottom-16" : "bottom-0"} mt-auto bg-fond px-4 pt-3 pb-4`}>
          {panier.length > 0 && (
            <button
              type="button"
              onClick={() => setPanierOuvert(true)}
              className="mb-2 flex h-14 w-full items-center justify-between rounded-2xl bg-vert px-5 text-lg font-bold text-white active:bg-vert-fonce"
            >
              <span>
                Panier · {panier.length} fruit{panier.length > 1 ? "s" : ""}
              </span>
              <span className="montant text-2xl">{fcfa(totalPanier(panier))}</span>
            </button>
          )}
          <input
            ref={appareilPhoto}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={photoPrise}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className={`grid gap-2 ${voix ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => appareilPhoto.current?.click()}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-alerte-pale text-lg font-bold text-alerte active:bg-alerte/15"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              Perte
            </button>
            {voix && (
              <button
                type="button"
                onClick={() => setDictee(true)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-pale text-lg font-bold text-orange-fonce active:bg-orange/20"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Dicter
              </button>
            )}
          </div>
        </div>
      )}

      <Feuille ouvert={dictee} onFermer={() => setDictee(false)} titre="Dicter une vente">
        {dictee && (
          <DicteeFeuille
            fruits={fruits.map((f) => ({
              id: f.id,
              nom: f.nom,
              forme: f.forme,
              unite_defaut: f.unite_defaut,
              prix: prixProposes(f, derniersPrix),
            }))}
            stallId={utilisateur.stall_id}
            userId={utilisateur.id}
            etalNom={utilisateur.etal}
            vendeurNom={utilisateur.nom}
            panierVide={panier.length === 0}
            onVersPanier={(lignes) => {
              if (panier.length === 0) setPanierVocal(true);
              setPanier((p) => [...p, ...lignes]);
              setDictee(false);
              setPanierOuvert(true);
            }}
            onFermer={() => setDictee(false)}
          />
        )}
      </Feuille>

      <Feuille ouvert={panierOuvert} onFermer={() => setPanierOuvert(false)} titre="Panier">
        {panierOuvert && (
          <PanierFeuille
            lignes={panier}
            methode={panierVocal ? "vocale" : "manuelle"}
            stallId={utilisateur.stall_id}
            userId={utilisateur.id}
            etalNom={utilisateur.etal}
            vendeurNom={utilisateur.nom}
            onRetirer={(cle) => setPanier((p) => p.filter((l) => l.cle !== cle))}
            onAutreFruit={() => setPanierOuvert(false)}
            onEncaisse={() => {
              setPanier([]);
              setPanierVocal(false);
            }}
            onTermine={() => setPanierOuvert(false)}
          />
        )}
      </Feuille>

      <Feuille ouvert={photoPerte !== null} onFermer={() => setPhotoPerte(null)} titre="Perte">
        {photoPerte && (
          <PerteFeuille
            photo={photoPerte}
            fruits={fruits}
            stallId={utilisateur.stall_id}
            userId={utilisateur.id}
            onReprendrePhoto={setPhotoPerte}
            onFermer={() => setPhotoPerte(null)}
          />
        )}
      </Feuille>

      <Feuille
        ouvert={fruitOuvert !== null}
        onFermer={() => setFruitOuvert(null)}
        titre={panier.length > 0 ? "Ajouter au panier" : "Vente"}
      >
        {fruitOuvert && (
          <VenteFeuille
            key={fruitOuvert.id}
            fruit={fruitOuvert}
            prixProposes={prixProposes(fruitOuvert, derniersPrix)}
            stallId={utilisateur.stall_id}
            userId={utilisateur.id}
            etalNom={utilisateur.etal}
            vendeurNom={utilisateur.nom}
            panierVide={panier.length === 0}
            onAjouter={(ligne) => setPanier((p) => [...p, ligne])}
            onFermer={() => setFruitOuvert(null)}
          />
        )}
      </Feuille>
    </main>
  );
}
