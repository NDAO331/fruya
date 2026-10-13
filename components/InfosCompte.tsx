import { BoutonQuitter } from "@/components/BoutonQuitter";
import { initiales } from "@/components/EnTete";
import { formaterTelephone } from "@/lib/telephone";
import type { Profil } from "@/lib/types";

// Fiche du compte connecté + bouton pour quitter l'app.
export function InfosCompte({
  profil,
  lignes,
}: {
  profil: Profil;
  lignes: { libelle: string; valeur: string }[];
}) {
  return (
    <>
      <section className="flex items-center gap-4 px-4 py-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-orange text-xl font-bold">
          {initiales(profil.nom)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-2xl font-bold">{profil.nom}</span>
          <span className="block text-base font-semibold text-encre-doux">{formaterTelephone(profil.telephone)}</span>
        </span>
      </section>

      <dl className="mt-2 border-t border-trait">
        {lignes.map((ligne) => (
          <div key={ligne.libelle} className="flex min-h-14 items-center justify-between gap-4 border-b border-trait px-4">
            <dt className="text-base font-semibold text-encre-doux">{ligne.libelle}</dt>
            <dd className="text-right text-base font-bold">{ligne.valeur}</dd>
          </div>
        ))}
      </dl>

      <BoutonQuitter userId={profil.id} />
    </>
  );
}
