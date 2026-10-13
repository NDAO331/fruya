"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FormeFruit } from "@/components/FormeFruit";
import { compresserPhoto, enregistrerPerteLocale } from "@/lib/hors-ligne/pertes";
import type { Fruit, Unite } from "@/lib/types";
import { lireNombre, PaveNumerique, saisir } from "./PaveNumerique";

const RAISONS = ["Pourri", "Abîmé", "Cassé"];

function quantiteAffichee(quantite: number, unite: Unite): string {
  const texte = String(quantite).replace(".", ",");
  if (unite === "kg") return `${texte} kg`;
  return `${texte} ${quantite > 1 ? "pièces" : "pièce"}`;
}

// Déclaration d'une perte : la photo est déjà prise (l'appareil photo s'ouvre
// en touchant « Perte »), on choisit le fruit, la quantité, puis on confirme.
export function PerteFeuille({
  photo,
  fruits,
  stallId,
  userId,
  onReprendrePhoto,
  onFermer,
}: {
  photo: Blob;
  fruits: Fruit[];
  stallId: string;
  userId: string;
  onReprendrePhoto: (photo: Blob) => void;
  onFermer: () => void;
}) {
  const appareilPhoto = useRef<HTMLInputElement>(null);
  const [fruit, setFruit] = useState<Fruit | null>(fruits.length === 1 ? fruits[0] : null);
  const [unite, setUnite] = useState<Unite>(fruits.length === 1 ? fruits[0].unite_defaut : "kg");
  const [quantite, setQuantite] = useState("");
  const [raison, setRaison] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string>();
  const [notee, setNotee] = useState<string | null>(null);

  const apercu = useMemo(() => URL.createObjectURL(photo), [photo]);
  useEffect(() => () => URL.revokeObjectURL(apercu), [apercu]);

  const unitesPossibles = fruit
    ? (["kg", "piece"] as Unite[]).filter((u) => (u === "kg" ? fruit.prix_kg : fruit.prix_piece) !== null)
    : [];

  function choisirFruit(f: Fruit) {
    setFruit(f);
    setUnite(f.unite_defaut);
    setQuantite("");
    setErreur(undefined);
  }

  async function noter() {
    const q = lireNombre(quantite);
    if (!fruit) return setErreur("Choisis le fruit.");
    if (q <= 0) return setErreur("Tape la quantité perdue.");
    const resume = [fruit.nom, quantiteAffichee(q, unite), raison].filter(Boolean).join(" · ");
    await enregistrerPerteLocale({
      stall_id: stallId,
      user_id: userId,
      product_id: fruit.id,
      quantite: q,
      unite,
      raison,
      resume,
      photo,
    });
    setNotee(resume);
  }

  if (notee) {
    return (
      <div className="flex flex-col items-center pb-2 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-alerte-pale">
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#B42318" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-4 text-2xl font-bold">Perte notée</p>
        <p className="mt-1 text-base font-semibold text-encre-doux">{notee}</p>
        {typeof navigator !== "undefined" && !navigator.onLine && (
          <p className="mt-3 rounded-full bg-orange-pale px-3 py-1 text-sm font-bold text-orange-fonce">
            Pas de réseau : la photo partira plus tard
          </p>
        )}
        <button
          type="button"
          onClick={onFermer}
          autoFocus
          className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-vert text-lg font-bold text-white active:bg-vert-fonce"
        >
          Retour à la caisse
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* Aperçu local (blob) : next/image ne s'applique pas ici. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={apercu} alt="Photo de la perte" className="h-20 w-20 flex-none rounded-xl object-cover" />
        <input
          ref={appareilPhoto}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (e) => {
            const fichier = e.target.files?.[0];
            e.target.value = "";
            if (fichier) onReprendrePhoto(await compresserPhoto(fichier));
          }}
        />
        <button
          type="button"
          onClick={() => appareilPhoto.current?.click()}
          className="h-11 rounded-full bg-gris px-4 text-sm font-bold active:bg-trait"
        >
          Reprendre la photo
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-encre-doux">Quel fruit ?</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {fruits.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={fruit?.id === f.id}
              onClick={() => choisirFruit(f)}
              className={`flex h-12 flex-none items-center gap-2 rounded-full pr-4 pl-1 text-base font-bold ${
                fruit?.id === f.id ? "bg-alerte-pale text-alerte ring-2 ring-alerte" : "bg-gris"
              }`}
            >
              <FormeFruit forme={f.forme} taille={40} />
              {f.nom}
            </button>
          ))}
        </div>
      </div>

      {fruit && (
        <>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border-2 border-alerte bg-fond px-3 py-2">
              <span className="block text-xs font-bold text-encre-doux">Quantité perdue</span>
              <span className="montant block text-3xl leading-tight">
                {quantite || "0"} <span className="text-lg">{unite === "kg" ? "kg" : "pièce"}</span>
              </span>
            </div>
            {unitesPossibles.length > 1 && (
              <div className="flex flex-col gap-1 rounded-xl bg-gris p-1">
                {unitesPossibles.map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={unite === u}
                    onClick={() => {
                      setUnite(u);
                      if (u === "piece") setQuantite((v) => v.split(",")[0]);
                    }}
                    className={`h-8 rounded-lg px-3 text-sm font-bold ${unite === u ? "bg-fond" : "text-encre-doux"}`}
                  >
                    {u === "kg" ? "kg" : "pièce"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {RAISONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={raison === r}
                onClick={() => setRaison(raison === r ? null : r)}
                className={`h-10 flex-1 rounded-full text-sm font-bold ${
                  raison === r ? "bg-encre text-white" : "bg-gris text-encre-doux"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <PaveNumerique
            virgule={unite === "kg"}
            onTouche={(t) => {
              setErreur(undefined);
              setQuantite((v) => saisir(v, t, { virgule: unite === "kg", max: 6 }));
            }}
          />
        </>
      )}

      <p role="alert" className="min-h-6 text-center text-base font-semibold text-alerte">
        {erreur}
      </p>

      <button
        type="button"
        onClick={noter}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-alerte text-lg font-bold text-white active:bg-alerte/85"
      >
        Noter la perte
      </button>
    </div>
  );
}
