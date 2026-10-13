"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { classeChamp } from "@/components/formulaire";
import { debutJourDakar, fcfa } from "@/lib/format";
import { annulerOperation, DELAI_ANNULATION_MS, ErreurAnnulation } from "@/lib/hors-ligne/annulation";
import { baseLocale } from "@/lib/hors-ligne/base";

type Operation = {
  type: "vente" | "perte";
  id: string;
  date: string;
  resume: string;
  montant: number | null;
  annulee: boolean;
};

const formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });

// Les dernières ventes et pertes faites sur ce téléphone, avec « Annuler »
// pendant 5 minutes (PRD 3.2). Passé ce délai, seul le gérant peut annuler.
export function DernieresOperations({ userId }: { userId: string }) {
  const router = useRouter();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [enCours, setEnCours] = useState<Operation | null>(null);
  const [raison, setRaison] = useState("");
  const [erreur, setErreur] = useState<string>();
  const [envoi, setEnvoi] = useState(false);

  // Le bouton « Annuler » disparaît tout seul au bout de 5 minutes.
  useEffect(() => {
    const minuteur = window.setInterval(() => setMaintenant(Date.now()), 15_000);
    return () => window.clearInterval(minuteur);
  }, []);

  const operations = useLiveQuery(
    async () => {
      const base = baseLocale();
      const debut = debutJourDakar();
      const [ventes, pertes] = await Promise.all([
        base.ventes.where("date").aboveOrEqual(debut).filter((v) => v.user_id === userId).toArray(),
        base.pertes.where("date").aboveOrEqual(debut).filter((p) => p.user_id === userId).toArray(),
      ]);
      return [
        ...ventes.map((v): Operation => ({
          type: "vente", id: v.id, date: v.date, resume: v.resume, montant: v.montant_total, annulee: !!v.annulee,
        })),
        ...pertes.map((p): Operation => ({
          type: "perte", id: p.id, date: p.date, resume: `Perte : ${p.resume}`, montant: null, annulee: !!p.annulee,
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
    },
    [userId],
    [] as Operation[],
  );

  if (operations.length === 0) return null;

  async function confirmer() {
    if (!enCours) return;
    setEnvoi(true);
    setErreur(undefined);
    try {
      await annulerOperation(enCours.type, enCours.id, raison, userId);
      setEnCours(null);
      setRaison("");
      router.refresh(); // total du jour recalculé par le serveur
    } catch (e) {
      setErreur(e instanceof ErreurAnnulation ? e.message : "L'annulation n'a pas marché. Réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="mt-4 pb-4">
      <h2 className="px-4 pb-1 text-sm font-bold text-encre-doux">Tes dernières opérations</h2>
      <ul>
        {operations.map((o) => {
          const annulable = !o.annulee && maintenant - Date.parse(o.date) < DELAI_ANNULATION_MS;
          return (
            <li key={`${o.type}-${o.id}`} className="border-b border-trait px-4 py-2">
              <div className="flex min-h-11 items-center gap-3">
                <span className="w-11 flex-none text-sm font-bold text-encre-doux">{formatHeure.format(new Date(o.date))}</span>
                <span className={`min-w-0 flex-1 truncate text-base font-semibold ${o.annulee ? "text-encre-doux line-through" : ""}`}>
                  {o.resume}
                </span>
                {o.montant !== null && (
                  <span className={`montant text-base ${o.annulee ? "text-encre-doux line-through" : ""}`}>{fcfa(o.montant)}</span>
                )}
                {annulable && enCours?.id !== o.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEnCours(o);
                      setErreur(undefined);
                    }}
                    className="h-10 flex-none rounded-full bg-alerte-pale px-3 text-sm font-bold text-alerte active:bg-alerte/15"
                  >
                    Annuler
                  </button>
                )}
              </div>

              {enCours?.id === o.id && (
                <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-alerte-pale p-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold text-alerte">Pourquoi annuler ?</span>
                    <input
                      value={raison}
                      onChange={(e) => setRaison(e.target.value)}
                      autoFocus
                      placeholder="Erreur de quantité, client parti…"
                      className={classeChamp}
                    />
                  </label>
                  {erreur && <p role="alert" className="text-base font-semibold text-alerte">{erreur}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnCours(null)}
                      className="h-12 rounded-2xl bg-fond text-base font-bold active:bg-gris"
                    >
                      Garder
                    </button>
                    <button
                      type="button"
                      onClick={confirmer}
                      disabled={envoi}
                      className="h-12 rounded-2xl bg-alerte text-base font-bold text-white active:bg-alerte/85 disabled:opacity-60"
                    >
                      {envoi ? "Annulation…" : "Annuler"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="px-4 pt-2 text-xs font-semibold text-encre-doux">
        Tu peux annuler pendant 5 minutes. Après, demande au gérant.
      </p>
    </section>
  );
}
