// Formes de fruits de l'app (components/FormeFruit.tsx), en aplats.
const FEUILLE = "#2F6B2A";

export type FormeVideo = "mangue" | "banane" | "pasteque" | "orange" | "papaye" | "ananas" | "citron" | "pomme";

export const FOND_FRUIT: Record<FormeVideo, string> = {
  mangue: "#FBE7C4",
  banane: "#F8EDB8",
  pasteque: "#F6D5CF",
  orange: "#F9DCC6",
  papaye: "#F8DCCD",
  ananas: "#F6E6BE",
  citron: "#E3EDCF",
  pomme: "#F4D3CF",
};

function Dessin({ forme }: { forme: FormeVideo }) {
  switch (forme) {
    case "mangue":
      return (
        <>
          <path d="M10 30c0-12 10-22 22-20 7 1 9 9 6 16-4 10-14 16-22 14-4-1-6-5-6-10z" fill="#E8901A" />
          <path d="M30 10c2-5 7-6 10-5-1 4-5 6-10 5z" fill={FEUILLE} />
        </>
      );
    case "banane":
      return (
        <>
          <path d="M8 14c4 16 18 24 34 18-2 6-12 10-22 7S6 26 8 14z" fill="#D9A800" />
          <path d="M8 14l-2-4 4 1z" fill="#5C4A12" />
        </>
      );
    case "pasteque":
      return (
        <>
          <path d="M4 18h40a20 20 0 0 1-40 0z" fill={FEUILLE} />
          <path d="M8 18h32a16 16 0 0 1-32 0z" fill="#D2382F" />
          <circle cx="18" cy="24" r="1.6" fill="#1E1A16" />
          <circle cx="26" cy="28" r="1.6" fill="#1E1A16" />
          <circle cx="31" cy="22" r="1.6" fill="#1E1A16" />
        </>
      );
    case "orange":
      return (
        <>
          <circle cx="24" cy="27" r="16" fill="#E2621B" />
          <path d="M24 11c3-5 9-5 11-3-3 4-7 5-11 3z" fill={FEUILLE} />
        </>
      );
    case "papaye":
      return (
        <>
          <ellipse cx="24" cy="24" rx="12" ry="19" fill="#E47B4B" />
          <ellipse cx="24" cy="26" rx="4" ry="8.5" fill="#3B2A1E" />
        </>
      );
    case "ananas":
      return (
        <>
          <path d="M24 16l-6-12 6 6 6-6z" fill={FEUILLE} />
          <ellipse cx="24" cy="30" rx="11" ry="15" fill="#D99A1E" />
          <path d="M15 22l18 16M33 22L15 38M14 30l12 12M34 30L22 42" stroke="#9A6A10" strokeWidth="1.5" />
        </>
      );
    case "citron":
      return (
        <>
          <path d="M6 24c4-10 32-10 36 0-4 10-32 10-36 0z" fill="#6E9F2E" />
          <path d="M3 24h4M41 24h4" stroke="#3E5A18" strokeWidth="2.5" />
        </>
      );
    case "pomme":
      return (
        <>
          <path d="M24 15c-4-3-16-3-16 11 0 10 7 18 12 18 2 0 3-1 4-1s2 1 4 1c5 0 12-8 12-18 0-14-12-14-16-11z" fill="#C8352E" />
          <path d="M24 15c0-4 1-7 3-9" stroke="#5C3A1E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M27 10c3-3 7-3 9-2-2 3-6 4-9 2z" fill={FEUILLE} />
        </>
      );
  }
}

/** Fruit dans un rond de sa couleur pâle (comme dans l'app). */
export function Fruit({ forme, taille, rond = true }: { forme: FormeVideo; taille: number; rond?: boolean }) {
  return (
    <div
      style={{
        width: taille,
        height: taille,
        borderRadius: "50%",
        background: rond ? FOND_FRUIT[forme] : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg width={taille * (rond ? 0.68 : 1)} height={taille * (rond ? 0.68 : 1)} viewBox="0 0 48 48">
        <Dessin forme={forme} />
      </svg>
    </div>
  );
}
