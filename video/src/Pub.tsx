import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Accroche, Appel, Ardoise, Caisse, DUREES, Logo, Pertes, Problemes, Reseau, Voix } from "./scenes";
import { C } from "./theme";

// Enchaînement des scènes de la publicité (≈ 50 s, vertical 9:16).
const ORDRE = [
  { cle: "accroche", Composant: Accroche },
  { cle: "problemes", Composant: Problemes },
  { cle: "logo", Composant: Logo },
  { cle: "caisse", Composant: Caisse },
  { cle: "voix", Composant: Voix },
  { cle: "reseau", Composant: Reseau },
  { cle: "pertes", Composant: Pertes },
  { cle: "ardoise", Composant: Ardoise },
  { cle: "appel", Composant: Appel },
] as const;

export const DUREE_TOTALE = ORDRE.reduce((s, e) => s + DUREES[e.cle], 0);

// Début de chaque scène dans la vidéo (en images).
const DEBUT = Object.fromEntries(
  ORDRE.map((e, i) => [e.cle, ORDRE.slice(0, i).reduce((s, p) => s + DUREES[p.cle], 0)]),
) as Record<(typeof ORDRE)[number]["cle"], number>;

type Son = "clic" | "pop" | "ding" | "declic" | "souffle" | "rature" | "bip-bas" | "bip-haut";

// Bruitages calés sur les animations : [scène, image dans la scène, son, volume].
// Sons synthétisés par code : scripts/sons.mjs.
const BRUITAGES: [keyof typeof DEBUT, number, Son, number][] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): [keyof typeof DEBUT, number, Son, number] => ["accroche", 6 + i * 5, "pop", 0.35]),
  ["accroche", 28, "souffle", 0.5],
  ["problemes", 8, "pop", 0.4],
  ["problemes", 26, "pop", 0.4],
  ["problemes", 44, "pop", 0.4],
  ["problemes", 24, "rature", 0.6],
  ["problemes", 42, "rature", 0.6],
  ["problemes", 60, "rature", 0.6],
  ["logo", 0, "souffle", 0.6],
  ["logo", 6, "pop", 0.6],
  ["logo", 18, "pop", 0.4],
  ["caisse", 0, "souffle", 0.4],
  ["caisse", 42, "clic", 0.7],
  ["caisse", 60, "souffle", 0.3],
  ["caisse", 92, "clic", 0.7],
  ["caisse", 107, "clic", 0.7],
  ["caisse", 122, "clic", 0.7],
  ["caisse", 158, "clic", 0.8],
  ["caisse", 172, "ding", 0.8],
  ["voix", 0, "souffle", 0.4],
  ["voix", 98, "pop", 0.5],
  ["voix", 124, "clic", 0.6],
  ["reseau", 0, "souffle", 0.4],
  ["reseau", 6, "bip-bas", 0.5],
  ["reseau", 24, "pop", 0.4],
  ["reseau", 104, "bip-haut", 0.5],
  ["pertes", 0, "souffle", 0.4],
  ["pertes", 10, "declic", 0.8],
  ["pertes", 40, "pop", 0.4],
  ["pertes", 96, "pop", 0.4],
  ["pertes", 122, "ding", 0.6],
  ["ardoise", 0, "souffle", 0.4],
  ["ardoise", 20, "pop", 0.5],
  ["ardoise", 70, "pop", 0.5],
  ["appel", 0, "souffle", 0.5],
  ["appel", 4, "pop", 0.6],
  ["appel", 30, "ding", 0.6],
  ["appel", 52, "pop", 0.5],
];

export function Pub() {
  let debut = 0;
  return (
    <AbsoluteFill style={{ background: C.fond }}>
      {/* Musique de fond composée par code : scripts/musique.mjs */}
      <Audio src={staticFile("musique.wav")} volume={0.45} />
      {BRUITAGES.map(([scene, image, son, volume], i) => (
        <Sequence key={`son-${i}`} from={DEBUT[scene] + image} layout="none">
          <Audio src={staticFile(`sons/${son}.wav`)} volume={volume} />
        </Sequence>
      ))}
      {ORDRE.map(({ cle, Composant }) => {
        const from = debut;
        debut += DUREES[cle];
        return (
          <Sequence key={cle} from={from} durationInFrames={DUREES[cle]}>
            <Composant />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
