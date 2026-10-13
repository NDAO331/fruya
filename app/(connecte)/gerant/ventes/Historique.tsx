"use client";

import { useActionState, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { FormeFruit } from "@/components/FormeFruit";
import { BoutonEnvoyer, Champ, MessageFormulaire } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import type { Forme } from "@/lib/formes";
import { LIBELLE_PAIEMENT, type EtatFormulaire, type Paiement, type Unite } from "@/lib/types";
import { annuler } from "./actions";

type Annulation = { raison: string; par: string } | null;

export type Mouvement =
  | {
      type: "vente";
      id: string;
      date: string;
      auteur: string;
      montant: number;
      vocale: boolean;
      paiement: Paiement;
      lignes: { nom: string; forme: Forme; quantite: number; unite: Unite; prix_unitaire: number }[];
      annulation: Annulation;
    }
  | {
      type: "perte";
      id: string;
      date: string;
      auteur: string;
      nom: string;
      forme: Forme;
      quantite: number;
      unite: Unite;
      raison: string | null;
      photo: string | null;
      photoAttendue: boolean;
      annulation: Annulation;
    };

const formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });

function quantite(q: number, unite: Unite): string {
  const texte = String(q).replace(".", ",");
  return unite === "kg" ? `${texte} kg` : `${texte} ${q > 1 ? "pièces" : "pièce"}`;
}

function resumeVente(m: Extract<Mouvement, { type: "vente" }>): string {
  return m.lignes.map((l) => `${l.nom} ${quantite(l.quantite, l.unite)}`).join(", ");
}

export function Historique({ mouvements }: { mouvements: Mouvement[] }) {
  const [ouvert, setOuvert] = useState<Mouvement | null>(null);
  const [message, setMessage] = useState<string>();

  const ventes = mouvements.filter((m) => m.type === "vente" && !m.annulation) as Extract<Mouvement, { type: "vente" }>[];
  const pertes = mouvements.filter((m) => m.type === "perte" && !m.annulation);
  const total = ventes.reduce((s, v) => s + v.montant, 0);

  // Total par vendeur (PRD 3.2).
  const parVendeur = new Map<string, number>();
  for (const v of ventes) parVendeur.set(v.auteur, (parVendeur.get(v.auteur) ?? 0) + v.montant);

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-vert px-4 py-3 text-white">
          <p className="text-xs font-bold text-orange-clair">Ventes</p>
          <p className="montant text-2xl leading-tight">{fcfa(total)}</p>
          <p className="text-xs font-semibold text-white/75">
            {ventes.length} {ventes.length > 1 ? "ventes" : "vente"}
          </p>
        </div>
        <div className="rounded-2xl bg-alerte-pale px-4 py-3 text-alerte">
          <p className="text-xs font-bold">Pertes</p>
          <p className="montant text-2xl leading-tight">{pertes.length}</p>
          <p className="text-xs font-semibold">{pertes.length > 1 ? "déclarées" : "déclarée"}</p>
        </div>
      </section>

      {parVendeur.size > 1 && (
        <ul className="mx-4 mt-2 rounded-2xl bg-gris px-4 py-2">
          {[...parVendeur].map(([auteur, montant]) => (
            <li key={auteur} className="flex justify-between py-1 text-base font-semibold">
              <span>{auteur}</span>
              <span className="montant">{fcfa(montant)}</span>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p role="status" className="mx-4 mt-3 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      {mouvements.length === 0 ? (
        <p className="px-4 py-10 text-center text-lg font-semibold text-encre-doux">Rien ce jour-là.</p>
      ) : (
        <ul className="mt-3 pb-4">
          {mouvements.map((m) => (
            <li key={`${m.type}-${m.id}`}>
              <button
                type="button"
                onClick={() => setOuvert(m)}
                className="flex min-h-[68px] w-full items-center gap-3 border-b border-trait px-4 py-2 text-left active:bg-gris"
              >
                <span className="w-11 flex-none text-sm font-bold text-encre-doux">{formatHeure.format(new Date(m.date))}</span>
                {m.type === "vente" ? (
                  <FormeFruit forme={m.lignes[0]?.forme ?? "autre"} taille={36} />
                ) : (
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-alerte-pale text-alerte">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                <span className={`min-w-0 flex-1 ${m.annulation ? "text-encre-doux line-through" : ""}`}>
                  <span className="block truncate text-base font-bold">
                    {m.type === "vente" ? resumeVente(m) : `Perte : ${m.nom} ${quantite(m.quantite, m.unite)}`}
                  </span>
                  <span className="block truncate text-sm font-semibold text-encre-doux">
                    {m.auteur}
                    {m.annulation ? " · annulée" : m.type === "perte" && m.raison ? ` · ${m.raison}` : ""}
                    {m.type === "vente" && m.paiement !== "especes" ? ` · ${LIBELLE_PAIEMENT[m.paiement]}` : ""}
                    {m.type === "vente" && m.vocale ? " · dictée" : ""}
                  </span>
                </span>
                {m.type === "vente" && (
                  <span className={`montant text-lg ${m.annulation ? "text-encre-doux line-through" : ""}`}>{fcfa(m.montant)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Feuille
        ouvert={ouvert !== null}
        onFermer={() => setOuvert(null)}
        titre={ouvert?.type === "perte" ? "Perte" : "Vente"}
      >
        {ouvert && (
          <Detail
            key={`${ouvert.type}-${ouvert.id}`}
            mouvement={ouvert}
            onAnnule={(texte) => {
              setOuvert(null);
              setMessage(texte);
            }}
          />
        )}
      </Feuille>
    </main>
  );
}

function Detail({ mouvement: m, onAnnule }: { mouvement: Mouvement; onAnnule: (message: string) => void }) {
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await annuler({ type: m.type, id: m.id }, prec, formData);
    if (resultat?.succes) onAnnule(resultat.succes);
    return resultat;
  }, null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-semibold text-encre-doux">
        {formatHeure.format(new Date(m.date))} · par {m.auteur}
      </p>

      {m.type === "vente" ? (
        <div className="rounded-2xl bg-gris px-4 py-2">
          {m.lignes.map((l, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <FormeFruit forme={l.forme} taille={36} />
              <span className="flex-1">
                <span className="block font-bold">{l.nom}</span>
                <span className="block text-sm font-semibold text-encre-doux">
                  {quantite(l.quantite, l.unite)} à {fcfa(l.prix_unitaire)}
                </span>
              </span>
            </div>
          ))}
          <p className="flex justify-between border-t border-trait pt-2 pb-1 text-lg font-bold">
            <span>Total</span>
            <span className="montant">{fcfa(m.montant)}</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {m.photo ? (
            // Lien temporaire vers le stockage privé : next/image non utilisé ici.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.photo} alt={`Photo de la perte : ${m.nom}`} className="max-h-72 w-full rounded-2xl bg-gris object-contain" />
          ) : (
            <p className="rounded-2xl bg-orange-pale px-4 py-3 text-base font-semibold text-orange-fonce">
              {m.photoAttendue ? "Photo pas encore reçue (le téléphone l'enverra au retour du réseau)." : "Photo indisponible."}
            </p>
          )}
          <p className="text-lg font-bold">
            {m.nom} · {quantite(m.quantite, m.unite)}
            {m.raison ? ` · ${m.raison}` : ""}
          </p>
        </div>
      )}

      {m.annulation ? (
        <p className="rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
          Annulée par {m.annulation.par} : « {m.annulation.raison} »
        </p>
      ) : (
        <form action={envoyer} className="flex flex-col gap-3 border-t border-trait pt-4">
          <Champ label="Annuler : pourquoi ?" name="raison" required placeholder="Erreur de saisie, client parti…" />
          <MessageFormulaire etat={etat?.erreur ? etat : null} />
          <BoutonEnvoyer enCours="Annulation…">{m.type === "vente" ? "Annuler cette vente" : "Annuler cette perte"}</BoutonEnvoyer>
          <p className="text-sm font-semibold text-encre-doux">
            Rien n&apos;est supprimé : l&apos;annulation reste visible avec sa raison.
          </p>
        </form>
      )}
    </div>
  );
}
