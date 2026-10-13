import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Fruit } from "@/lib/types";
import { ListeDettes, type ClientArdoise } from "./ListeDettes";

// Ardoise du gérant : clients et montant dû (PRD 3.2).
export default async function PageDettes() {
  const supabase = await createClient();
  const [profil, { data: soldes }, { data: fruits }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase
      .from("debt_balances")
      .select("debt_id, client_nom, client_telephone, montant_du")
      .order("montant_du", { ascending: false })
      .order("client_nom"),
    supabase.from("products").select("*").eq("actif", true).order("nom"),
  ]);

  return (
    <>
      <EnTete titre="Ardoise" compte={{ nom: profil.nom, href: "/gerant" }} />
      <ListeDettes clients={(soldes ?? []) as ClientArdoise[]} fruits={(fruits ?? []) as Fruit[]} />
      <BarreOnglets />
    </>
  );
}
