"use client";

import { useActionState, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { BoutonEnvoyer, Champ, classeBoutonPrincipal, MessageFormulaire } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";
import type { EtatFormulaire, Fruit } from "@/lib/types";
import { annulerTransaction, encaisserPaiement, type DetailFruit } from "../actions";
import { FormulairePrise } from "../FormulairePrise";

export type Transaction = {
  id: string;
  type: "prise" | "paiement" | "annulation";
  montant: number;
  detail: DetailFruit[] | null;
  raison: string | null;
  date: string;
  auteur: string;
  annulation: { raison: string; par: string } | null;
};

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

function detailTexte(detail: DetailFruit[] | null): string {
  if (!detail?.length) return "";
  return detail
    .map((l) => {
      const q = String(l.quantite).replace(".", ",");
      return `${l.nom} ${l.unite === "kg" ? `${q} kg` : `${q} pc`}`;
    })
    .join(", ");
}

type Panneau = { mode: "paiement" } | { mode: "prise" } | { mode: "annuler"; transaction: Transaction } | null;

export function FicheClient({
  debtId,
  telephone,
  montantDu,
  historique,
  fruits,
}: {
  debtId: string;
  telephone: string | null;
  montantDu: number;
  historique: Transaction[];
  fruits: Fruit[];
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [message, setMessage] = useState<string>();

  function fermer(texte?: string) {
    setPanneau(null);
    if (texte) setMessage(texte);
  }

  // Les transactions d'annulation sont affichées sur la ligne qu'elles annulent.
  const lignes = historique.filter((t) => t.type !== "annulation");

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-4 rounded-3xl bg-orange-pale px-5 py-4 text-orange-fonce">
        <p className="text-sm font-bold">{montantDu > 0 ? "Il te doit" : "À jour"}</p>
        <p className="montant text-5xl leading-tight">{fcfa(montantDu)}</p>
        {telephone && <p className="text-sm font-semibold">{formaterTelephone(telephone)}</p>}
      </section>

      {message && (
        <p role="status" className="mx-4 mt-3 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setPanneau({ mode: "paiement" })}
          disabled={montantDu <= 0}
          className={`${classeBoutonPrincipal} text-base`}
        >
          Encaisser un paiement
        </button>
        <button
          type="button"
          onClick={() => setPanneau({ mode: "prise" })}
          className="flex h-14 items-center justify-center rounded-2xl bg-orange-pale text-base font-bold text-orange-fonce active:bg-orange/20"
        >
          Nouvelle prise
        </button>
      </div>

      <h2 className="px-4 pt-6 pb-1 text-sm font-bold text-encre-doux">Historique</h2>
      <ul className="pb-4">
        {lignes.map((t) => (
          <li key={t.id} className="flex min-h-[64px] items-center gap-3 border-b border-trait px-4 py-2">
            <span className={`min-w-0 flex-1 ${t.annulation ? "text-encre-doux line-through" : ""}`}>
              <span className="block text-base font-bold">
                {t.type === "prise" ? "Prise à crédit" : "Paiement"}
                {t.type === "prise" && t.detail?.length ? ` · ${detailTexte(t.detail)}` : ""}
              </span>
              <span className="block text-sm font-semibold text-encre-doux">
                {formatDate.format(new Date(t.date))} · {t.auteur}
              </span>
              {t.annulation && (
                <span className="block text-sm font-semibold text-alerte no-underline">
                  Annulée par {t.annulation.par} : « {t.annulation.raison} »
                </span>
              )}
            </span>
            <span
              className={`montant text-lg ${
                t.annulation ? "text-encre-doux line-through" : t.type === "prise" ? "text-orange-fonce" : "text-vert"
              }`}
            >
              {t.type === "prise" ? "+" : "−"} {fcfa(t.montant)}
            </span>
            {!t.annulation && (
              <button
                type="button"
                onClick={() => setPanneau({ mode: "annuler", transaction: t })}
                aria-label="Annuler cette ligne"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-encre-doux active:bg-gris"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v.01M12 12v.01M12 19v.01" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <Feuille
        ouvert={panneau !== null}
        onFermer={() => setPanneau(null)}
        titre={
          panneau?.mode === "paiement" ? "Encaisser un paiement" : panneau?.mode === "prise" ? "Nouvelle prise à crédit" : "Annuler"
        }
      >
        {panneau?.mode === "paiement" && <Paiement debtId={debtId} montantDu={montantDu} onSucces={fermer} />}
        {panneau?.mode === "prise" && <FormulairePrise debtId={debtId} fruits={fruits} onSucces={fermer} />}
        {panneau?.mode === "annuler" && (
          <Annulation debtId={debtId} transaction={panneau.transaction} onSucces={fermer} />
        )}
      </Feuille>
    </main>
  );
}

function Paiement({ debtId, montantDu, onSucces }: { debtId: string; montantDu: number; onSucces: (m: string) => void }) {
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await encaisserPaiement(debtId, prec, formData);
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <Champ
        label={`Montant payé (il doit ${fcfa(montantDu)})`}
        name="montant"
        inputMode="numeric"
        required
        defaultValue={montantDu}
        aide="Total ou une partie."
      />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Encaisser</BoutonEnvoyer>
    </form>
  );
}

function Annulation({
  debtId,
  transaction,
  onSucces,
}: {
  debtId: string;
  transaction: Transaction;
  onSucces: (m: string) => void;
}) {
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await annulerTransaction(
      { debtId, transactionId: transaction.id, montant: transaction.montant },
      prec,
      formData,
    );
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <p className="text-base font-semibold">
        {transaction.type === "prise" ? "Prise à crédit" : "Paiement"} de {fcfa(transaction.montant)} du{" "}
        {formatDate.format(new Date(transaction.date))}.
      </p>
      <Champ label="Pourquoi l'annuler ?" name="raison" required placeholder="Erreur de montant, mauvais client…" />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Annulation…">Annuler cette ligne</BoutonEnvoyer>
      <p className="text-sm font-semibold text-encre-doux">Rien n&apos;est supprimé : la ligne reste visible, barrée.</p>
    </form>
  );
}
