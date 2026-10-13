import Link from "next/link";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { debutJourDakar } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Fruit } from "@/lib/types";
import { Caisse } from "./Caisse";

// Écran de caisse. Les ventes sont enregistrées d'abord sur le téléphone
// (lib/hors-ligne), puis envoyées au serveur. Pour le gérant, c'est aussi
// son accueil : alerte stock bas.
export default async function PageCaisse() {
  const supabase = await createClient();
  const renduA = new Date().toISOString();

  // Tout en parallèle (un seul aller-retour vers Supabase) : les règles RLS
  // limitent déjà fruits, ventes et étal à ceux de l'utilisateur connecté.
  const [profil, { data: produits }, { data: ventes }, { data: etal }, stock] = await Promise.all([
    exigerRole(["vendeur", "gerant"]),
    supabase.from("products").select("*").eq("actif", true).order("nom"),
    supabase
      .from("sales")
      .select("montant_total")
      .eq("statut", "validee")
      .gte("date", debutJourDakar()),
    supabase.from("stalls").select("nom").maybeSingle(),
    // Vide pour un vendeur (le stock est réservé au gérant).
    supabase.rpc("stock_restant"),
  ]);

  const estGerant = profil.role === "gerant";
  const fruitsParId = new Map(((produits ?? []) as Fruit[]).map((f) => [f.id, f.nom]));

  // Alerte stock bas sur l'accueil du gérant (PRD 4.9).
  const stockBas = estGerant
    ? ((stock.data as { product_id: string; stock: number; seuil_alerte: number | null }[] | null) ?? [])
        .filter((s) => s.seuil_alerte !== null && Number(s.stock) <= Number(s.seuil_alerte))
        .map((s) => fruitsParId.get(s.product_id))
        .filter((nom): nom is string => !!nom)
    : [];

  return (
    <>
      <EnTete titre={etal?.nom ?? "Caisse"} compte={{ nom: profil.nom, href: estGerant ? "/gerant" : "/compte" }} />
      {stockBas.length > 0 && (
        <Link
          href="/gerant/stock"
          className="mx-4 mb-2 block rounded-xl bg-alerte-pale px-4 py-3 text-base font-semibold text-alerte active:bg-alerte/15"
        >
          Stock bas : {stockBas.join(", ")}. Voir le stock
        </Link>
      )}
      <Caisse
        fruits={(produits ?? []) as Fruit[]}
        totalServeur={(ventes ?? []).reduce((somme, v) => somme + v.montant_total, 0)}
        nbServeur={ventes?.length ?? 0}
        renduA={renduA}
        utilisateur={{ id: profil.id, nom: profil.nom, stall_id: profil.stall_id!, estGerant, etal: etal?.nom ?? "Fruya" }}
      />
      {estGerant && <BarreOnglets />}
    </>
  );
}
