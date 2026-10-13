"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, ChampTelephone, MessageFormulaire } from "@/components/formulaire";
import type { EtatFormulaire } from "@/lib/types";
import { creerVendeur } from "./actions";

export function FormulaireVendeur({ onSucces }: { onSucces: (message: string) => void }) {
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await creerVendeur(prec, formData);
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <Champ label="Son nom" name="nom" required autoComplete="off" />
      <ChampTelephone label="Son numéro" />
      <Champ
        label="Son code PIN"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d{6}"
        maxLength={6}
        minLength={6}
        required
        aide="6 chiffres. Donne-le-lui en main propre."
      />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Création…">Créer son compte</BoutonEnvoyer>
    </form>
  );
}
