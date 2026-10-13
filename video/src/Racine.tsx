import { Composition } from "remotion";
import { DUREE_TOTALE, Pub } from "./Pub";
import { FPS, HAUTEUR, LARGEUR } from "./theme";

export function Racine() {
  return <Composition id="Pub" component={Pub} durationInFrames={DUREE_TOTALE} fps={FPS} width={LARGEUR} height={HAUTEUR} />;
}
