import { AbsoluteFill, Sequence } from "remotion";
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

export function Pub() {
  let debut = 0;
  return (
    <AbsoluteFill style={{ background: C.fond }}>
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
