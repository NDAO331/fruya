import { EnTete } from "@/components/EnTete";
import { InfosCompte } from "@/components/InfosCompte";
import { exigerRole } from "@/lib/session";

export default async function CompteAdmin() {
  const profil = await exigerRole(["admin"]);
  return (
    <>
      <EnTete titre="Mon compte" retour="/admin" />
      <main className="flex flex-1 flex-col">
        <InfosCompte profil={profil} lignes={[{ libelle: "Rôle", valeur: "Administrateur" }]} />
      </main>
    </>
  );
}
