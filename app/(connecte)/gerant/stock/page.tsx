import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { ilYaJours } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Forme } from "@/lib/formes";
import type { Unite } from "@/lib/types";
import { Stock, type Arrivage, type LigneStock } from "./Stock";

type StockSql = {
  product_id: string;
  unite: Unite;
  stock: number;
  seuil_alerte: number | null;
  dernier_inventaire: string | null;
  a_des_arrivages: boolean;
};

// Stock (PRD 4.9) : stock restant calculé par le serveur, arrivages,
// alertes stock bas, inventaire du soir. Gérant uniquement.
export default async function PageStock() {
  const supabase = await createClient();
  const il_y_a_30_jours = ilYaJours(30);

  const [profil, stock, { data: fruits }, { data: arrivages }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase.rpc("stock_restant"),
    supabase.from("products").select("id, nom, forme").eq("actif", true).order("nom"),
    supabase
      .from("stock_arrivals")
      .select("id, product_id, date, quantite, unite, prix_achat_total, statut, raison_annulation")
      .gte("date", il_y_a_30_jours)
      .order("date", { ascending: false })
      .returns<Arrivage[]>(),
  ]);

  const parFruit = new Map(((stock.data as StockSql[] | null) ?? []).map((s) => [s.product_id, s]));
  const lignes: LigneStock[] = ((fruits ?? []) as { id: string; nom: string; forme: Forme }[]).map((f) => {
    const s = parFruit.get(f.id);
    return {
      id: f.id,
      nom: f.nom,
      forme: f.forme,
      unite: s?.unite ?? "kg",
      stock: Number(s?.stock ?? 0),
      seuil: s?.seuil_alerte === null || s?.seuil_alerte === undefined ? null : Number(s.seuil_alerte),
      dernierInventaire: s?.dernier_inventaire ?? null,
      suivi: Boolean(s?.a_des_arrivages || s?.dernier_inventaire),
    };
  });

  return (
    <>
      <EnTete titre="Stock" compte={{ nom: profil.nom, href: "/gerant" }} />
      {stock.error ? (
        <p className="mx-4 rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte">
          Stock indisponible. As-tu collé le fichier 007 dans Supabase ?
        </p>
      ) : (
        <Stock lignes={lignes} arrivages={arrivages ?? []} />
      )}
      <BarreOnglets />
    </>
  );
}
