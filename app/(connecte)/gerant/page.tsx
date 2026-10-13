import Link from "next/link";
import { BarreOnglets } from "@/components/BarreOnglets";
import { EnTete } from "@/components/EnTete";
import { InfosCompte } from "@/components/InfosCompte";
import { exigerRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const formatDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Dakar" });

// Onglet « Étal » du gérant : réglages de l'étal (fruits, vendeurs), son
// abonnement et son compte.
export default async function PageEtal() {
  const supabase = await createClient();
  const [profil, { data: etal }, { count: nbPaiements }, { count: nbFruits }, { count: nbVendeurs }] = await Promise.all([
    exigerRole(["gerant"]),
    supabase.from("stalls").select("nom, date_fin_acces").maybeSingle(),
    supabase.from("payments").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("actif", true),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "vendeur"),
  ]);

  const finAcces = etal ? formatDate.format(new Date(`${etal.date_fin_acces}T00:00:00Z`)) : "—";
  const reglages = [
    { href: "/gerant/fruits", titre: "Fruits et prix", detail: `${nbFruits ?? 0} en caisse` },
    { href: "/gerant/vendeurs", titre: "Vendeurs", detail: `${nbVendeurs ?? 0} ${(nbVendeurs ?? 0) > 1 ? "comptes" : "compte"}` },
  ];

  return (
    <>
      <EnTete titre={etal?.nom ?? "Étal"} />
      <main className="flex flex-1 flex-col">
        <nav className="border-t border-trait">
          {reglages.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="flex min-h-[64px] items-center gap-3 border-b border-trait px-4 active:bg-gris"
            >
              <span className="flex-1">
                <span className="block text-lg font-bold">{r.titre}</span>
                <span className="block text-sm font-semibold text-encre-doux">{r.detail}</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="text-encre-doux">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </nav>

        <h2 className="px-4 pt-6 text-sm font-bold text-encre-doux">Mon compte</h2>
        <InfosCompte
          profil={profil}
          lignes={[
            { libelle: "Rôle", valeur: "Gérant" },
            { libelle: nbPaiements ? "Abonnement jusqu'au" : "Essai gratuit jusqu'au", valeur: finAcces },
          ]}
        />
      </main>
      <BarreOnglets />
    </>
  );
}
