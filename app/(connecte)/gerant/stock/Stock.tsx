"use client";

import { useActionState, useState } from "react";
import { Feuille } from "@/components/Feuille";
import { FormeFruit } from "@/components/FormeFruit";
import { BoutonEnvoyer, Champ, classeBoutonPrincipal, classeChamp, MessageFormulaire } from "@/components/formulaire";
import { fcfa } from "@/lib/format";
import type { Forme } from "@/lib/formes";
import type { EtatFormulaire, Unite } from "@/lib/types";
import { ajouterArrivage, annulerArrivage, changerSeuil, faireInventaire, type ResultatInventaire } from "./actions";

export type LigneStock = {
  id: string;
  nom: string;
  forme: Forme;
  unite: Unite;
  stock: number;
  seuil: number | null;
  dernierInventaire: string | null;
  suivi: boolean; // au moins un arrivage ou un inventaire
};

export type Arrivage = {
  id: string;
  product_id: string;
  date: string;
  quantite: number;
  unite: Unite;
  prix_achat_total: number;
  statut: "validee" | "annulee";
  raison_annulation: string | null;
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Dakar" });

export function quantiteStock(q: number, unite: Unite): string {
  const arrondi = Math.round(q * 10) / 10;
  const texte = String(arrondi).replace(".", ",");
  return unite === "kg" ? `${texte} kg` : `${texte} ${Math.abs(arrondi) > 1 ? "pièces" : "pièce"}`;
}

type Panneau = { mode: "arrivage"; fruit: LigneStock | null } | { mode: "inventaire" } | { mode: "fruit"; fruit: LigneStock } | null;

export function Stock({ lignes, arrivages }: { lignes: LigneStock[]; arrivages: Arrivage[] }) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [message, setMessage] = useState<string>();
  const fermer = (texte?: string) => {
    setPanneau(null);
    if (texte) setMessage(texte);
  };

  const bas = lignes.filter((l) => l.suivi && l.seuil !== null && l.stock <= l.seuil);

  return (
    <main className="flex flex-1 flex-col">
      {bas.length > 0 && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
          Stock bas : {bas.map((l) => `${l.nom} (${quantiteStock(l.stock, l.unite)})`).join(", ")}
        </p>
      )}
      {message && (
        <p role="status" className="mx-4 mb-2 rounded-xl bg-vert-pale px-4 py-3 text-base font-semibold text-vert">
          {message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <button type="button" onClick={() => setPanneau({ mode: "arrivage", fruit: null })} className={`${classeBoutonPrincipal} text-base`}>
          Nouvel arrivage
        </button>
        <button
          type="button"
          onClick={() => setPanneau({ mode: "inventaire" })}
          className="flex h-14 items-center justify-center rounded-2xl bg-orange-pale text-base font-bold text-orange-fonce active:bg-orange/20"
        >
          Inventaire du soir
        </button>
      </div>

      <ul>
        {lignes.map((l) => {
          const alerte = l.suivi && l.seuil !== null && l.stock <= l.seuil;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setPanneau({ mode: "fruit", fruit: l })}
                className="flex h-[68px] w-full items-center gap-3 border-b border-trait px-4 text-left active:bg-gris"
              >
                <FormeFruit forme={l.forme} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{l.nom}</span>
                  <span className="block truncate text-sm font-semibold text-encre-doux">
                    {!l.suivi
                      ? "Pas encore suivi : note un arrivage"
                      : l.dernierInventaire
                        ? `Compté le ${formatDate.format(new Date(l.dernierInventaire))}`
                        : "Jamais compté"}
                  </span>
                </span>
                {l.suivi && (
                  <span className="text-right">
                    <span className={`montant block text-xl leading-none ${l.stock < 0 || alerte ? "text-alerte" : ""}`}>
                      {quantiteStock(l.stock, l.unite)}
                    </span>
                    {l.stock < 0 ? (
                      <span className="block text-xs font-bold text-alerte">arrivage oublié ?</span>
                    ) : (
                      alerte && <span className="block text-xs font-bold text-alerte">stock bas</span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-4 py-4 text-sm font-semibold text-encre-doux">
        Stock = dernier inventaire + arrivages − ventes − pertes, dans l&apos;unité du fruit. Les ventes faites hors-ligne
        sont déduites à leur envoi.
      </p>

      <Feuille
        ouvert={panneau !== null}
        onFermer={() => setPanneau(null)}
        titre={panneau?.mode === "inventaire" ? "Inventaire du soir" : panneau?.mode === "fruit" ? panneau.fruit.nom : "Nouvel arrivage"}
      >
        {panneau?.mode === "arrivage" && <FormArrivage lignes={lignes} fruitInitial={panneau.fruit} onSucces={fermer} />}
        {panneau?.mode === "inventaire" && <FormInventaire lignes={lignes} />}
        {panneau?.mode === "fruit" && (
          <DetailFruit
            fruit={panneau.fruit}
            arrivages={arrivages.filter((a) => a.product_id === panneau.fruit.id)}
            onArrivage={() => setPanneau({ mode: "arrivage", fruit: panneau.fruit })}
            onSucces={fermer}
          />
        )}
      </Feuille>
    </main>
  );
}

function useActionPanneau(action: (e: EtatFormulaire, f: FormData) => Promise<EtatFormulaire>, onSucces: (m: string) => void) {
  return useActionState(async (prec: EtatFormulaire, formData: FormData) => {
    const resultat = await action(prec, formData);
    if (resultat?.succes) onSucces(resultat.succes);
    return resultat;
  }, null);
}

function FormArrivage({
  lignes,
  fruitInitial,
  onSucces,
}: {
  lignes: LigneStock[];
  fruitInitial: LigneStock | null;
  onSucces: (m: string) => void;
}) {
  const [fruit, setFruit] = useState<LigneStock | null>(fruitInitial);
  const [quantite, setQuantite] = useState("");
  const [prix, setPrix] = useState("");

  if (!fruit) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-encre-doux">Quel fruit est arrivé ?</p>
        {lignes.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setFruit(l)}
            className="flex h-14 items-center gap-3 rounded-2xl bg-gris px-3 text-left text-lg font-bold active:bg-trait"
          >
            <FormeFruit forme={l.forme} taille={40} />
            {l.nom}
          </button>
        ))}
      </div>
    );
  }

  return <FormArrivageFruit fruit={fruit} quantite={quantite} prix={prix} setQuantite={setQuantite} setPrix={setPrix} onSucces={onSucces} />;
}

function FormArrivageFruit({
  fruit,
  quantite,
  prix,
  setQuantite,
  setPrix,
  onSucces,
}: {
  fruit: LigneStock;
  quantite: string;
  prix: string;
  setQuantite: (v: string) => void;
  setPrix: (v: string) => void;
  onSucces: (m: string) => void;
}) {
  const [etat, envoyer] = useActionPanneau(ajouterArrivage.bind(null, fruit.id), onSucces);
  const q = Number(quantite.replace(",", "."));
  const p = Number(prix.replace(/\s/g, ""));
  const moyen = q > 0 && p > 0 ? Math.round(p / q) : null;

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <FormeFruit forme={fruit.forme} />
        <p className="text-xl font-bold">{fruit.nom}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Champ
          label={fruit.unite === "kg" ? "Quantité reçue (kg)" : "Quantité reçue (pièces)"}
          name="quantite"
          inputMode="decimal"
          required
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
        />
        <Champ
          label="Prix d'achat total (F)"
          name="prix_achat_total"
          inputMode="numeric"
          required
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
        />
      </div>
      {moyen !== null && (
        <p className="text-base font-semibold text-encre-doux">
          Soit {fcfa(moyen)} {fruit.unite === "kg" ? "le kg" : "la pièce"} à l&apos;achat.
        </p>
      )}
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Noter l&apos;arrivage</BoutonEnvoyer>
    </form>
  );
}

function FormInventaire({ lignes }: { lignes: LigneStock[] }) {
  const [etat, envoyer] = useActionState(faireInventaire, null);
  const nom = (id: string) => lignes.find((l) => l.id === id)?.nom ?? "?";

  if (etat?.resultats) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-encre-doux">Inventaire enregistré. Écarts avec le stock calculé :</p>
        <ul>
          {etat.resultats.map((r: ResultatInventaire) => {
            const ecart = Number(r.ecart);
            return (
              <li key={r.product_id} className="flex items-center justify-between border-b border-trait py-3">
                <span>
                  <span className="block text-base font-bold">{nom(r.product_id)}</span>
                  <span className="block text-sm font-semibold text-encre-doux">
                    Compté {quantiteStock(Number(r.quantite_comptee), r.unite)} · calculé {quantiteStock(Number(r.quantite_theorique), r.unite)}
                  </span>
                </span>
                <span className={`montant text-lg ${ecart === 0 ? "text-vert" : ecart < 0 ? "text-alerte" : "text-orange-fonce"}`}>
                  {ecart === 0 ? "Juste" : `${ecart > 0 ? "+" : "−"} ${quantiteStock(Math.abs(ecart), r.unite)}`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-semibold text-encre-doux">
          Un écart négatif peut venir d&apos;une perte non déclarée ou d&apos;une vente non notée. Le compte devient le nouveau
          point de départ du stock.
        </p>
      </div>
    );
  }

  return (
    <form action={envoyer} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-encre-doux">Compte ce qui reste. Laisse vide un fruit que tu ne comptes pas.</p>
      {lignes.map((l) => (
        <label key={l.id} className="flex items-center gap-3">
          <FormeFruit forme={l.forme} taille={40} />
          <span className="flex-1 text-base font-bold">{l.nom}</span>
          <input
            name={`compte:${l.id}`}
            inputMode="decimal"
            aria-label={`Quantité comptée de ${l.nom}`}
            placeholder={l.unite === "kg" ? "kg" : "pièces"}
            className={`${classeChamp} h-12 w-28`}
          />
        </label>
      ))}
      <MessageFormulaire etat={etat?.erreur ? { erreur: etat.erreur } : null} />
      <BoutonEnvoyer enCours="Enregistrement…">Enregistrer l&apos;inventaire</BoutonEnvoyer>
    </form>
  );
}

function DetailFruit({
  fruit,
  arrivages,
  onArrivage,
  onSucces,
}: {
  fruit: LigneStock;
  arrivages: Arrivage[];
  onArrivage: () => void;
  onSucces: (m: string) => void;
}) {
  const [etatSeuil, envoyerSeuil] = useActionPanneau(changerSeuil.bind(null, fruit.id), onSucces);
  const [aAnnuler, setAAnnuler] = useState<Arrivage | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {fruit.suivi && (
        <p className="montant text-4xl">
          {quantiteStock(fruit.stock, fruit.unite)} <span className="text-lg text-encre-doux">en stock</span>
        </p>
      )}
      <button type="button" onClick={onArrivage} className={classeBoutonPrincipal}>
        Noter un arrivage
      </button>

      <form action={envoyerSeuil} className="flex items-end gap-2">
        <div className="flex-1">
          <Champ
            label={`M'alerter sous (${fruit.unite === "kg" ? "kg" : "pièces"})`}
            name="seuil"
            inputMode="decimal"
            defaultValue={fruit.seuil ?? ""}
            placeholder="Pas d'alerte"
          />
        </div>
        <button type="submit" className="h-14 flex-none rounded-xl bg-gris px-4 text-base font-bold active:bg-trait">
          OK
        </button>
      </form>
      <MessageFormulaire etat={etatSeuil?.erreur ? etatSeuil : null} />

      <section>
        <h3 className="pb-1 text-sm font-bold text-encre-doux">Arrivages des 30 derniers jours</h3>
        {arrivages.length === 0 ? (
          <p className="text-base font-semibold text-encre-doux">Aucun.</p>
        ) : (
          <ul>
            {arrivages.map((a) => (
              <li key={a.id} className="flex min-h-14 items-center gap-2 border-b border-trait py-2">
                <span className={`flex-1 ${a.statut === "annulee" ? "text-encre-doux line-through" : ""}`}>
                  <span className="block text-base font-bold">
                    {formatDate.format(new Date(a.date))} · {quantiteStock(Number(a.quantite), a.unite)}
                  </span>
                  <span className="block text-sm font-semibold text-encre-doux">
                    {fcfa(a.prix_achat_total)} · {fcfa(Math.round(a.prix_achat_total / Number(a.quantite)))}{" "}
                    {a.unite === "kg" ? "le kg" : "la pièce"}
                  </span>
                  {a.statut === "annulee" && (
                    <span className="block text-sm font-semibold text-alerte">Annulé : « {a.raison_annulation} »</span>
                  )}
                </span>
                {a.statut === "validee" && (
                  <button
                    type="button"
                    onClick={() => setAAnnuler(a)}
                    className="h-10 rounded-full bg-gris px-3 text-sm font-bold active:bg-trait"
                  >
                    Annuler
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {aAnnuler && <FormAnnulation key={aAnnuler.id} arrivage={aAnnuler} onSucces={onSucces} />}
    </div>
  );
}

function FormAnnulation({ arrivage, onSucces }: { arrivage: Arrivage; onSucces: (m: string) => void }) {
  const [etat, envoyer] = useActionPanneau(annulerArrivage.bind(null, arrivage.id), onSucces);
  return (
    <form action={envoyer} className="flex flex-col gap-3 rounded-2xl bg-alerte-pale p-4">
      <Champ label="Pourquoi annuler cet arrivage ?" name="raison" required placeholder="Erreur de quantité…" autoFocus />
      <MessageFormulaire etat={etat?.erreur ? etat : null} />
      <BoutonEnvoyer enCours="Annulation…">Annuler l&apos;arrivage</BoutonEnvoyer>
    </form>
  );
}
