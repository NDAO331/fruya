import { notFound } from "next/navigation";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Fruit } from "@/lib/types";
import type { DetailFruit } from "../actions";
import { FicheClient, type Transaction } from "./FicheClient";

type TransactionSql = {
  id: string;
  type: "prise" | "paiement" | "annulation";
  montant: number;
  detail_fruits: DetailFruit[] | null;
  transaction_annulee_id: string | null;
  raison: string | null;
  date: string;
  user_id: string;
};

// Fiche client de l'ardoise : montant dû, historique des prises et
// paiements, encaissement d'un paiement (PRD 3.2).
export default async function PageClient({ params }: PageProps<"/gerant/dettes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [profil, { data: solde }, { data: transactions }, { data: equipe }, { data: fruits }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase.from("debt_balances").select("debt_id, client_nom, client_telephone, montant_du").eq("debt_id", id).maybeSingle(),
    supabase
      .from("debt_transactions")
      .select("id, type, montant, detail_fruits, transaction_annulee_id, raison, date, user_id")
      .eq("debt_id", id)
      .order("date", { ascending: false })
      .returns<TransactionSql[]>(),
    supabase.from("users").select("id, nom"),
    supabase.from("products").select("*").eq("actif", true).order("nom"),
  ]);
  if (!solde) notFound();

  const noms = new Map((equipe ?? []).map((u) => [u.id, u.nom as string]));
  const annulees = new Map(
    (transactions ?? []).filter((t) => t.type === "annulation").map((t) => [t.transaction_annulee_id!, t]),
  );

  const historique: Transaction[] = (transactions ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    montant: t.montant,
    detail: t.detail_fruits,
    raison: t.raison,
    date: t.date,
    auteur: noms.get(t.user_id) ?? "?",
    annulation: annulees.has(t.id)
      ? { raison: annulees.get(t.id)!.raison ?? "", par: noms.get(annulees.get(t.id)!.user_id) ?? "?" }
      : null,
  }));

  return (
    <>
      <EnTete titre={solde.client_nom} retour="/gerant/dettes" compte={{ nom: profil.nom, href: "/gerant" }} />
      <FicheClient
        debtId={id}
        telephone={solde.client_telephone}
        montantDu={solde.montant_du}
        historique={historique}
        fruits={(fruits ?? []) as Fruit[]}
      />
      <BarreOnglets />
    </>
  );
}
