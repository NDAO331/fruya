"use client";

import { useState } from "react";
import { RecuWhatsApp, type LigneRecu } from "@/components/RecuWhatsApp";
import { creerFacturePdf, numeroFacture } from "@/lib/facture-pdf";

// Facture PDF (PRD 4.7) : créée sur le téléphone, puis envoyée par le menu
// « Partager » d'Android (WhatsApp, puis le client). WhatsApp n'accepte pas
// qu'une app envoie un fichier directement à un numéro. Si le téléphone ne
// sait pas partager un fichier, la facture est téléchargée ; le reçu en
// message texte reste disponible.
export function FactureVente({
  venteId,
  date,
  etal,
  vendeur,
  lignes,
  total,
}: {
  venteId: string;
  date: Date;
  etal: string;
  vendeur: string;
  lignes: LigneRecu[];
  total: number;
}) {
  const [message, setMessage] = useState<string>();
  const [texte, setTexte] = useState(false);
  const numero = numeroFacture(venteId, date);

  async function envoyer() {
    setMessage(undefined);
    const pdf = creerFacturePdf({ numero, date, etal, vendeur, lignes, total });
    const fichier = new File([pdf], `Facture-${numero}.pdf`, { type: "application/pdf" });

    if (navigator.canShare?.({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier], title: `Facture ${numero}`, text: `Ta facture ${etal}. Jërëjëf !` });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setMessage("Le partage n'a pas marché. Réessaie.");
      }
      return;
    }

    // Repli : téléchargement du PDF, à joindre soi-même dans WhatsApp.
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(pdf);
    lien.download = fichier.name;
    lien.click();
    setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
    setMessage("Facture téléchargée. Ouvre WhatsApp et joins-la au message du client.");
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={envoyer}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vert-pale text-lg font-bold text-vert active:bg-vert/15"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        Envoyer la facture
      </button>
      {message && <p className="text-base font-semibold text-encre-doux">{message}</p>}
      {texte ? (
        <RecuWhatsApp etal={etal} lignes={lignes} total={total} date={date} ouvertDirectement />
      ) : (
        <button
          type="button"
          onClick={() => setTexte(true)}
          className="h-10 text-sm font-bold text-encre-doux underline-offset-4 active:underline"
        >
          Envoyer plutôt un message texte
        </button>
      )}
    </div>
  );
}
