import Link from "next/link";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { SousOngletsVentes } from "@/components/SousOngletsVentes";
import { FormeFruit } from "@/components/FormeFruit";
import { analyser, type FruitAnalyse, type LigneAchats, type LignePertes, type LigneVentes } from "@/lib/analyses";
import { fcfa } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** « 2026-10 » -> premier jour du mois, du mois suivant et du précédent. */
function bornes(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  const jour = (annee: number, moisIndex: number) => new Date(Date.UTC(annee, moisIndex, 1)).toISOString().slice(0, 10);
  return { debut: jour(a, m - 1), fin: jour(a, m), avant: jour(a, m - 2) };
}

function moisValide(valeur: unknown): string {
  const courant = new Date().toISOString().slice(0, 7);
  if (typeof valeur !== "string" || !/^\d{4}-\d{2}$/.test(valeur)) return courant;
  return valeur > courant ? courant : valeur;
}

function decalerMois(mois: string, n: number): string {
  const [a, m] = mois.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

function quantites(q: { kg: number; piece: number }): string {
  const parts: string[] = [];
  if (q.kg > 0) parts.push(`${String(Math.round(q.kg * 10) / 10).replace(".", ",")} kg`);
  if (q.piece > 0) parts.push(`${q.piece} ${q.piece > 1 ? "pièces" : "pièce"}`);
  return parts.join(" + ") || "0";
}

// Analyses du mois (PRD 4.6), règles simples sans IA.
export default async function PageAnalyses({ searchParams }: PageProps<"/gerant/analyses">) {
  const mois = moisValide((await searchParams).mois);
  const { debut, fin, avant } = bornes(mois);
  const supabase = await createClient();

  const [profil, ventes, ventesAvant, pertes, pertesAvant, achats, { data: fruits }, { data: dettes }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase.rpc("ventes_par_fruit", { p_debut: debut, p_fin: fin }),
    supabase.rpc("ventes_par_fruit", { p_debut: avant, p_fin: debut }),
    supabase.rpc("pertes_par_fruit", { p_debut: debut, p_fin: fin }),
    supabase.rpc("pertes_par_fruit", { p_debut: avant, p_fin: debut }),
    supabase.rpc("achats_par_fruit", { p_debut: debut, p_fin: fin }),
    supabase.from("products").select("id, nom, forme"),
    supabase.from("debt_balances").select("montant_du"),
  ]);

  const erreur = ventes.error ?? pertes.error;
  const a = analyser(
    (fruits ?? []) as FruitAnalyse[],
    (ventes.data as LigneVentes[] | null) ?? [],
    (ventesAvant.data as LigneVentes[] | null) ?? [],
    (pertes.data as LignePertes[] | null) ?? [],
    (pertesAvant.data as LignePertes[] | null) ?? [],
    (achats.data as LigneAchats[] | null) ?? [], // vide si le fichier 007 n'est pas encore collé
  );
  const dettesEnCours = (dettes ?? []).reduce((s, d) => s + Math.max(0, d.montant_du as number), 0);
  const avecVentes = a.parFruit.filter((s) => s.montantVentes > 0);
  const plusVendu = avecVentes[0];
  const moinsVendu = avecVentes.length > 1 ? avecVentes[avecVentes.length - 1] : null;
  const courant = moisValide(undefined);
  const classeFleche = "flex h-11 w-11 items-center justify-center rounded-full bg-gris active:bg-trait";

  return (
    <>
      <EnTete titre="Ventes et pertes" compte={{ nom: profil.nom, href: "/gerant" }} />
      <SousOngletsVentes actif="analyses" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6">
        <div className="flex items-center justify-between">
          <Link href={`/gerant/analyses?mois=${decalerMois(mois, -1)}`} aria-label="Mois précédent" className={classeFleche}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="text-lg font-bold first-letter:uppercase">{formatMois.format(new Date(`${debut}T12:00:00Z`))}</p>
          {mois < courant ? (
            <Link href={`/gerant/analyses?mois=${decalerMois(mois, 1)}`} aria-label="Mois suivant" className={classeFleche}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
        </div>

        {erreur && (
          <p className="rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
            Analyses indisponibles. As-tu collé le fichier 005 dans Supabase ?
          </p>
        )}

        <section className="rounded-3xl bg-vert px-5 py-4 text-white">
          <p className="text-sm font-bold text-orange-clair">Ventes du mois</p>
          <p className="montant text-4xl leading-tight">{fcfa(a.totalMois)}</p>
          <p className="text-sm font-semibold text-white/80">
            {a.evolution === null
              ? `Mois précédent : ${fcfa(a.totalAvant)}`
              : `${a.evolution >= 0 ? "+" : "−"} ${Math.abs(a.evolution)} % par rapport au mois précédent (${fcfa(a.totalAvant)})`}
          </p>
        </section>

        {a.messages.length > 0 && (
          <ul className="flex flex-col gap-2">
            {a.messages.map((m) => (
              <li key={m} className="rounded-xl bg-orange-pale px-4 py-3 text-base font-semibold text-orange-fonce">
                {m}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-gris px-4 py-3">
            <p className="text-xs font-bold text-encre-doux">Le plus vendu</p>
            <p className="truncate text-lg font-bold">{plusVendu?.fruit.nom ?? "—"}</p>
            {plusVendu && <p className="montant text-base">{fcfa(plusVendu.montantVentes)}</p>}
          </div>
          <div className="rounded-2xl bg-gris px-4 py-3">
            <p className="text-xs font-bold text-encre-doux">Le moins vendu</p>
            <p className="truncate text-lg font-bold">{moinsVendu?.fruit.nom ?? "—"}</p>
            {moinsVendu && <p className="montant text-base">{fcfa(moinsVendu.montantVentes)}</p>}
          </div>
          <div className="rounded-2xl bg-alerte-pale px-4 py-3 text-alerte">
            <p className="text-xs font-bold">Pertes du mois</p>
            <p className="montant text-lg">≈ {fcfa(a.pertesValeur)}</p>
            <p className="text-sm font-semibold">{quantites(a.pertesQuantite)}</p>
          </div>
          <Link href="/gerant/dettes" className="rounded-2xl bg-orange-pale px-4 py-3 text-orange-fonce active:bg-orange/20">
            <p className="text-xs font-bold">Dettes en cours</p>
            <p className="montant text-lg">{fcfa(dettesEnCours)}</p>
            <p className="text-sm font-semibold">Voir l&apos;ardoise</p>
          </Link>
        </div>

        {a.parFruit.length > 0 && (
          <section>
            <h2 className="pt-3 pb-1 text-sm font-bold text-encre-doux">Par fruit</h2>
            <ul>
              {a.parFruit.map((s) => (
                <li key={s.fruit.id} className="flex min-h-[64px] items-center gap-3 border-b border-trait py-2">
                  <FormeFruit forme={s.fruit.forme} taille={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{s.fruit.nom}</span>
                    <span className="block text-sm font-semibold text-encre-doux">
                      Vendu {quantites(s.vendu)}
                      {s.valeurPertes > 0 && ` · perdu ${quantites(s.perdu)}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="montant block text-lg leading-none">{fcfa(s.montantVentes)}</span>
                    {s.marge !== null && (
                      <span className={`block text-xs font-bold ${s.marge >= 0 ? "text-vert" : "text-alerte"}`}>
                        marge {s.marge >= 0 ? "" : "− "}
                        {fcfa(Math.abs(s.marge))}
                      </span>
                    )}
                    {s.tauxPerte !== null && s.tauxPerte > 0 && (
                      <span className={`block text-xs font-bold ${s.tauxPerte >= 10 ? "text-alerte" : "text-encre-doux"}`}>
                        {s.tauxPerte} % de perte
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BarreOnglets />
    </>
  );
}
