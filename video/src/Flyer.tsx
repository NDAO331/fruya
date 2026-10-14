import QRCode from "qrcode";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Fruit, type FormeVideo } from "./Fruit";
import { styleMontant } from "./outils";
import { C, POLICE } from "./theme";

// Flyer A5 à imprimer (148 × 210 mm à 300 dpi = 1748 × 2480 px).
export const FLYER = { largeur: 1748, hauteur: 2480 };

const ADRESSE = "https://fruya.vercel.app";
const TELEPHONE = "76 773 68 63";

const FRUITS: FormeVideo[] = ["mangue", "banane", "pasteque", "orange", "papaye", "ananas"];

const AVANTAGES: [string, string][] = [
  ["Encaisse en 3 touchers", "Au kilo ou à la pièce, à la main ou à la voix."],
  ["Espèces, Wave, Orange Money", "Le soir, tu sais si ta caisse est juste."],
  ["Marche sans réseau", "Tout part tout seul quand le réseau revient."],
  ["Pertes, ardoise et stock", "Tes vendeurs ont leur compte : tu vois tout."],
];

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

function Pastille({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        background: C.orange,
        color: C.encre,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 60,
        flex: "none",
        ...styleMontant,
      }}
    >
      {children}
    </div>
  );
}

export function Flyer() {
  return (
    <AbsoluteFill style={{ background: C.fond, fontFamily: POLICE.texte, color: C.encre, padding: "110px 90px 70px", display: "flex", flexDirection: "column" }}>
      {/* En-tête : logo, accroche */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <Img src={staticFile("fruya-icone.svg")} style={{ width: 180, height: 180 }} />
          <Img src={staticFile("fruya-logo-orange.svg")} style={{ width: 480 }} />
        </div>
        <p style={{ margin: "56px 0 0", fontSize: 116, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1 }}>
          La caisse des
          <br />
          vendeurs de fruits
        </p>
        <p style={{ margin: "28px 0 0", fontSize: 50, fontWeight: 600, lineHeight: 1.3 }}>
          Nanga def ? Encaisse, note tes pertes et ton ardoise,
          <br />
          même sans réseau.
        </p>
        <div style={{ display: "flex", gap: 30, marginTop: 50 }}>
          {FRUITS.map((f) => (
            <Fruit key={f} forme={f} taille={150} />
          ))}
        </div>
      </div>

      {/* Avantages */}
      <div style={{ padding: "64px 60px 0", display: "flex", flexDirection: "column", gap: 34 }}>
        {AVANTAGES.map(([titre, detail], i) => (
          <div key={titre} style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <Pastille>{i + 1}</Pastille>
            <div>
              <p style={{ margin: 0, fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{titre}</p>
              <p style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 600, color: C.encreDoux }}>{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Offre, contact, QR code */}
      <div
        style={{
          marginTop: "auto",
          background: C.vert,
          borderRadius: 64,
          padding: "60px 70px",
          display: "flex",
          alignItems: "center",
          gap: 60,
          color: "#fff",
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 116, lineHeight: 1, color: C.orangeClair, ...styleMontant }}>14 jours gratuits</p>
          <p style={{ margin: "18px 0 0", fontSize: 58, fontWeight: 700 }}>
            puis <span style={styleMontant}>3 000 F</span> par mois
          </p>
          <p style={{ margin: "44px 0 0", fontSize: 42, fontWeight: 600 }}>Appelle ou écris sur WhatsApp</p>
          <p style={{ margin: "4px 0 0", fontSize: 92, lineHeight: 1.05, ...styleMontant }}>{TELEPHONE}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ background: "#fff", borderRadius: 32, padding: 22 }}>
            <CodeQR taille={360} />
          </div>
          <p style={{ margin: 0, fontSize: 44, fontWeight: 800 }}>Scanne pour essayer</p>
        </div>
      </div>

      <p
        style={{
          margin: "44px 0 0",
          textAlign: "center",
          fontSize: 46,
          fontWeight: 700,
        }}
      >
        fruya.vercel.app · Jërëjëf !
      </p>
    </AbsoluteFill>
  );
}
