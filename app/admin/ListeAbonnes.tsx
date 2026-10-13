"use client";

import Link from "next/link";
import { useState } from "react";
import { classeChamp } from "@/components/formulaire";
import { dateLisible } from "@/lib/acces";
import { formaterTelephone } from "@/lib/telephone";
import { joursRestants, LIBELLE_STATUT, type Abonne } from "./types";

type Filtre = "tous" | "bientot" | "retard" | "essai" | "bloques";

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: "tous", libelle: "Tous" },
  { valeur: "bientot", libelle: "Expire dans 3 jours" },
  { valeur: "retard", libelle: "En retard" },
  { valeur: "essai", libelle: "En essai" },
  { valeur: "bloques", libelle: "Bloqués" },
];

export function ListeAbonnes({ abonnes, aujourdhui }: { abonnes: Abonne[]; aujourdhui: string }) {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");

  const texte = recherche.trim().toLocaleLowerCase("fr-FR");
  const chiffres = texte.replace(/\D/g, "");
  const visibles = abonnes.filter((a) => {
    const j = joursRestants(a.date_fin_acces, aujourdhui);
    const okFiltre =
      filtre === "tous" ||
      (filtre === "bientot" && !a.bloque && a.statut !== "expire" && j >= 0 && j <= 3) ||
      (filtre === "retard" && a.statut === "expire") ||
      (filtre === "essai" && a.statut === "essai") ||
      (filtre === "bloques" && a.statut === "bloque");
    const okRecherche =
      !texte ||
      a.nom.toLocaleLowerCase("fr-FR").includes(texte) ||
      a.gerant_nom.toLocaleLowerCase("fr-FR").includes(texte) ||
      (chiffres !== "" && a.gerant_telephone.includes(chiffres));
    return okFiltre && okRecherche;
  });

  return (
    <section className="flex flex-col gap-2">
      <div className="px-4">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom de l'étal, du gérant ou téléphone"
          aria-label="Chercher un abonné"
          className={classeChamp}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtres">
        {FILTRES.map((f) => (
          <button
            key={f.valeur}
            type="button"
            aria-pressed={filtre === f.valeur}
            onClick={() => setFiltre(f.valeur)}
            className={`h-10 flex-none rounded-full px-4 text-sm font-bold ${
              filtre === f.valeur ? "bg-vert text-white" : "bg-gris text-encre-doux"
            }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="px-4 py-6 text-base font-semibold text-encre-doux">Aucun abonné ici.</p>
      ) : (
        <ul>
          {visibles.map((a) => {
            const statut = LIBELLE_STATUT[a.statut];
            const j = joursRestants(a.date_fin_acces, aujourdhui);
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/etals/${a.id}`}
                  className="flex min-h-[72px] items-center gap-3 border-b border-trait px-4 py-2 active:bg-gris"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">{a.nom}</span>
                    <span className="block truncate text-sm font-semibold text-encre-doux">
                      {a.gerant_nom} · {formaterTelephone(a.gerant_telephone)}
                    </span>
                    <span className="block text-xs font-semibold text-encre-doux">
                      Fin : {dateLisible(a.date_fin_acces)}
                      {j >= 0 && j <= 3 && !a.bloque ? ` (dans ${j} j)` : ""}
                      {a.date_dernier_paiement ? ` · payé le ${dateLisible(a.date_dernier_paiement)}` : " · jamais payé"}
                    </span>
                  </span>
                  <span className={`flex-none rounded-full px-3 py-1 text-xs font-bold ${statut.classe}`}>{statut.texte}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
