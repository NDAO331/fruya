import { EnTete } from "@/components/EnTete";
import { InfosCompte } from "@/components/InfosCompte";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Compte du vendeur (le gérant a l'onglet « Étal »).
export default async function PageCompte() {
  const profil = await exigerRole(["vendeur"]);
  const supabase = await createClient();
  const { data: etal } = await supabase
    .from("stalls")
    .select("nom")
    .eq("id", profil.stall_id!)
    .maybeSingle();

  return (
    <>
      <EnTete titre="Mon compte" retour="/caisse" />
      <main className="flex flex-1 flex-col">
        <InfosCompte
          profil={profil}
          lignes={[
            { libelle: "Étal", valeur: etal?.nom ?? "—" },
            { libelle: "Rôle", valeur: "Vendeur" },
          ]}
        />
      </main>
    </>
  );
}
