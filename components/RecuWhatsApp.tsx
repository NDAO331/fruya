"use client";

import { useState } from "react";
import { classeChamp } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import { normaliserTelephone } from "@/lib/telephone";
import type { Unite } from "@/lib/types";

export type LigneRecu = { nom: string; quantite: number; unite: Unite; prix_unitaire: number; montant: number };

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

function quantite(q: number, unite: Unite): string {
  const texte = String(q).replace(".", ",");
  return unite === "kg" ? `${texte} kg` : `${texte} ${q > 1 ? "pièces" : "pièce"}`;
}

function texteRecu(etal: string, lignes: LigneRecu[], total: number, date: Date): string {
  return [
    `*Reçu – ${etal}*`,
    formatDate.format(date),
    "",
    ...lignes.map((l) => `${l.nom} : ${quantite(l.quantite, l.unite)} × ${fcfa(l.prix_unitaire)} = ${fcfa(l.montant)}`),
    "",
    `*Total : ${fcfa(total)}*`,
    "Jërëjëf !",
  ].join("\n");
}

type Contacts = {
  select: (props: string[], options?: { multiple?: boolean }) => Promise<{ tel?: string[] }[]>;
};

// Reçu en message texte (repli de la facture PDF) : ouvre WhatsApp avec le message pré-rempli,
// vers le numéro du client (tapé, ou choisi dans les contacts si le
// téléphone le permet). Aucune API WhatsApp : simple lien wa.me.
export function RecuWhatsApp({
  etal,
  lignes,
  total,
  date,
  ouvertDirectement = false,
}: {
  etal: string;
  lignes: LigneRecu[];
  total: number;
  date: Date;
  ouvertDirectement?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertDirectement);
  const [numero, setNumero] = useState("");
  const [erreur, setErreur] = useState<string>();

  const contacts = typeof navigator !== "undefined" ? (navigator as Navigator & { contacts?: Contacts }).contacts : undefined;
  const telephone = normaliserTelephone(numero);
  const lien = telephone ? `https://wa.me/${telephone}?text=${encodeURIComponent(texteRecu(etal, lignes, total, date))}` : null;

  async function choisirContact() {
    try {
      const [choix] = await contacts!.select(["tel"], { multiple: false });
      if (choix?.tel?.[0]) setNumero(choix.tel[0]);
    } catch {
      // Choix annulé.
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vert-pale text-lg font-bold text-vert active:bg-vert/15"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.9-1-.9.8c-.9-.4-1.9-1.4-2.3-2.3l.8-.9-1-1.9z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        Envoyer le reçu
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 text-left">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-encre-doux">Numéro du client</span>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="tel"
            autoFocus
            value={numero}
            onChange={(e) => {
              setNumero(e.target.value);
              setErreur(undefined);
            }}
            placeholder="77 123 45 67"
            className={classeChamp}
          />
          {contacts && (
            <button
              type="button"
              onClick={choisirContact}
              className="h-14 flex-none rounded-xl bg-gris px-4 text-sm font-bold active:bg-trait"
            >
              Contacts
            </button>
          )}
        </div>
      </label>
      {erreur && <p className="text-base font-semibold text-alerte">{erreur}</p>}
      {typeof navigator !== "undefined" && !navigator.onLine ? (
        <p className="rounded-xl bg-orange-pale px-4 py-3 text-base font-semibold text-orange-fonce">
          Il faut du réseau pour envoyer le reçu.
        </p>
      ) : (
        <a
          href={lien ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!lien) {
              e.preventDefault();
              setErreur("Numéro invalide. Exemple : 77 123 45 67.");
            }
          }}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-vert text-lg font-bold text-white active:bg-vert-fonce"
        >
          Ouvrir WhatsApp
        </a>
      )}
    </div>
  );
}
