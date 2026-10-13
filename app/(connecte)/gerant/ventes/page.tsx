import Link from "next/link";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { SousOngletsVentes } from "@/components/SousOngletsVentes";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Forme } from "@/lib/formes";
import type { Paiement, Unite } from "@/lib/types";
import { Historique, type Mouvement } from "./Historique";

const formatJour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Dakar",
});

function jourValide(valeur: unknown): string {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (typeof valeur !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return aujourdhui;
  return valeur > aujourdhui ? aujourdhui : valeur;
}

function decaler(jour: string, jours: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

type Produit = { nom: string; forme: Forme } | null;
type LigneSql = { quantite: number; unite: Unite; prix_unitaire: number; products: Produit };
type VenteSql = {
  id: string;
  date: string;
  montant_total: number;
  methode: "manuelle" | "vocale";
  paiement: Paiement;
  statut: "validee" | "annulee";
  raison_annulation: string | null;
  user_id: string;
  annulee_par: string | null;
  sale_items: LigneSql[];
};
type PerteSql = {
  id: string;
  date: string;
  quantite: number;
  unite: Unite;
  raison: string | null;
  photo_url: string | null;
  statut: "validee" | "annulee";
  raison_annulation: string | null;
  user_id: string;
  annulee_par: string | null;
  products: Produit;
};

// Historique du gérant (PRD 3.2) : ventes et pertes d'un jour, avec leur
// auteur, les annulations et leur raison. Le jour se change avec ‹ ›.
export default async function PageVentes({ searchParams }: PageProps<"/gerant/ventes">) {
  const jour = jourValide((await searchParams).jour);
  const debut = `${jour}T00:00:00Z`;
  const fin = `${decaler(jour, 1)}T00:00:00Z`;
  const supabase = await createClient();

  const [profil, { data: ventes }, { data: pertes }, { data: equipe }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase
      .from("sales")
      .select(
        "id, date, montant_total, methode, paiement, statut, raison_annulation, user_id, annulee_par, sale_items(quantite, unite, prix_unitaire, products(nom, forme))",
      )
      .gte("date", debut)
      .lt("date", fin)
      .order("date", { ascending: false })
      .returns<VenteSql[]>(),
    supabase
      .from("losses")
      .select(
        "id, date, quantite, unite, raison, photo_url, statut, raison_annulation, user_id, annulee_par, products(nom, forme)",
      )
      .gte("date", debut)
      .lt("date", fin)
      .order("date", { ascending: false })
      .returns<PerteSql[]>(),
    supabase.from("users").select("id, nom"),
  ]);

  const noms = new Map((equipe ?? []).map((u) => [u.id, u.nom as string]));
  const nom = (id: string | null) => (id ? noms.get(id) ?? "?" : "?");

  // Photos des pertes : liens temporaires (1 h), le stockage étant privé.
  const chemins = (pertes ?? []).map((p) => p.photo_url).filter((c): c is string => !!c);
  const liens = new Map<string, string>();
  if (chemins.length > 0) {
    const { data } = await supabase.storage.from("pertes").createSignedUrls(chemins, 3600);
    for (const l of data ?? []) if (l.path && l.signedUrl) liens.set(l.path, l.signedUrl);
  }

  const mouvements: Mouvement[] = [
    ...(ventes ?? []).map(
      (v): Mouvement => ({
        type: "vente",
        id: v.id,
        date: v.date,
        auteur: nom(v.user_id),
        montant: v.montant_total,
        vocale: v.methode === "vocale",
        paiement: v.paiement ?? "especes",
        lignes: v.sale_items.map((l) => ({
          nom: l.products?.nom ?? "?",
          forme: l.products?.forme ?? "autre",
          quantite: Number(l.quantite),
          unite: l.unite,
          prix_unitaire: l.prix_unitaire,
        })),
        annulation:
          v.statut === "annulee" ? { raison: v.raison_annulation ?? "", par: nom(v.annulee_par) } : null,
      }),
    ),
    ...(pertes ?? []).map(
      (p): Mouvement => ({
        type: "perte",
        id: p.id,
        date: p.date,
        auteur: nom(p.user_id),
        nom: p.products?.nom ?? "?",
        forme: p.products?.forme ?? "autre",
        quantite: Number(p.quantite),
        unite: p.unite,
        raison: p.raison,
        photo: p.photo_url ? liens.get(p.photo_url) ?? null : null,
        photoAttendue: !p.photo_url,
        annulation:
          p.statut === "annulee" ? { raison: p.raison_annulation ?? "", par: nom(p.annulee_par) } : null,
      }),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const aujourdhui = jourValide(undefined);
  const classeFleche = "flex h-11 w-11 items-center justify-center rounded-full bg-gris active:bg-trait";

  return (
    <>
      <EnTete titre="Ventes et pertes" compte={{ nom: profil.nom, href: "/gerant" }} />
      <SousOngletsVentes actif="journal" />
      <div className="flex items-center justify-between px-4 pb-2">
        <Link href={`/gerant/ventes?jour=${decaler(jour, -1)}`} aria-label="Jour précédent" className={classeFleche}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="text-lg font-bold first-letter:uppercase">
          {jour === aujourdhui ? "Aujourd'hui" : formatJour.format(new Date(`${jour}T12:00:00Z`))}
        </p>
        {jour < aujourdhui ? (
          <Link href={`/gerant/ventes?jour=${decaler(jour, 1)}`} aria-label="Jour suivant" className={classeFleche}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <span className="h-11 w-11" />
        )}
      </div>
      <div className="px-4 pb-3">
        <Link
          href={`/gerant/fin-de-journee?jour=${jour}`}
          className="flex h-12 items-center justify-center rounded-2xl bg-vert-pale text-base font-bold text-vert active:bg-vert/15"
        >
          Fin de journée : compter la caisse
        </Link>
      </div>
      <Historique mouvements={mouvements} />
      <BarreOnglets />
    </>
  );
}
