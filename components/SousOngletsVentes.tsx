import Link from "next/link";

// Sous-onglets de l'onglet Ventes : le journal du jour et les analyses du mois.
export function SousOngletsVentes({ actif }: { actif: "journal" | "analyses" }) {
  const classe = (oui: boolean) =>
    `flex h-10 items-center justify-center rounded-lg text-base font-bold ${
      oui ? "bg-fond text-encre shadow-[0_0_0_1px_var(--color-trait)]" : "text-encre-doux"
    }`;
  return (
    <nav className="mx-4 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-gris p-1" aria-label="Ventes">
      <Link href="/gerant/ventes" aria-current={actif === "journal" ? "page" : undefined} className={classe(actif === "journal")}>
        Journal
      </Link>
      <Link href="/gerant/analyses" aria-current={actif === "analyses" ? "page" : undefined} className={classe(actif === "analyses")}>
        Analyses
      </Link>
    </nav>
  );
}
