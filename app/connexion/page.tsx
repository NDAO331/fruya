"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { connexion } from "@/app/actions/auth";
import { ClavierPin } from "@/components/ClavierPin";
import { ChampTelephone, classeBoutonPrincipal } from "@/components/formulaire";
import { formaterTelephone, normaliserTelephone } from "@/lib/telephone";
import { memoriserTelephone, useTelephoneMemorise } from "@/lib/telephone-memorise";

function Logo() {
  return (
    <Image src="/logo/fruya-logo-orange.svg" alt="Fruya" width={150} height={60} priority unoptimized />
  );
}

// Connexion en deux temps : le numéro (mémorisé sur le téléphone), puis le
// code PIN sur un pavé numérique.
export default function PageConnexion() {
  const telephone = useTelephoneMemorise();
  const [etat, action, enCours] = useActionState(connexion, null);
  const [erreurNumero, setErreurNumero] = useState<string>();

  function validerNumero(formData: FormData) {
    const numero = normaliserTelephone(String(formData.get("telephone") ?? ""));
    if (!numero) {
      setErreurNumero("Numéro invalide. Exemple : 77 123 45 67.");
      return;
    }
    setErreurNumero(undefined);
    memoriserTelephone(numero);
  }

  function envoyerPin(pin: string) {
    const formData = new FormData();
    formData.set("telephone", telephone ?? "");
    formData.set("pin", pin);
    startTransition(() => action(formData));
  }

  if (!telephone) {
    return (
      <main className="flex flex-1 flex-col px-5 pt-14 pb-6">
        <Logo />
        <h1 className="mt-6 text-3xl font-bold">Nanga def ?</h1>
        <p className="mt-1 text-lg font-semibold text-encre-doux">Entre ton numéro pour ouvrir ta caisse.</p>

        <form action={validerNumero} className="mt-8 flex flex-1 flex-col gap-4">
          <ChampTelephone autoFocus />
          {erreurNumero && <p role="alert" className="text-base font-semibold text-alerte">{erreurNumero}</p>}
          <div className="mt-auto flex flex-col gap-3">
            <button type="submit" className={classeBoutonPrincipal}>
              Continuer
            </button>
            <Link
              href="/inscription"
              className="flex h-14 items-center justify-center rounded-2xl text-lg font-bold active:bg-gris"
            >
              Ouvrir un nouvel étal
            </Link>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col pt-14">
      <div className="flex flex-col items-center px-5 text-center">
        <Logo />
        <p className="mt-5 text-2xl font-bold">{formaterTelephone(telephone)}</p>
        <button
          type="button"
          onClick={() => memoriserTelephone(null)}
          className="mt-1 h-10 px-3 text-base font-bold text-encre-doux underline-offset-4 active:underline"
        >
          Changer de numéro
        </button>
      </div>
      <ClavierPin titre="Ton code PIN" onComplet={envoyerPin} enCours={enCours} erreur={etat?.erreur} />
    </main>
  );
}
