import { FORMES, type Forme } from "@/lib/formes";

// Formes simples en aplats, sans contour (docs : CLAUDE.md, section Design).
const FEUILLE = "#2F6B2A";

function Dessin({ forme }: { forme: Forme }) {
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
    case "mandarine":
      return (
        <>
          <ellipse cx="24" cy="28" rx="16" ry="12.5" fill="#F08A24" />
          <path d="M24 15.5c2-4 7-4.5 9-3-2.5 3-6 4-9 3z" fill={FEUILLE} />
        </>
      );
    case "citron":
      return (
        <>
          <path d="M6 24c4-10 32-10 36 0-4 10-32 10-36 0z" fill="#6E9F2E" />
          <path d="M3 24h4M41 24h4" stroke="#3E5A18" strokeWidth="2.5" />
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
    case "avocat":
      return (
        <>
          <path d="M24 5c6 0 8 8 10 14 3 8 6 12 6 17 0 6-7 9-16 9S8 42 8 36c0-5 3-9 6-17 2-6 4-14 10-14z" fill="#3F6B2A" />
          <circle cx="24" cy="34" r="6" fill="#B9C98A" />
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
    case "corossol":
      return (
        <>
          <path d="M24 6c9 0 15 10 15 21s-7 17-15 17S9 38 9 27 15 6 24 6z" fill="#5E8C3A" />
          {[
            [18, 16], [28, 15], [23, 22], [15, 26], [31, 25], [20, 32], [28, 33], [24, 39],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#2F4F1C" />
          ))}
        </>
      );
    case "coco":
      return (
        <>
          <circle cx="24" cy="25" r="17" fill="#7A4E2D" />
          <circle cx="19" cy="20" r="2.2" fill="#3B2414" />
          <circle cx="27" cy="19" r="2.2" fill="#3B2414" />
          <circle cx="23" cy="26" r="2.2" fill="#3B2414" />
        </>
      );
    case "madd":
      return (
        <>
          <circle cx="24" cy="26" r="15" fill="#E3A23B" />
          <circle cx="18" cy="22" r="2" fill="#B7741C" />
          <circle cx="29" cy="28" r="2.4" fill="#B7741C" />
          <circle cx="22" cy="33" r="1.6" fill="#B7741C" />
          <path d="M24 11v-5" stroke="#5C3A1E" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "raisin":
      return (
        <>
          <path d="M24 9c2-4 6-5 9-4" stroke="#5C3A1E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {[
            [16, 15], [24, 14], [32, 15], [20, 22], [28, 22], [16, 29], [24, 29], [32, 29], [20, 36], [28, 36], [24, 42],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4.6" fill="#8DB04A" />
          ))}
        </>
      );
    case "autre":
      return <circle cx="24" cy="24" r="16" fill="#B89B66" />;
  }
}

/** Rond pâle de la couleur du fruit avec sa forme dessinée. */
export function FormeFruit({ forme, taille = 44 }: { forme: Forme; taille?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: taille, height: taille, background: FORMES[forme].fond }}
      aria-hidden="true"
    >
      <svg width={taille * 0.68} height={taille * 0.68} viewBox="0 0 48 48">
        <Dessin forme={forme} />
      </svg>
    </span>
  );
}
