"use client";

import Link from "next/link";
import { useState } from "react";
import { initiales } from "@/components/EnTete";
import { Feuille } from "@/components/Feuille";
import { classeBoutonPrincipal, classeChamp } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";
import type { Fruit } from "@/lib/types";
import { FormulairePrise } from "./FormulairePrise";

export type ClientArdoise = {
  debt_id: string;
  client_nom: string;
  client_telephone: string | null;
  montant_du: number;
};

function Ligne({ client }: { client: ClientArdoise }) {
  return (
    <li>
      <Link
        href={`/gerant/dettes/${client.debt_id}`}
        className="flex h-[68px] items-center gap-3 border-b border-trait px-4 active:bg-gris"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-orange-pale text-sm font-bold text-orange-fonce">
          {initiales(client.client_nom)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold">{client.client_nom}</span>
          {client.client_telephone && (
            <span className="block text-sm font-semibold text-encre-doux">{formaterTelephone(client.client_telephone)}</span>
          )}
        </span>
        <span className={`montant text-xl ${client.montant_du > 0 ? "text-orange-fonce" : "text-encre-doux"}`}>
          {client.montant_du > 0 ? fcfa(client.montant_du) : "À jour"}
        </span>
      </Link>
    </li>
  );
}

export function ListeDettes({ clients, fruits }: { clients: ClientArdoise[]; fruits: Fruit[] }) {
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);

  const total = clients.reduce((s, c) => s + c.montant_du, 0);
  const filtre = recherche.trim().toLocaleLowerCase("fr-FR");
  const chiffresRecherche = filtre.replace(/\D/g, "");
  const visibles = clients.filter(
    (c) =>
      !filtre ||
      c.client_nom.toLocaleLowerCase("fr-FR").includes(filtre) ||
      (chiffresRecherche !== "" && (c.client_telephone ?? "").includes(chiffresRecherche)),
  );
  const doivent = visibles.filter((c) => c.montant_du > 0);
  const aJour = visibles.filter((c) => c.montant_du <= 0);

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-4 rounded-3xl bg-orange-pale px-5 py-4 text-orange-fonce">
        <p className="text-sm font-bold">Total à encaisser</p>
        <p className="montant text-4xl leading-tight">{fcfa(total)}</p>
        <p className="text-sm font-semibold">
          {clients.filter((c) => c.montant_du > 0).length} client(s) te doivent de l&apos;argent
        </p>
      </section>

      {clients.length > 4 && (
        <div className="px-4 pt-3">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher un client"
            aria-label="Chercher un client"
            className={classeChamp}
          />
        </div>
      )}

      {clients.length === 0 ? (
        <p className="px-4 py-8 text-lg font-semibold text-encre-doux">
          Personne sur l&apos;ardoise. Quand un client prend à crédit, note-le ici.
        </p>
      ) : (
        <>
          <ul className="mt-3">{doivent.map((c) => <Ligne key={c.debt_id} client={c} />)}</ul>
          {aJour.length > 0 && (
            <>
              <h2 className="px-4 pt-5 pb-1 text-sm font-bold text-encre-doux">À jour</h2>
              <ul>{aJour.map((c) => <Ligne key={c.debt_id} client={c} />)}</ul>
            </>
          )}
        </>
      )}

      <div className="sticky bottom-16 mt-auto bg-fond px-4 pt-3 pb-4">
        <button type="button" onClick={() => setOuvert(true)} className={classeBoutonPrincipal}>
          Nouveau client à crédit
        </button>
      </div>

      <Feuille ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Nouveau client à crédit">
        {ouvert && (
          <>
            <p className="mb-4 text-sm font-semibold text-encre-doux">
              Client déjà sur l&apos;ardoise ? Ferme et touche son nom dans la liste.
            </p>
            <FormulairePrise debtId={null} fruits={fruits} />
          </>
        )}
      </Feuille>
    </main>
  );
}
