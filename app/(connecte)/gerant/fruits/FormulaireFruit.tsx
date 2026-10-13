"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, MessageFormulaire } from "@/components/formulaire";
import { FormeFruit } from "@/components/FormeFruit";
import { FORMES, LISTE_FORMES } from "@/lib/formes";
import type { EtatFormulaire, Fruit, Unite } from "@/lib/types";

type Action = (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;

const OPTIONS_UNITE: { valeur: Unite; libelle: string }[] = [
  { valeur: "kg", libelle: "Au kilo" },
  { valeur: "piece", libelle: "À la pièce" },
];

export function FormulaireFruit({
  action,
  fruit,
  libelleBouton,
  onSucces,
}: {
  action: Action;
  fruit?: Fruit;
  libelleBouton: string;
  onSucces: (message: string) => void;
}) {
  const [etat, envoyer] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await action(prec, formData);
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);

  return (
    <form action={envoyer} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-encre-doux">Son dessin</legend>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pt-1 pb-2">
          {LISTE_FORMES.map((forme) => (
            <label key={forme} className="flex-none cursor-pointer">
              <input
                type="radio"
                name="forme"
                value={forme}
                defaultChecked={(fruit?.forme ?? "autre") === forme}
                className="peer sr-only"
              />
              <span className="flex w-16 flex-col items-center gap-1 rounded-2xl p-1 text-xs font-bold text-encre-doux peer-checked:bg-orange-pale peer-checked:text-encre peer-focus-visible:ring-2 peer-focus-visible:ring-vert">
                <FormeFruit forme={forme} taille={48} />
                {FORMES[forme].libelle}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Champ
        label="Nom du fruit"
        name="nom"
        required
        defaultValue={fruit?.nom}
        placeholder="Mangue Kent"
        autoCapitalize="sentences"
      />

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-encre-doux">Tu le vends surtout</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gris p-1">
          {OPTIONS_UNITE.map((option) => (
            <label key={option.valeur} className="cursor-pointer">
              <input
                type="radio"
                name="unite_defaut"
                value={option.valeur}
                defaultChecked={(fruit?.unite_defaut ?? "kg") === option.valeur}
                className="peer sr-only"
              />
              <span className="flex h-12 items-center justify-center rounded-lg text-base font-bold text-encre-doux peer-checked:bg-fond peer-checked:text-encre peer-checked:shadow-[0_0_0_1px_var(--color-trait)] peer-focus-visible:ring-2 peer-focus-visible:ring-vert">
                {option.libelle}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Prix au kilo (F)" name="prix_kg" inputMode="numeric" defaultValue={fruit?.prix_kg ?? ""} />
          <Champ label="Prix à la pièce (F)" name="prix_piece" inputMode="numeric" defaultValue={fruit?.prix_piece ?? ""} />
        </div>
        <p className="mt-2 text-sm font-semibold text-encre-doux">
          Au moins un prix. Tu pourras le changer à chaque vente.
        </p>
      </div>

      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">{libelleBouton}</BoutonEnvoyer>
    </form>
  );
}
