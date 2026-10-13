"use client";

import { BoutonQuitter } from "@/components/BoutonQuitter";
import { dateLisible, etatAcces } from "@/lib/acces";

// Vérifie l'abonnement de l'étal avec l'heure du téléphone (PRD 4.8).
// La date de fin vient du serveur ; quand l'app s'ouvre sans réseau, c'est la
// dernière date connue (page gardée par le téléphone) qui sert : un étal
// expiré ne peut pas continuer indéfiniment hors-ligne.
export function GardeAcces({
  etal,
  estGerant,
  numeroPaiement,
  userId,
  children,
}: {
  etal: { date_fin_acces: string; bloque: boolean };
  estGerant: boolean;
  numeroPaiement: string | null;
  userId: string;
  children: React.ReactNode;
}) {
  const etat = etatAcces(etal);

  if (etat.statut === "coupe") {
    return (
      <main className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-alerte-pale">
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" fill="none" stroke="#B42318" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </span>
        {etat.motif === "bloque" ? (
          <>
            <h1 className="mt-5 text-2xl font-bold">Accès suspendu</h1>
            <p className="mt-2 text-lg font-semibold text-encre-doux">
              L&apos;accès de ton étal a été suspendu. Appelle Fruya{numeroPaiement ? ` au ${numeroPaiement}` : ""}.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold">Abonnement expiré</h1>
            <p className="mt-2 text-lg font-semibold text-encre-doux">
              Paie 3 000 F par Wave ou Orange Money{numeroPaiement ? ` au ${numeroPaiement}` : ""}, puis appelle-nous.
            </p>
          </>
        )}
        <p className="mt-4 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          Rien n&apos;est effacé : tout revient dès que le paiement est enregistré.
        </p>
        <div className="mt-6 text-left">
          <BoutonQuitter userId={userId} />
        </div>
      </main>
    );
  }

  const bandeau =
    etat.statut === "grace"
      ? { texte: `Ton abonnement a expiré. Paie avant le ${dateLisible(etat.limite)} pour garder l'accès.`, fort: true }
      : etat.statut === "bientot" && estGerant
        ? { texte: `Ton abonnement expire le ${dateLisible(etat.fin)}. Pense à payer 3 000 F.`, fort: false }
        : null;

  return (
    <>
      {bandeau && (
        <p
          role="status"
          className={`px-4 py-2 text-sm font-bold ${bandeau.fort ? "bg-alerte text-white" : "bg-orange-pale text-orange-fonce"}`}
        >
          {bandeau.texte}
          {numeroPaiement && bandeau.fort ? ` Wave ou Orange Money au ${numeroPaiement}.` : ""}
        </p>
      )}
      {children}
    </>
  );
}
