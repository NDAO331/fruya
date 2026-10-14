import QRCode from "qrcode";
import type { CSSProperties } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { styleMontant } from "./outils";
import { C, POLICE } from "./theme";

// Flyer A5 à imprimer (148 × 210 mm à 300 dpi = 1748 × 2480 px).
export const FLYER = { largeur: 1748, hauteur: 2480 };

const ADRESSE = "https://fruya.vercel.app";
const TELEPHONE = "76 773 68 63";

const abs = (left: number, top: number, extra: CSSProperties = {}): CSSProperties => ({ position: "absolute", left, top, ...extra });

function CodeQR({ taille }: { taille: number }) {
  const { modules } = QRCode.create(ADRESSE, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let chemin = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) chemin += `M${x} ${y}h1v1h-1z`;
  return (
    <svg width={taille} height={taille} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={chemin} fill={C.encre} />
    </svg>
  );
}

const GRILLE = ["mangues", "pasteques", "bananes", "oranges", "papaye", "marche"];

const AVEC_FRUYA = [
  "Encaisser en 3 touchers",
  "Espèces, Wave, Orange Money",
  "Marche sans réseau",
  "Pertes notées en photo",
  "Ardoise des clients et stock",
  "Facture envoyée par WhatsApp",
];

function IconeWhatsApp({ taille }: { taille: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48">
      <circle cx={24} cy={24} r={24} fill={C.vert} />
      <path
        d="M24 11a13 13 0 0 0-11.2 19.6L11 37l6.6-1.7A13 13 0 1 0 24 11z"
        fill="none"
        stroke="#fff"
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <path d="M19 18.5c.4-1 1.6-1 2 0l1 2.4-1.2 1.4a9 9 0 0 0 4.4 4.4l1.4-1.2 2.4 1c1 .4 1 1.6 0 2-3.4 2.2-10.8-5.2-10-10z" fill="#fff" />
    </svg>
  );
}

export function Flyer() {
  return (
    <AbsoluteFill style={{ background: C.vertFonce, fontFamily: POLICE.texte, color: "#fff", overflow: "hidden" }}>
      {/* Photo principale : un vendeur au marché (licence Unsplash, voir public/photos/CREDITS.md) */}
      <div style={abs(700, 0, { width: 1048, height: 1640, borderBottomLeftRadius: 560, overflow: "hidden" })}>
        <Img src={staticFile("photos/vendeur.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "36% 40%" }} />
      </div>
      <svg style={abs(0, 0)} width={1748} height={2480} viewBox="0 0 1748 2480">
        {/* Arc orange qui suit la photo, et vague décorative en bas */}
        <path d="M680 0V1080A560 560 0 0 0 1240 1640H1748" fill="none" stroke={C.orange} strokeWidth={16} />
        <path d="M0 2060C300 1990 520 2050 740 2130" fill="none" stroke={C.orange} strokeWidth={14} strokeLinecap="round" />
        <path d="M0 2105C260 2045 470 2095 660 2160" fill="none" stroke={C.orangeClair} strokeWidth={6} strokeLinecap="round" />
      </svg>

      {/* Marque et accroche */}
      <div style={abs(90, 100, { width: 560, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" })}>
        <Img src={staticFile("fruya-icone.svg")} style={{ width: 170, height: 170 }} />
        <Img src={staticFile("fruya-logo-orange.svg")} style={{ width: 500, marginTop: 24 }} />
        <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.1, marginTop: 18, color: C.orangeClair }}>
          La caisse des
          <br />
          vendeurs de fruits
        </div>
        <div style={{ width: 160, height: 6, background: C.orange, borderRadius: 3, margin: "30px 0" }} />
        <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.3 }}>
          Vends plus, perds moins,
          <br />
          compte juste.
        </div>
      </div>

      {/* Grille de vrais fruits */}
      <div style={abs(90, 860, { width: 590, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 })}>
        {GRILLE.map((p) => (
          <div key={p} style={{ height: 340, borderRadius: 40, overflow: "hidden", border: "6px solid #fff" }}>
            <Img src={staticFile(`photos/${p}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* Macaron « 14 jours gratuits » */}
      <div
        style={abs(1330, 1110, {
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: C.orange,
          border: "12px solid #fff",
          color: C.encre,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(10deg)",
          textAlign: "center",
          zIndex: 2,
        })}
      >
        <div style={{ ...styleMontant, fontSize: 124, lineHeight: 0.9 }}>14</div>
        <div style={{ ...styleMontant, fontSize: 48, lineHeight: 1 }}>JOURS</div>
        <div style={{ ...styleMontant, fontSize: 48, lineHeight: 1 }}>GRATUITS</div>
      </div>

      {/* Carte « Avec Fruya » */}
      <div
        style={abs(740, 1430, {
          width: 900,
          background: "#fff",
          color: C.encre,
          borderRadius: 48,
          padding: "86px 60px 50px",
          border: `8px solid ${C.orange}`,
        })}
      >
        <div
          style={{
            position: "absolute",
            top: -46,
            left: 60,
            background: C.orange,
            color: C.encre,
            fontSize: 50,
            fontWeight: 800,
            padding: "14px 40px",
            borderRadius: 24,
          }}
        >
          Avec Fruya, tu peux…
        </div>
        {AVEC_FRUYA.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 48, fontWeight: 700, lineHeight: 1.75 }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, background: C.orange, flex: "none" }} />
            {t}
          </div>
        ))}
        <div style={{ marginTop: 18, paddingTop: 22, borderTop: `3px solid ${C.trait}`, fontSize: 46, fontWeight: 700 }}>
          Puis <span style={{ ...styleMontant, color: C.vert }}>3 000 F</span> par mois seulement
        </div>
      </div>

      {/* Barre de contact */}
      <div
        style={abs(90, 2190, {
          right: 90,
          height: 236,
          background: "#fff",
          color: C.encre,
          borderRadius: 60,
          display: "flex",
          alignItems: "center",
          padding: "0 22px 0 40px",
          gap: 28,
        })}
      >
        <IconeWhatsApp taille={104} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.encreDoux }}>Appelle ou WhatsApp</div>
          <div style={{ ...styleMontant, fontSize: 76, lineHeight: 1 }}>{TELEPHONE}</div>
        </div>
        <div style={{ width: 4, height: 110, background: C.trait }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.encreDoux }}>Scanne pour essayer</div>
          <div style={{ fontSize: 46, fontWeight: 800 }}>fruya.vercel.app</div>
        </div>
        <CodeQR taille={206} />
      </div>
    </AbsoluteFill>
  );
}
