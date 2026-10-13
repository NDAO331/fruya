import { EnTete } from "@/components/EnTete";
import { aujourdhuiDakar } from "@/lib/acces";
import { fcfa } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ListeAbonnes } from "./ListeAbonnes";
import { joursRestants, type Abonne } from "./types";

// Tableau de bord administrateur (PRD 3.3) : abonnés, revenus, échéances.
export default async function AccueilAdmin() {
  const supabase = await createClient();
  const debutMois = `${aujourdhuiDakar().slice(0, 7)}-01`;

  const [profil, { data: vue }, { data: paiements }] = await Promise.all([
    exigerRole(["admin"]),
    supabase.from("admin_stalls").select("*").order("date_fin_acces"),
    supabase.from("payments").select("montant").gte("date_paiement", debutMois),
  ]);

  const abonnes = (vue ?? []) as Abonne[];
  const aujourdhui = aujourdhuiDakar();
  const compte = (s: Abonne["statut"]) => abonnes.filter((a) => a.statut === s).length;
  const expirentBientot = abonnes.filter((a) => {
    const j = joursRestants(a.date_fin_acces, aujourdhui);
    return !a.bloque && a.statut !== "expire" && j >= 0 && j <= 3;
  }).length;
  const revenus = (paiements ?? []).reduce((s, p) => s + (p.montant as number), 0);

  const tuiles = [
    { libelle: "Actifs", valeur: compte("actif"), classe: "bg-vert-pale text-vert" },
    { libelle: "En essai", valeur: compte("essai"), classe: "bg-orange-pale text-orange-fonce" },
    { libelle: "Expirés", valeur: compte("expire"), classe: "bg-alerte-pale text-alerte" },
    { libelle: "Bloqués", valeur: compte("bloque"), classe: "bg-gris text-encre" },
  ];

  return (
    <>
      <EnTete titre="Administration" compte={{ nom: profil.nom, href: "/admin/compte" }} />
      <main className="flex flex-1 flex-col gap-3 pb-6">
        <section className="mx-4 rounded-3xl bg-vert px-5 py-4 text-white">
          <p className="text-sm font-bold text-orange-clair">Encaissé ce mois-ci</p>
          <p className="montant text-4xl leading-tight">{fcfa(revenus)}</p>
          <p className="text-sm font-semibold text-white/80">
            {expirentBientot} étal{expirentBientot > 1 ? "s expirent" : " expire"} dans les 3 prochains jours
          </p>
        </section>
        <div className="mx-4 grid grid-cols-4 gap-2">
          {tuiles.map((t) => (
            <div key={t.libelle} className={`rounded-2xl px-2 py-3 text-center ${t.classe}`}>
              <p className="montant text-2xl leading-none">{t.valeur}</p>
              <p className="mt-1 text-xs font-bold">{t.libelle}</p>
            </div>
          ))}
        </div>
        <ListeAbonnes abonnes={abonnes} aujourdhui={aujourdhui} />
      </main>
    </>
  );
}
