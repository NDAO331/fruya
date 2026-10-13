import Link from "next/link";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { fcfa } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { FinDeJournee, type Chiffres, type Rapport } from "./FinDeJournee";

const formatJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function aujourdhuiDakar(): string {
  return new Date().toISOString().slice(0, 10); // Dakar = UTC toute l'année
}

function jourValide(valeur: unknown): string {
  const aujourdhui = aujourdhuiDakar();
  if (typeof valeur !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return aujourdhui;
  return valeur > aujourdhui ? aujourdhui : valeur;
}

// Fin de journée (PRD 4.4) : caisse théorique calculée par le serveur,
// argent compté saisi par le gérant, écart affiché et enregistré.
export default async function PageFinDeJournee({ searchParams }: PageProps<"/gerant/fin-de-journee">) {
  const jour = jourValide((await searchParams).jour);
  const supabase = await createClient();

  const [profil, { data: chiffres }, { data: rapports }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase.rpc("chiffres_journee", { p_jour: jour }).maybeSingle<Chiffres>(),
    supabase
      .from("daily_reports")
      .select("date, caisse_theorique, caisse_declaree, ecart, total_ventes_comptant, total_paiements_dettes, total_pertes")
      .order("date", { ascending: false })
      .limit(14)
      .returns<Rapport[]>(),
  ]);

  const rapportDuJour = (rapports ?? []).find((r) => r.date === jour) ?? null;
  const precedents = (rapports ?? []).filter((r) => r.date !== jour);

  return (
    <>
      <EnTete titre="Fin de journée" retour="/gerant/ventes" compte={{ nom: profil.nom, href: "/gerant" }} />
      <main className="flex flex-1 flex-col">
        <p className="px-4 pb-3 text-lg font-bold first-letter:uppercase">
          {jour === aujourdhuiDakar() ? "Aujourd'hui" : formatJour.format(new Date(`${jour}T12:00:00Z`))}
        </p>
        {chiffres ? (
          <FinDeJournee key={jour} jour={jour} chiffres={chiffres} rapport={rapportDuJour} />
        ) : (
          <p className="px-4 text-base font-semibold text-alerte">Chiffres indisponibles. Réessaie avec du réseau.</p>
        )}

        {precedents.length > 0 && (
          <section className="mt-8 pb-4">
            <h2 className="px-4 pb-1 text-sm font-bold text-encre-doux">Jours précédents</h2>
            <ul>
              {precedents.map((r) => (
                <li key={r.date}>
                  <Link
                    href={`/gerant/fin-de-journee?jour=${r.date}`}
                    className="flex h-14 items-center justify-between border-b border-trait px-4 active:bg-gris"
                  >
                    <span className="text-base font-bold first-letter:uppercase">
                      {formatJour.format(new Date(`${r.date}T12:00:00Z`))}
                    </span>
                    <span
                      className={`montant text-lg ${
                        Math.abs(r.ecart) > 500 ? "text-alerte" : r.ecart === 0 ? "text-vert" : "text-encre-doux"
                      }`}
                    >
                      {r.ecart === 0 ? "Juste" : `${r.ecart > 0 ? "+" : "−"} ${fcfa(Math.abs(r.ecart))}`}
                    </span>
                  </Link>
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
