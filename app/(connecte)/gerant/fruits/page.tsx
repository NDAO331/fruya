import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Fruit } from "@/lib/types";
import { ListeFruits } from "./ListeFruits";

export default async function PageFruits() {
  const profil = await exigerRole(["gerant"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("actif", { ascending: false })
    .order("nom");
  const fruits = (data ?? []) as Fruit[];

  return (
    <>
      <EnTete
        titre={fruits.length ? "Fruits et prix" : "Ajoute tes fruits"}
        retour={fruits.length ? "/gerant" : undefined}
        compte={{ nom: profil.nom, href: "/gerant" }}
      />
      <ListeFruits fruits={fruits} />
      <BarreOnglets />
    </>
  );
}
