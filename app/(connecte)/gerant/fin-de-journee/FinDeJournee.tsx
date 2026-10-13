"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useActionState, useState } from "react";
import { BoutonEnvoyer, Champ, MessageFormulaire } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import { baseLocale } from "@/lib/hors-ligne/base";
import type { EtatFormulaire } from "@/lib/types";
import { cloturer } from "./actions";

export type Chiffres = {
  total_ventes_comptant: number;
  total_paiements_dettes: number;
  caisse_theorique: number;
  total_pertes: number;
  nb_ventes: number;
  nb_pertes: number;
};

export type Rapport = {
  date: string;
  caisse_theorique: number;
  caisse_declaree: number;
  ecart: number;
  total_ventes_comptant: number;
  total_paiements_dettes: number;
  total_pertes: number;
};

const SEUIL_ECART = 500; // PRD 4.4 : écart mis en évidence au-delà de ce seuil

function Ecart({ ecart }: { ecart: number }) {
  const fort = Math.abs(ecart) > SEUIL_ECART;
  const couleurs = ecart === 0 ? "bg-vert-pale text-vert" : fort ? "bg-alerte-pale text-alerte" : "bg-orange-pale text-orange-fonce";
  const texte =
    ecart === 0 ? "La caisse est juste" : ecart > 0 ? `${fcfa(ecart)} de plus que prévu` : `Il manque ${fcfa(-ecart)}`;
  return (
    <div className={`rounded-2xl px-4 py-3 ${couleurs}`}>
      <p className="text-sm font-bold">Écart</p>
      <p className="montant text-3xl leading-tight">{texte}</p>
      {fort && <p className="text-sm font-semibold">Écart de plus de {fcfa(SEUIL_ECART)} : vérifie les ventes et les annulations du jour.</p>}
    </div>
  );
}

export function FinDeJournee({ jour, chiffres, rapport }: { jour: string; chiffres: Chiffres; rapport: Rapport | null }) {
  const [compte, setCompte] = useState(rapport ? String(rapport.caisse_declaree) : "");
  const [etat, envoyer] = useActionState(cloturer.bind(null, jour), null as EtatFormulaire);

  // Ventes de ce téléphone pas encore envoyées : elles manquent au calcul.
  const enAttente = useLiveQuery(
    () => baseLocale().ventes.where("etat").equals("en_attente").count(),
    [],
    0,
  );

  const valeurCompte = /^\d+$/.test(compte.replace(/\s/g, "")) ? Number(compte.replace(/\s/g, "")) : null;

  return (
    <div className="flex flex-col gap-4 px-4">
      <section className="rounded-2xl bg-gris px-4 py-3">
        <p className="flex justify-between py-1 text-base font-semibold">
          <span>Ventes au comptant ({chiffres.nb_ventes})</span>
          <span className="montant">{fcfa(chiffres.total_ventes_comptant)}</span>
        </p>
        <p className="flex justify-between py-1 text-base font-semibold">
          <span>Paiements de dettes</span>
          <span className="montant">{fcfa(chiffres.total_paiements_dettes)}</span>
        </p>
        <p className="mt-1 flex justify-between border-t border-trait pt-2 text-lg font-bold">
          <span>Caisse théorique</span>
          <span className="montant text-2xl">{fcfa(chiffres.caisse_theorique)}</span>
        </p>
        <p className="text-sm font-semibold text-encre-doux">
          Les prises à crédit ne comptent pas : aucun argent reçu.
          {chiffres.nb_pertes > 0 && ` Pertes du jour : ${chiffres.nb_pertes} (≈ ${fcfa(chiffres.total_pertes)}).`}
        </p>
      </section>

      {enAttente > 0 && (
        <p className="rounded-xl bg-orange-pale px-4 py-3 text-base font-semibold text-orange-fonce">
          {enAttente} vente(s) de ce téléphone ne sont pas encore envoyées : elles manquent au calcul. Attends le réseau avant de
          compter.
        </p>
      )}

      <form action={envoyer} className="flex flex-col gap-4">
        <Champ
          label="Argent compté dans la caisse (F)"
          name="caisse_declaree"
          inputMode="numeric"
          required
          value={compte}
          onChange={(e) => setCompte(e.target.value)}
        />
        {valeurCompte !== null && <Ecart ecart={valeurCompte - chiffres.caisse_theorique} />}
        <MessageFormulaire etat={etat} />
        <BoutonEnvoyer enCours="Enregistrement…">{rapport ? "Recompter et enregistrer" : "Enregistrer la fin de journée"}</BoutonEnvoyer>
        {rapport && (
          <p className="text-sm font-semibold text-encre-doux">
            Déjà enregistrée : {fcfa(rapport.caisse_declaree)} comptés, écart{" "}
            {rapport.ecart === 0 ? "nul" : `${rapport.ecart > 0 ? "+" : "−"} ${fcfa(Math.abs(rapport.ecart))}`}.
          </p>
        )}
      </form>
    </div>
  );
}
