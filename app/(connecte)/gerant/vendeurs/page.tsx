import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Profil } from "@/lib/types";
import { ListeVendeurs } from "./ListeVendeurs";

export default async function PageVendeurs() {
  const profil = await exigerRole(["gerant"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, telephone, nom, role, stall_id")
    .eq("stall_id", profil.stall_id!)
    .eq("role", "vendeur")
    .order("nom");

  return (
    <>
      <EnTete titre="Vendeurs" retour="/gerant" compte={{ nom: profil.nom, href: "/gerant" }} />
      <ListeVendeurs vendeurs={(data ?? []) as Profil[]} />
      <BarreOnglets />
    </>
  );
}
