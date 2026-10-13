import { GardeAcces } from "@/components/GardeAcces";
import { SynchroHorsLigne } from "@/components/SynchroHorsLigne";
import { getProfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Écrans connectés (caisse, gérant, compte). Chaque page vérifie elle-même
// le rôle ; ce layout ajoute l'envoi en fond des ventes faites hors-ligne et
// le contrôle de l'abonnement de l'étal (PRD 4.8).
export default async function LayoutConnecte({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const [profil, { data: etal }] = await Promise.all([
    getProfil(),
    supabase.from("stalls").select("date_fin_acces, bloque").maybeSingle(),
  ]);
  const vend = profil?.role === "vendeur" || profil?.role === "gerant";

  if (!vend || !etal) return <>{children}</>;

  return (
    <>
      <SynchroHorsLigne userId={profil.id} />
      <GardeAcces
        etal={etal}
        estGerant={profil.role === "gerant"}
        numeroPaiement={process.env.FRUYA_NUMERO_PAIEMENT ?? null}
        userId={profil.id}
      >
        {children}
      </GardeAcces>
    </>
  );
}
