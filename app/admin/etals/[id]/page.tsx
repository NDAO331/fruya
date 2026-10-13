import { notFound } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { aujourdhuiDakar } from "@/lib/acces";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Abonne } from "../../types";
import { FicheAbonne, type Paiement } from "./FicheAbonne";

// Fiche abonné (PRD 3.3) : infos de l'étal, paiements, activité récente,
// actions (paiement, blocage, prolongation, rappel WhatsApp). Jamais le
// détail des ventes, pertes ou dettes.
export default async function PageAbonne({ params }: PageProps<"/admin/etals/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [, { data: abonne }, { data: paiements }] = await Promise.all([
    exigerRole(["admin"]),
    supabase.from("admin_stalls").select("*").eq("id", id).maybeSingle<Abonne>(),
    supabase
      .from("payments")
      .select("id, montant, date_paiement, moyen, mois_payes, note")
      .eq("stall_id", id)
      .order("date_paiement", { ascending: false })
      .returns<Paiement[]>(),
  ]);
  if (!abonne) notFound();

  return (
    <>
      <EnTete titre={abonne.nom} retour="/admin" />
      <FicheAbonne
        abonne={abonne}
        paiements={paiements ?? []}
        aujourdhui={aujourdhuiDakar()}
        numeroPaiement={process.env.FRUYA_NUMERO_PAIEMENT ?? null}
      />
    </>
  );
}
