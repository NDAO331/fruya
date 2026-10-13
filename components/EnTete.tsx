import Link from "next/link";

/** « Fatou Diop » -> « FD » */
export function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toLocaleUpperCase("fr-FR"))
    .join("");
}

// En-tête d'écran : retour éventuel, titre, et pastille du compte.
export function EnTete({
  titre,
  retour,
  compte,
}: {
  titre: string;
  retour?: string;
  compte?: { nom: string; href: string };
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 bg-fond px-4 pt-[env(safe-area-inset-top)]">
      {retour && (
        <Link
          href={retour}
          aria-label="Retour"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-gris"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-bold">{titre}</h1>
      {compte && (
        <Link
          href={compte.href}
          aria-label="Mon compte"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gris text-sm font-bold active:bg-trait"
        >
          {initiales(compte.nom)}
        </Link>
      )}
    </header>
  );
}
