"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barre d'onglets du gérant, en bas de l'écran. Fruits et Vendeurs sont
// rangés dans l'onglet Étal ; la fin de journée et les analyses dans
// l'onglet Ventes.
const ONGLETS = [
  {
    href: "/caisse",
    libelle: "Caisse",
    icone: "M4 7h16v12H4zM8 7V4h8v3M8 12h2m4 0h2M8 15h2m4 0h2",
    actifSur: ["/caisse"],
  },
  {
    href: "/gerant/ventes",
    libelle: "Ventes",
    icone: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
    actifSur: ["/gerant/ventes", "/gerant/fin-de-journee", "/gerant/analyses"],
  },
  {
    href: "/gerant/stock",
    libelle: "Stock",
    icone: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
    actifSur: ["/gerant/stock"],
  },
  {
    href: "/gerant/dettes",
    libelle: "Ardoise",
    icone: "M4 5h16v14H4zM8 9h8M8 13h5M15 16l2-2",
    actifSur: ["/gerant/dettes"],
  },
  {
    href: "/gerant",
    libelle: "Étal",
    icone: "M3 10l2-6h14l2 6M3 10h18M3 10c0 2 2 3 3 3s3-1 3-3c0 2 2 3 3 3s3-1 3-3c0 2 2 3 3 3s3-1 3-3M5 13v7h14v-7",
    actifSur: ["/gerant", "/gerant/fruits", "/gerant/vendeurs"],
  },
];

export function BarreOnglets() {
  const chemin = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 mt-auto border-t border-trait bg-fond pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {ONGLETS.map((onglet) => {
          const actif = onglet.actifSur.some((p) => chemin === p || (p !== "/gerant" && chemin.startsWith(`${p}/`)));
          return (
            <li key={onglet.href}>
              <Link
                href={onglet.href}
                aria-current={actif ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                  actif ? "text-vert" : "text-encre-doux"
                }`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${actif ? "bg-vert-pale" : ""}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d={onglet.icone}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {onglet.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
