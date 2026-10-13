"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { inscription } from "@/app/actions/auth";
import { ClavierPin } from "@/components/ClavierPin";
import { Champ, ChampTelephone, classeBoutonPrincipal, MessageFormulaire } from "@/components/formulaire";
import { normaliserTelephone } from "@/lib/telephone";
import { memoriserTelephone } from "@/lib/telephone-memorise";
import type { EtatFormulaire } from "@/lib/types";

type Infos = { nom: string; nom_etal: string; telephone: string };
type Etape = "infos" | "pin" | "confirmation";

// Inscription d'un gérant en trois écrans : ses infos, son code PIN, la
// confirmation du code PIN.
export default function PageInscription() {
  const [etape, setEtape] = useState<Etape>("infos");
  const [infos, setInfos] = useState<Infos>({ nom: "", nom_etal: "", telephone: "" });
  const [pin, setPin] = useState("");
  const [erreurLocale, setErreurLocale] = useState<string>();

  // Une erreur serveur (ex. numéro déjà utilisé) ramène au premier écran.
  const [etat, action, enCours] = useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await inscription(prec, formData);
    if (resultat?.erreur) setEtape("infos");
    return resultat;
  }, null);

  function validerInfos(formData: FormData) {
    const suivant = {
      nom: String(formData.get("nom") ?? "").trim(),
      nom_etal: String(formData.get("nom_etal") ?? "").trim(),
      telephone: String(formData.get("telephone") ?? ""),
    };
    setInfos(suivant);
    if (!suivant.nom || !suivant.nom_etal) {
      setErreurLocale("Écris ton nom et le nom de ton étal.");
      return;
    }
    if (!normaliserTelephone(suivant.telephone)) {
      setErreurLocale("Numéro invalide. Exemple : 77 123 45 67.");
      return;
    }
    setErreurLocale(undefined);
    setEtape("pin");
  }

  function confirmerPin(confirmation: string) {
    if (confirmation !== pin) {
      setErreurLocale("Les deux codes ne sont pas pareils. Recommence.");
      setPin("");
      setEtape("pin");
      return;
    }
    setErreurLocale(undefined);
    const formData = new FormData();
    Object.entries(infos).forEach(([cle, valeur]) => formData.set(cle, valeur));
    formData.set("pin", pin);
    formData.set("pin_confirmation", confirmation);
    memoriserTelephone(normaliserTelephone(infos.telephone));
    startTransition(() => action(formData));
  }

  if (etape === "infos") {
    return (
      <main className="flex flex-1 flex-col px-5 pt-6 pb-6">
        <Link
          href="/connexion"
          aria-label="Retour"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-gris"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Ouvre ton étal</h1>
        <p className="mt-1 text-lg font-semibold text-encre-doux">14 jours gratuits, puis 3 000 F par mois.</p>

        <form action={validerInfos} className="mt-8 flex flex-1 flex-col gap-4">
          <Champ label="Ton nom" name="nom" autoComplete="name" required defaultValue={infos.nom} />
          <Champ label="Nom de ton étal" name="nom_etal" required placeholder="Fruits de Fatou" defaultValue={infos.nom_etal} />
          <ChampTelephone label="Ton numéro" defaultValue={infos.telephone} />
          {erreurLocale && <p role="alert" className="text-base font-semibold text-alerte">{erreurLocale}</p>}
          <MessageFormulaire etat={etat} />
          <button type="submit" className={`${classeBoutonPrincipal} mt-auto`}>
            Continuer
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col pt-6">
      <div className="px-5">
        <button
          type="button"
          onClick={() => setEtape(etape === "confirmation" ? "pin" : "infos")}
          aria-label="Retour"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-gris"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="mt-4 text-3xl font-bold">
          {etape === "pin" ? "Choisis ton code PIN" : "Confirme ton code PIN"}
        </h1>
        <p className="mt-1 text-lg font-semibold text-encre-doux">
          {etape === "pin" ? "6 chiffres, à ne donner à personne." : "Tape-le encore une fois."}
        </p>
      </div>
      <ClavierPin
        key={etape}
        titre={etape === "pin" ? "Nouveau code" : "Même code"}
        enCours={enCours}
        erreur={erreurLocale}
        onComplet={(code) => {
          if (etape === "pin") {
            setPin(code);
            setErreurLocale(undefined);
            setEtape("confirmation");
          } else {
            confirmerPin(code);
          }
        }}
      />
    </main>
  );
}
