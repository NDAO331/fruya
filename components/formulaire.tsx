"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import type { EtatFormulaire } from "@/lib/types";

// Éléments de formulaire façon app mobile : champs pleins gris clair,
// grandes zones tactiles, un seul gros bouton vert.

export const classeChamp =
  "h-14 w-full rounded-xl bg-gris px-4 text-lg font-semibold text-encre outline-none placeholder:font-medium placeholder:text-encre-doux/70 focus:ring-2 focus:ring-vert";

export function Champ({
  label,
  aide,
  ...props
}: ComponentProps<"input"> & { label: string; aide?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-encre-doux">{label}</span>
      <input className={classeChamp} {...props} />
      {aide && <span className="text-sm font-semibold text-encre-doux">{aide}</span>}
    </label>
  );
}

export function ChampTelephone({ label = "Numéro de téléphone", ...props }: ComponentProps<"input"> & { label?: string }) {
  return (
    <Champ
      label={label}
      name="telephone"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      required
      placeholder="77 123 45 67"
      {...props}
    />
  );
}

export const classeBoutonPrincipal =
  "flex h-14 w-full items-center justify-center rounded-2xl bg-vert px-4 text-lg font-bold text-white active:bg-vert-fonce disabled:opacity-60";

export function BoutonEnvoyer({
  children,
  enCours = "Un instant…",
}: {
  children: React.ReactNode;
  enCours?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classeBoutonPrincipal}>
      {pending ? enCours : children}
    </button>
  );
}

export function MessageFormulaire({ etat }: { etat: EtatFormulaire }) {
  if (etat?.erreur) {
    return (
      <p role="alert" className="rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
        {etat.erreur}
      </p>
    );
  }
  if (etat?.succes) {
    return (
      <p role="status" className="rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
        {etat.succes}
      </p>
    );
  }
  return null;
}
