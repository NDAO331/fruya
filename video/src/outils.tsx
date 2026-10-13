import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, POLICE } from "./theme";

/** Entrée douce (ressort) à partir de l'image `debut` : opacité + glissement. */
export function useEntree(debut: number, decalage = 60): { style: CSSProperties; t: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - debut, fps, config: { damping: 18, stiffness: 120 } });
  return { t, style: { opacity: t, transform: `translateY(${(1 - t) * decalage}px)` } };
}

/** Valeur qui passe de a à b entre deux images (bornée). */
export function entre(frame: number, debut: number, fin: number, a = 0, b = 1): number {
  return interpolate(frame, [debut, fin], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** Fondu d'entrée et de sortie d'une scène de `duree` images. */
export function Scene({ duree, fond = C.fond, children }: { duree: number; fond?: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacite = Math.min(entre(frame, 0, 8), entre(frame, duree - 8, duree, 1, 0));
  return <AbsoluteFill style={{ background: fond, opacity: opacite, fontFamily: POLICE.texte }}>{children}</AbsoluteFill>;
}

/** Grand titre de scène, en haut. */
export function Titre({
  debut,
  lignes,
  sous,
  couleur = C.encre,
  couleurSous = C.encreDoux,
  haut = 170,
}: {
  debut: number;
  lignes: string[];
  sous?: string;
  couleur?: string;
  couleurSous?: string;
  haut?: number;
}) {
  return (
    <div style={{ position: "absolute", top: haut, left: 80, right: 80 }}>
      {lignes.map((l, i) => (
        <Ligne key={i} debut={debut + i * 6}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.04, color: couleur, letterSpacing: -1 }}>{l}</div>
        </Ligne>
      ))}
      {sous && (
        <Ligne debut={debut + lignes.length * 6 + 6}>
          <div style={{ marginTop: 24, fontSize: 50, fontWeight: 600, lineHeight: 1.2, color: couleurSous }}>{sous}</div>
        </Ligne>
      )}
    </div>
  );
}

function Ligne({ debut, children }: { debut: number; children: ReactNode }) {
  const { style } = useEntree(debut, 50);
  return <div style={style}>{children}</div>;
}

/** Téléphone stylisé (cadre noir, écran blanc), centré en bas. */
export function Telephone({ children, bas = 120, echelle = 1 }: { children: ReactNode; bas?: number; echelle?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: bas,
        width: 660,
        height: 1180,
        transform: `translateX(-50%) scale(${echelle})`,
        transformOrigin: "bottom center",
        borderRadius: 86,
        background: C.encre,
        padding: 22,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 66, background: C.fond, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

/** Doigt qui touche l'écran : un rond qui apparaît puis se resserre. */
export function Toucher({ x, y, debut }: { x: number; y: number; debut: number }) {
  const frame = useCurrentFrame();
  const t = entre(frame, debut, debut + 10);
  const fin = entre(frame, debut + 10, debut + 22, 1, 0);
  const visible = frame >= debut && frame <= debut + 22;
  if (!visible) return null;
  const taille = 110 - t * 30;
  return (
    <div
      style={{
        position: "absolute",
        left: x - taille / 2,
        top: y - taille / 2,
        width: taille,
        height: taille,
        borderRadius: "50%",
        background: "rgba(21,23,26,0.18)",
        border: "6px solid rgba(21,23,26,0.35)",
        opacity: Math.min(t * 2, fin),
      }}
    />
  );
}

/** Montant formaté à la française : 18 500 F */
export function fcfa(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} F`;
}

export const styleMontant: CSSProperties = { fontFamily: POLICE.montant, fontWeight: 800, fontVariantNumeric: "tabular-nums" };
