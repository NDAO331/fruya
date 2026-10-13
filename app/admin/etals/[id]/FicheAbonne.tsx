"use client";

import { useActionState, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { BoutonEnvoyer, Champ, classeBoutonPrincipal, MessageFormulaire } from "@/components/formulaire";
import { dateLisible } from "@/lib/acces";
import { fcfa } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";
import type { EtatFormulaire } from "@/lib/types";
import { bloquer, debloquer, enregistrerPaiement, prolongerEssai } from "../../actions";
import { joursRestants, LIBELLE_STATUT, type Abonne } from "../../types";

export type Paiement = {
  id: string;
  montant: number;
  date_paiement: string;
  moyen: "wave" | "orange_money" | "especes";
  mois_payes: number;
  note: string | null;
};

const MOYENS: { valeur: Paiement["moyen"]; libelle: string }[] = [
  { valeur: "wave", libelle: "Wave" },
  { valeur: "orange_money", libelle: "Orange Money" },
  { valeur: "especes", libelle: "Espèces" },
];

type Action = (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
type Panneau = "paiement" | "blocage" | "prolongation" | null;

/** Formulaire d'action qui ferme le panneau et affiche le message en cas de succès. */
function useActionFiche(action: Action, onSucces: (message: string) => void) {
  return useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await action(prec, formData);
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);
}

export function FicheAbonne({
  abonne,
  paiements,
  aujourdhui,
  numeroPaiement,
}: {
  abonne: Abonne;
  paiements: Paiement[];
  aujourdhui: string;
  numeroPaiement: string | null;
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [message, setMessage] = useState<string>();
  const fermer = (texte: string) => {
    setPanneau(null);
    setMessage(texte);
  };

  const statut = LIBELLE_STATUT[abonne.statut];
  const j = joursRestants(abonne.date_fin_acces, aujourdhui);
  const rappel =
    `Bonjour ${abonne.gerant_nom}, ` +
    (j >= 0
      ? `ton abonnement Fruya expire le ${dateLisible(abonne.date_fin_acces)}.`
      : `ton abonnement Fruya a expiré le ${dateLisible(abonne.date_fin_acces)}.`) +
    ` Paie 3 000 F par Wave ou Orange Money${numeroPaiement ? ` au ${numeroPaiement}` : ""} pour continuer. Jërëjëf !`;
  const lienWhatsApp = `https://wa.me/${abonne.gerant_telephone}?text=${encodeURIComponent(rappel)}`;

  const infos = [
    { libelle: "Gérant", valeur: `${abonne.gerant_nom} · ${formaterTelephone(abonne.gerant_telephone)}` },
    { libelle: "Inscription", valeur: dateLisible(abonne.date_inscription.slice(0, 10)) },
    {
      libelle: "Fin d'accès",
      valeur: `${dateLisible(abonne.date_fin_acces)} (${j >= 0 ? `dans ${j} j` : `dépassée de ${-j} j`})`,
    },
    { libelle: "Vendeurs", valeur: String(abonne.nb_vendeurs) },
    {
      libelle: "Dernière vente",
      valeur: abonne.date_derniere_vente ? dateLisible(abonne.date_derniere_vente.slice(0, 10)) : "Aucune",
    },
  ];

  return (
    <main className="flex flex-1 flex-col gap-3 pb-6">
      <div className="px-4">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${statut.classe}`}>{statut.texte}</span>
        {abonne.bloque && abonne.raison_blocage && (
          <p className="mt-2 text-base font-semibold text-alerte">Bloqué : « {abonne.raison_blocage} »</p>
        )}
      </div>

      {message && (
        <p role="status" className="mx-4 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      <dl className="border-t border-trait">
        {infos.map((i) => (
          <div key={i.libelle} className="flex min-h-12 items-center justify-between gap-4 border-b border-trait px-4 py-2">
            <dt className="text-base font-semibold text-encre-doux">{i.libelle}</dt>
            <dd className="text-right text-base font-bold">{i.valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2 px-4">
        <button type="button" onClick={() => setPanneau("paiement")} className={`${classeBoutonPrincipal} col-span-2`}>
          Enregistrer un paiement
        </button>
        <a
          href={lienWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center rounded-2xl bg-vert-pale text-base font-bold text-vert active:bg-vert/15"
        >
          Rappel WhatsApp
        </a>
        <button
          type="button"
          onClick={() => setPanneau("prolongation")}
          className="flex h-12 items-center justify-center rounded-2xl bg-orange-pale text-base font-bold text-orange-fonce active:bg-orange/20"
        >
          Prolonger l&apos;essai
        </button>
        <button
          type="button"
          onClick={() => setPanneau("blocage")}
          className="col-span-2 flex h-12 items-center justify-center rounded-2xl bg-alerte-pale text-base font-bold text-alerte active:bg-alerte/15"
        >
          {abonne.bloque ? "Débloquer l'étal" : "Bloquer l'étal"}
        </button>
      </div>

      <section>
        <h2 className="px-4 pt-3 pb-1 text-sm font-bold text-encre-doux">Paiements</h2>
        {paiements.length === 0 ? (
          <p className="px-4 text-base font-semibold text-encre-doux">Aucun paiement pour l&apos;instant.</p>
        ) : (
          <ul>
            {paiements.map((p) => (
              <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-trait px-4 py-2">
                <span>
                  <span className="block text-base font-bold">
                    {dateLisible(p.date_paiement)} · {MOYENS.find((m) => m.valeur === p.moyen)?.libelle}
                  </span>
                  <span className="block text-sm font-semibold text-encre-doux">
                    {p.mois_payes} mois{p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="montant text-lg">{fcfa(p.montant)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Feuille
        ouvert={panneau !== null}
        onFermer={() => setPanneau(null)}
        titre={
          panneau === "paiement"
            ? "Paiement reçu"
            : panneau === "prolongation"
              ? "Prolonger l'essai"
              : abonne.bloque
                ? "Débloquer l'étal"
                : "Bloquer l'étal"
        }
      >
        {panneau === "paiement" && <FormPaiement stallId={abonne.id} aujourdhui={aujourdhui} onSucces={fermer} />}
        {panneau === "prolongation" && <FormProlongation stallId={abonne.id} onSucces={fermer} />}
        {panneau === "blocage" && <FormBlocage stallId={abonne.id} bloque={abonne.bloque} onSucces={fermer} />}
      </Feuille>
    </main>
  );
}

function FormPaiement({ stallId, aujourdhui, onSucces }: { stallId: string; aujourdhui: string; onSucces: (m: string) => void }) {
  const [etat, envoyer] = useActionFiche(enregistrerPaiement.bind(null, stallId), onSucces);
  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Montant (F)" name="montant" inputMode="numeric" defaultValue={3000} required />
        <Champ label="Mois payés" name="mois_payes" inputMode="numeric" defaultValue={1} required />
      </div>
      <Champ label="Date du paiement" name="date_paiement" type="date" defaultValue={aujourdhui} max={aujourdhui} required />
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-encre-doux">Moyen</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-gris p-1">
          {MOYENS.map((m, i) => (
            <label key={m.valeur} className="cursor-pointer">
              <input type="radio" name="moyen" value={m.valeur} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex h-11 items-center justify-center rounded-lg text-sm font-bold text-encre-doux peer-checked:bg-fond peer-checked:text-encre peer-checked:shadow-[0_0_0_1px_var(--color-trait)] peer-focus-visible:ring-2 peer-focus-visible:ring-vert">
                {m.libelle}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Champ label="Note (facultatif)" name="note" />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Enregistrer le paiement</BoutonEnvoyer>
      <p className="text-sm font-semibold text-encre-doux">
        Nouvelle fin d&apos;accès = la plus tardive entre l&apos;ancienne et aujourd&apos;hui, + les mois payés.
      </p>
    </form>
  );
}

function FormProlongation({ stallId, onSucces }: { stallId: string; onSucces: (m: string) => void }) {
  const [etat, envoyer] = useActionFiche(prolongerEssai.bind(null, stallId), onSucces);
  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <Champ label="Nombre de jours offerts" name="jours" inputMode="numeric" defaultValue={7} required />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Prolonger</BoutonEnvoyer>
    </form>
  );
}

function FormBlocage({ stallId, bloque, onSucces }: { stallId: string; bloque: boolean; onSucces: (m: string) => void }) {
  const [etat, envoyer] = useActionFiche((bloque ? debloquer : bloquer).bind(null, stallId), onSucces);
  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <Champ
        label={bloque ? "Pourquoi débloquer ?" : "Raison du blocage"}
        name="raison"
        required
        placeholder={bloque ? "Paiement réglé, erreur…" : "Fraude, demande du client…"}
      />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">{bloque ? "Débloquer" : "Bloquer l'étal"}</BoutonEnvoyer>
      {!bloque && (
        <p className="text-sm font-semibold text-encre-doux">
          Le gérant et ses vendeurs verront « Accès suspendu ». Rien n&apos;est effacé.
        </p>
      )}
    </form>
  );
}
