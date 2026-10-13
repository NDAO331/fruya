"use client";

import { useState, useTransition } from "react";
import { Feuille } from "@/components/Feuille";
import { FormeFruit } from "@/components/FormeFruit";
import { classeBoutonPrincipal } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import type { Fruit } from "@/lib/types";
import { ajouterFruit, changerActif, modifierFruit } from "./actions";
import { FormulaireFruit } from "./FormulaireFruit";

function prixAffiches(fruit: Fruit): string {
  const prix: string[] = [];
  if (fruit.prix_kg !== null) prix.push(`${fcfa(fruit.prix_kg)} le kg`);
  if (fruit.prix_piece !== null) prix.push(`${fcfa(fruit.prix_piece)} la pièce`);
  return prix.join(" · ");
}

type Panneau = { mode: "ajout" } | { mode: "modif"; fruit: Fruit } | null;

export function ListeFruits({ fruits }: { fruits: Fruit[] }) {
  // Premier lancement : le panneau d'ajout s'ouvre directement.
  const [panneau, setPanneau] = useState<Panneau>(fruits.length === 0 ? { mode: "ajout" } : null);
  const [message, setMessage] = useState<string>();
  const [enCours, demarrer] = useTransition();

  const actifs = fruits.filter((f) => f.actif);
  const retires = fruits.filter((f) => !f.actif);

  function fermer(texte?: string) {
    setPanneau(null);
    setMessage(texte);
  }

  function basculer(fruit: Fruit) {
    demarrer(async () => {
      await changerActif(fruit.id, !fruit.actif);
      fermer(fruit.actif ? `${fruit.nom} retiré de la caisse.` : `${fruit.nom} remis en caisse.`);
    });
  }

  return (
    <main className="flex flex-1 flex-col">
      {message && (
        <p role="status" className="mx-4 mb-2 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      {fruits.length === 0 && (
        <p className="px-4 text-lg font-semibold text-encre-doux">
          Ton étal est ouvert. Ajoute les fruits que tu vends : ils apparaîtront sur la caisse.
        </p>
      )}

      <ul>
        {actifs.map((fruit) => (
          <li key={fruit.id}>
            <button
              type="button"
              onClick={() => setPanneau({ mode: "modif", fruit })}
              className="flex h-[68px] w-full items-center gap-3 border-b border-trait px-4 text-left active:bg-gris"
            >
              <FormeFruit forme={fruit.forme} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">{fruit.nom}</span>
                <span className="block truncate text-sm font-semibold text-encre-doux">{prixAffiches(fruit)}</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="text-encre-doux">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {retires.length > 0 && (
        <section className="mt-6">
          <h2 className="px-4 pb-1 text-sm font-bold text-encre-doux">Retirés de la caisse</h2>
          <ul>
            {retires.map((fruit) => (
              <li key={fruit.id} className="flex h-[60px] items-center gap-3 border-b border-trait px-4">
                <span className="grayscale">
                  <FormeFruit forme={fruit.forme} taille={36} />
                </span>
                <span className="flex-1 truncate text-base font-bold text-encre-doux">{fruit.nom}</span>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => basculer(fruit)}
                  className="h-10 rounded-full bg-gris px-4 text-sm font-bold active:bg-trait"
                >
                  Remettre
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-16 mt-auto bg-fond px-4 pt-3 pb-4">
        <button type="button" onClick={() => setPanneau({ mode: "ajout" })} className={classeBoutonPrincipal}>
          Ajouter un fruit
        </button>
      </div>

      <Feuille
        ouvert={panneau !== null}
        onFermer={() => setPanneau(null)}
        titre={panneau?.mode === "modif" ? panneau.fruit.nom : "Nouveau fruit"}
      >
        {panneau?.mode === "ajout" && (
          <FormulaireFruit
            key="ajout"
            action={ajouterFruit}
            libelleBouton="Ajouter"
            onSucces={(texte) => fermer(texte)}
          />
        )}
        {panneau?.mode === "modif" && (
          <>
            <FormulaireFruit
              key={panneau.fruit.id}
              action={modifierFruit.bind(null, panneau.fruit.id)}
              fruit={panneau.fruit}
              libelleBouton="Enregistrer"
              onSucces={(texte) => fermer(texte)}
            />
            <button
              type="button"
              disabled={enCours}
              onClick={() => basculer(panneau.fruit)}
              className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold text-alerte active:bg-alerte-pale"
            >
              Retirer de la caisse
            </button>
          </>
        )}
      </Feuille>
    </main>
  );
}
