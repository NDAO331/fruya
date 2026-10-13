import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Fruit, type FormeVideo } from "./Fruit";
import { entre, fcfa, Scene, styleMontant, Telephone, Titre, Toucher, useEntree } from "./outils";
import { C, POLICE } from "./theme";

// Durées des scènes (images, 30 par seconde).
export const DUREES = {
  accroche: 120,
  problemes: 120,
  logo: 90,
  caisse: 270,
  voix: 180,
  reseau: 180,
  pertes: 180,
  ardoise: 180,
  appel: 180,
};

/** Coche dessinée (le caractère ✓ s'affiche mal dans la police). */
function Coche({ couleur, taille }: { couleur: string; taille: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={couleur} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* 1 · Accroche : des fruits tombent, « Tu vends des fruits au marché ? » */
const CHUTE: { forme: FormeVideo; x: number; y: number; taille: number }[] = [
  { forme: "mangue", x: 90, y: 880, taille: 250 },
  { forme: "pasteque", x: 400, y: 800, taille: 290 },
  { forme: "banane", x: 740, y: 890, taille: 250 },
  { forme: "orange", x: 170, y: 1190, taille: 230 },
  { forme: "papaye", x: 450, y: 1170, taille: 240 },
  { forme: "ananas", x: 720, y: 1200, taille: 260 },
  { forme: "citron", x: 110, y: 1470, taille: 200 },
  { forme: "pomme", x: 780, y: 1480, taille: 210 },
];

export function Accroche() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene duree={DUREES.accroche}>
      <Titre debut={28} lignes={["Tu vends des fruits", "au marché ?"]} haut={260} />
      {CHUTE.map((f, i) => {
        const t = spring({ frame: frame - i * 5, fps, config: { damping: 11, stiffness: 90 } });
        const y = interpolate(t, [0, 1], [-400, f.y]);
        return (
          <div key={f.forme} style={{ position: "absolute", left: f.x, top: y, transform: `rotate(${(1 - t) * 40}deg)` }}>
            <Fruit forme={f.forme} taille={f.taille} />
          </div>
        );
      })}
    </Scene>
  );
}

/* 2 · Les problèmes, barrés un par un. */
const PROBLEMES = ["Cahier perdu", "Monnaie oubliée", "Mangues pourries"];

export function Problemes() {
  const frame = useCurrentFrame();
  const fin = useEntree(84, 40);
  return (
    <Scene duree={DUREES.problemes}>
      <div style={{ position: "absolute", top: 380, left: 90, right: 90 }}>
        {PROBLEMES.map((p, i) => {
          const entree = entre(frame, 8 + i * 18, 20 + i * 18);
          const barre = entre(frame, 24 + i * 18, 36 + i * 18);
          return (
            <div key={p} style={{ marginBottom: 90, opacity: entree, transform: `translateX(${(1 - entree) * -80}px)` }}>
              {/* Bloc à la largeur du texte : le trait rouge s'arrête au bout du mot. */}
              <span style={{ position: "relative", display: "inline-block", fontSize: 104, fontWeight: 800, color: C.encre }}>
                {p}
                <span
                  style={{
                    position: "absolute",
                    left: -12,
                    top: "54%",
                    height: 16,
                    width: `calc(${barre} * (100% + 24px))`,
                    background: C.alerte,
                    borderRadius: 8,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 300, left: 90, right: 90, ...fin.style }}>
        <div style={{ fontSize: 76, fontWeight: 800, color: C.alerte }}>Chaque jour, ça te coûte de l&apos;argent.</div>
      </div>
    </Scene>
  );
}

/* 3 · Apparition du logo. */
export function Logo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icone = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 110 } });
  const nom = useEntree(18, 40);
  const devise = useEntree(32, 30);
  return (
    <Scene duree={DUREES.logo}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 70 }}>
        <Img src={staticFile("fruya-icone.svg")} style={{ width: 340, height: 340, transform: `scale(${icone}) rotate(${(1 - icone) * -20}deg)` }} />
        <div style={nom.style}>
          <Img src={staticFile("fruya-logo-orange.svg")} style={{ width: 640 }} />
        </div>
        <div style={{ ...devise.style, fontSize: 60, fontWeight: 700, color: C.encre, textAlign: "center", padding: "0 80px" }}>
          La caisse des vendeurs de fruits
        </div>
        {frame < 0 && null}
      </div>
    </Scene>
  );
}

/* 4 · La caisse : Mangue -> 2,5 kg -> Encaisser -> Encaissé ! */
const LIGNES_CAISSE: { forme: FormeVideo; nom: string; prix: string; unite: string }[] = [
  { forme: "mangue", nom: "Mangue", prix: "750 F", unite: "le kg" },
  { forme: "banane", nom: "Banane", prix: "100 F", unite: "la pièce" },
  { forme: "pasteque", nom: "Pastèque", prix: "2 000 F", unite: "la pièce" },
  { forme: "orange", nom: "Orange", prix: "600 F", unite: "le kg" },
];

function EnteteCaisse({ total, nb }: { total: number; nb: number }) {
  return (
    <>
      <div style={{ padding: "44px 40px 20px", fontSize: 34, fontWeight: 800, color: C.encre }}>Fruits de Fatou</div>
      <div style={{ margin: "0 30px", borderRadius: 40, background: C.vert, padding: "30px 36px", color: "#fff" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.orangeClair }}>Ventes du jour</div>
        <div style={{ ...styleMontant, fontSize: 92, lineHeight: 1.05 }}>{fcfa(total)}</div>
        <div style={{ fontSize: 26, fontWeight: 600, opacity: 0.8 }}>{nb} ventes aujourd&apos;hui</div>
      </div>
    </>
  );
}

function LigneFruit({ forme, nom, prix, unite, active }: { forme: FormeVideo; nom: string; prix: string; unite: string; active?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 132,
        padding: "0 34px",
        borderBottom: `2px solid ${C.trait}`,
        background: active ? C.vertPale : C.fond,
      }}
    >
      <Fruit forme={forme} taille={88} />
      <div style={{ flex: 1, fontSize: 40, fontWeight: 800, color: C.encre }}>{nom}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...styleMontant, fontSize: 42, color: C.encre }}>{prix}</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.encreDoux }}>{unite}</div>
      </div>
    </div>
  );
}

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];

export function Caisse() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const saisie = frame < 95 ? "0" : frame < 110 ? "2" : frame < 125 ? "2," : "2,5";
  const montant = frame < 95 ? 0 : frame < 125 ? 1500 : 1875;
  const monteeFeuille = spring({ frame: frame - 60, fps, config: { damping: 20, stiffness: 140 } });
  const descente = entre(frame, 215, 232);
  const decalageFeuille = (1 - monteeFeuille) * 1000 + descente * 1000;
  const encaisse = frame >= 172;
  const coche = spring({ frame: frame - 172, fps, config: { damping: 10, stiffness: 140 } });
  const total = frame < 220 ? 18500 : Math.round(interpolate(frame, [220, 238], [18500, 20375], { extrapolateRight: "clamp" }));

  // Positions dans l'écran du téléphone (616 × 1136).
  const toucheX = (i: number) => 120 + (i % 3) * 188;
  const toucheY = (i: number) => 560 + Math.floor(i / 3) * 104;

  return (
    <Scene duree={DUREES.caisse}>
      <Titre debut={0} lignes={["Vends en 3 touchers."]} sous="Au kilo ou à la pièce." haut={110} />
      <Telephone bas={60} echelle={1.1}>
        <EnteteCaisse total={total} nb={frame < 220 ? 12 : 13} />
        <div style={{ marginTop: 26 }}>
          {LIGNES_CAISSE.map((l, i) => (
            <LigneFruit key={l.nom} {...l} active={i === 0 && frame >= 45 && frame < 215} />
          ))}
        </div>
        <Toucher x={300} y={432} debut={42} />

        {/* Panneau de vente qui monte du bas */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 900,
            background: C.fond,
            borderRadius: "56px 56px 0 0",
            boxShadow: "0 -1px 0 #ECEEF0",
            transform: `translateY(${decalageFeuille}px)`,
            padding: "36px 36px 0",
          }}
        >
          {!encaisse ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <Fruit forme="mangue" taille={84} />
                <div style={{ fontSize: 44, fontWeight: 800 }}>Mangue</div>
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
                <div style={{ flex: 1, border: `5px solid ${C.vert}`, borderRadius: 28, padding: "14px 22px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.encreDoux }}>Quantité</div>
                  <div style={{ ...styleMontant, fontSize: 66 }}>
                    {saisie} <span style={{ fontSize: 36 }}>kg</span>
                  </div>
                </div>
                <div style={{ flex: 1, background: C.gris, borderRadius: 28, padding: "14px 22px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.encreDoux }}>Prix le kg</div>
                  <div style={{ ...styleMontant, fontSize: 66 }}>750 F</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 26 }}>
                {TOUCHES.map((t) => (
                  <div key={t} style={{ height: 104, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 600 }}>
                    {t}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 6,
                  height: 116,
                  borderRadius: 34,
                  background: frame >= 160 && frame < 172 ? C.vertFonce : C.vert,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 40px",
                  fontSize: 44,
                  fontWeight: 800,
                }}
              >
                <span>Encaisser</span>
                <span style={{ ...styleMontant, fontSize: 56 }}>{fcfa(montant)}</span>
              </div>
              <Toucher x={toucheX(1)} y={toucheY(1) - 194} debut={92} />
              <Toucher x={toucheX(9)} y={toucheY(9) - 194} debut={107} />
              <Toucher x={toucheX(4)} y={toucheY(4) - 194} debut={122} />
              <Toucher x={300} y={790} debut={158} />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 70 }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: C.vert,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${coche})`,
                }}
              >
                <svg width="120" height="120" viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ marginTop: 40, fontSize: 66, fontWeight: 800 }}>Encaissé !</div>
              <div style={{ ...styleMontant, fontSize: 104 }}>1 875 F</div>
              <div style={{ fontSize: 32, fontWeight: 600, color: C.encreDoux }}>Mangue · 2,5 kg à 750 F</div>
            </div>
          )}
        </div>
      </Telephone>
    </Scene>
  );
}

/* 5 · La voix : « 2 kilos de mangues et 3 bananes » */
// Espaces insécables avant/après les guillemets : « » ne reste jamais seul en bout de ligne.
const PHRASE = "« 2 kilos de mangues et 3 bananes »";

export function Voix() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulsation = 1 + 0.07 * Math.sin(frame / 4);
  const lettres = Math.round(entre(frame, 22, 82, 0, PHRASE.length));
  const carte = spring({ frame: frame - 98, fps, config: { damping: 16 } });
  const bouton = useEntree(124, 30);
  return (
    <Scene duree={DUREES.voix}>
      <Titre debut={0} lignes={["Ou dis-le", "à voix haute."]} haut={150} />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 230,
            height: 230,
            borderRadius: "50%",
            background: C.orange,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${frame < 90 ? pulsation : 1})`,
          }}
        >
          <svg width="120" height="120" viewBox="0 0 24 24">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke={C.encre} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 850,
          left: 80,
          right: 80,
          background: C.gris,
          borderRadius: 40,
          padding: "34px 40px",
          fontSize: 54,
          fontWeight: 700,
          color: C.encre,
          minHeight: 120,
          opacity: entre(frame, 16, 24),
        }}
      >
        {PHRASE.slice(0, lettres)}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1130,
          left: 80,
          right: 80,
          border: `6px solid ${C.vert}`,
          borderRadius: 44,
          padding: "10px 36px",
          background: C.fond,
          opacity: carte,
          transform: `scale(${0.9 + 0.1 * carte})`,
        }}
      >
        {[
          { forme: "mangue" as const, nom: "Mangue", detail: "2 kg à 750 F", montant: "1 500 F" },
          { forme: "banane" as const, nom: "Banane", detail: "3 pièces à 100 F", montant: "300 F" },
        ].map((l, i) => (
          <div key={l.nom} style={{ display: "flex", alignItems: "center", gap: 24, height: 150, borderTop: i ? `2px solid ${C.trait}` : "none" }}>
            <Fruit forme={l.forme} taille={96} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 46, fontWeight: 800 }}>{l.nom}</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: C.encreDoux }}>{l.detail}</div>
            </div>
            <div style={{ ...styleMontant, fontSize: 50 }}>{l.montant}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1520,
          left: 80,
          right: 80,
          height: 140,
          borderRadius: 44,
          background: C.vert,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 50px",
          fontSize: 54,
          fontWeight: 800,
          ...bouton.style,
        }}
      >
        <span>Encaisser</span>
        <span style={{ ...styleMontant, fontSize: 68 }}>1 800 F</span>
      </div>
    </Scene>
  );
}

/* 6 · Sans réseau : en attente, puis tout est envoyé. */
export function Reseau() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const retour = frame >= 104;
  const bascule = spring({ frame: frame - 104, fps, config: { damping: 14 } });
  const carte = useEntree(24, 50);
  const barres = [0.35, 0.55, 0.75, 1];
  return (
    <Scene duree={DUREES.reseau}>
      <Titre debut={0} lignes={["Même sans réseau."]} sous="Tes ventes sont gardées dans le téléphone, puis envoyées toutes seules." haut={150} />
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 360, height: 300, display: "flex", alignItems: "flex-end", gap: 34 }}>
          {barres.map((h, i) => (
            <div
              key={i}
              style={{
                width: 62,
                height: 300 * h,
                borderRadius: 18,
                background: retour ? C.vert : "#D3D6D9",
                transform: retour ? `scaleY(${0.6 + 0.4 * bascule})` : "none",
                transformOrigin: "bottom",
              }}
            />
          ))}
          {!retour && (
            <div
              style={{
                position: "absolute",
                left: -20,
                top: 140,
                width: 420,
                height: 22,
                borderRadius: 11,
                background: C.alerte,
                transform: `rotate(34deg) scaleX(${entre(frame, 6, 18)})`,
              }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1100,
          left: 80,
          right: 80,
          borderRadius: 44,
          background: C.vert,
          color: "#fff",
          padding: "40px 46px",
          ...carte.style,
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, color: C.orangeClair }}>Ventes du jour</div>
        <div style={{ ...styleMontant, fontSize: 120, lineHeight: 1.05 }}>{fcfa(retour ? 22175 : 22175)}</div>
        <div
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "12px 28px",
            borderRadius: 999,
            fontSize: 36,
            fontWeight: 800,
            background: retour ? C.vertPale : C.creme,
            color: retour ? C.vert : C.orangeFonce,
          }}
        >
          {retour ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <Coche couleur={C.vert} taille={40} /> Tout est envoyé
            </span>
          ) : (
            "2 ventes en attente d'envoi"
          )}
        </div>
      </div>
    </Scene>
  );
}

/* 7 · Pertes en photo et caisse juste le soir. */
export function Pertes() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = 1 - entre(frame, 10, 22);
  const photo = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const etiquette = useEntree(40, 30);
  const soir = useEntree(96, 50);
  const juste = spring({ frame: frame - 122, fps, config: { damping: 10 } });
  return (
    <Scene duree={DUREES.pertes}>
      <Titre debut={0} lignes={["Chaque perte", "en photo."]} haut={130} />
      <div
        style={{
          position: "absolute",
          top: 470,
          left: 210,
          width: 660,
          padding: "30px 30px 100px",
          background: C.fond,
          border: `3px solid ${C.trait}`,
          borderRadius: 24,
          transform: `rotate(${-5 * photo}deg) scale(${0.7 + 0.3 * photo})`,
          opacity: photo,
        }}
      >
        <div style={{ position: "relative", height: 460, borderRadius: 14, background: "#6B4A2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Fruit forme="mangue" taille={380} rond={false} />
          {/* Taches : la mangue est abîmée */}
          {[
            [250, 250, 34],
            [320, 200, 22],
            [270, 300, 24],
          ].map(([x, y, r]) => (
            <div key={`${x}-${y}`} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: "50%", background: "#5A3410" }} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 30,
            right: 30,
            textAlign: "center",
            fontSize: 34,
            fontWeight: 800,
            color: C.alerte,
            ...etiquette.style,
          }}
        >
          Perte notée · Mangue 2 kg · Pourri
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: frame >= 10 ? flash : 0 }} />
      <div style={{ position: "absolute", top: 1260, left: 80, right: 80, ...soir.style }}>
        <div style={{ fontSize: 66, fontWeight: 800, color: C.encre, marginBottom: 26 }}>La caisse juste, chaque soir.</div>
        <div style={{ borderRadius: 40, background: C.gris, padding: "30px 40px" }}>
          {[
            ["Caisse théorique", "45 500 F"],
            ["Argent compté", "45 500 F"],
          ].map(([a, b]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 38, fontWeight: 700, padding: "8px 0" }}>
              <span>{a}</span>
              <span style={styleMontant}>{b}</span>
            </div>
          ))}
          <div
            style={{
              marginTop: 18,
              borderRadius: 26,
              background: C.vertPale,
              color: C.vert,
              fontSize: 46,
              fontWeight: 800,
              padding: "20px 28px",
              transform: `scale(${0.85 + 0.15 * juste})`,
              opacity: juste,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
              <Coche couleur={C.vert} taille={52} /> La caisse est juste
            </span>
          </div>
        </div>
      </div>
    </Scene>
  );
}

/* 8 · Ardoise et stock. */
export function Ardoise() {
  const dette = useEntree(20, 60);
  const stock = useEntree(70, 60);
  return (
    <Scene duree={DUREES.ardoise}>
      <Titre debut={0} lignes={["Qui te doit.", "Ce qu'il te reste."]} haut={130} />
      <div style={{ position: "absolute", top: 560, left: 80, right: 80, borderRadius: 48, background: C.creme, padding: "40px 46px", color: C.orangeFonce, ...dette.style }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.orange, color: C.encre, fontSize: 38, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
            AS
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.encre }}>Awa Sow</div>
        </div>
        <div style={{ marginTop: 26, fontSize: 38, fontWeight: 700 }}>Il te doit</div>
        <div style={{ ...styleMontant, fontSize: 130, lineHeight: 1 }}>3 500 F</div>
      </div>
      <div style={{ position: "absolute", top: 1110, left: 80, right: 80, borderRadius: 48, border: `3px solid ${C.trait}`, padding: "16px 40px", ...stock.style }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: C.encreDoux, padding: "14px 0" }}>Stock</div>
        {[
          { forme: "mangue" as const, nom: "Mangue", q: "12 kg", bas: false },
          { forme: "banane" as const, nom: "Banane", q: "40 pièces", bas: false },
          { forme: "orange" as const, nom: "Orange", q: "2 kg · stock bas", bas: true },
        ].map((l) => (
          <div key={l.nom} style={{ display: "flex", alignItems: "center", gap: 24, height: 136, borderTop: `2px solid ${C.trait}` }}>
            <Fruit forme={l.forme} taille={90} />
            <div style={{ flex: 1, fontSize: 44, fontWeight: 800 }}>{l.nom}</div>
            <div style={{ ...styleMontant, fontSize: 44, color: l.bas ? C.alerte : C.encre }}>{l.q}</div>
          </div>
        ))}
      </div>
    </Scene>
  );
}

/* 9 · Appel à l'action. */
export function Appel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const offre = useEntree(18, 50);
  const prix = useEntree(30, 40);
  const contact = useEntree(52, 40);
  return (
    <Scene duree={DUREES.appel} fond={C.vert}>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ background: C.fond, borderRadius: 60, padding: "50px 70px", transform: `scale(${logo})` }}>
          <Img src={staticFile("fruya-logo-orange.svg")} style={{ width: 520 }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 720, left: 80, right: 80, textAlign: "center", color: "#fff" }}>
        <div style={{ ...offre.style, fontSize: 104, fontWeight: 800, lineHeight: 1.05 }}>14 jours gratuits</div>
        <div style={{ ...prix.style, marginTop: 24, fontSize: 60, fontWeight: 700, color: C.orangeClair }}>puis 3 000 F par mois</div>
      </div>
      <div style={{ position: "absolute", top: 1180, left: 80, right: 80, textAlign: "center", color: "#fff", ...contact.style }}>
        <div style={{ fontSize: 46, fontWeight: 700 }}>Écris-nous sur WhatsApp</div>
        <div style={{ fontFamily: POLICE.montant, fontWeight: 800, fontSize: 130, letterSpacing: 2 }}>76 773 68 63</div>
        <div style={{ marginTop: 50, display: "inline-block", background: C.fond, color: C.vert, borderRadius: 999, padding: "22px 56px", fontSize: 54, fontWeight: 800 }}>
          fruya.vercel.app
        </div>
      </div>
    </Scene>
  );
}
