// Bruitages de la pub, synthétisés par code (libres de droits).
// Sortie : public/sons/*.wav (WAV 16 bits mono, 44,1 kHz).
import { mkdirSync, writeFileSync } from "node:fs";

const TAUX = 44100;
const dossier = new URL("../public/sons/", import.meta.url);
mkdirSync(dossier, { recursive: true });

let graine = 7;
const bruit = () => ((graine = (graine * 16807) % 2147483647) / 2147483647) * 2 - 1;
const sin = (f, t) => Math.sin(2 * Math.PI * f * t);

function ecrire(nom, duree, f, crete = 0.9) {
  const n = Math.round(TAUX * duree);
  const son = new Float32Array(n);
  for (let i = 0; i < n; i++) son[i] = f(i / TAUX, duree);
  const max = son.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(TAUX, 24);
  b.writeUInt32LE(TAUX * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round((son[i] / max) * crete * 32767), 44 + i * 2);
  writeFileSync(new URL(`${nom}.wav`, dossier), b);
}

// Toucher d'écran : petit clic sec.
ecrire("clic", 0.05, (t) => Math.exp(-t * 180) * (sin(1800, t) + 0.4 * bruit()));

// Apparition d'une carte : « pop » qui monte.
ecrire("pop", 0.12, (t) => Math.exp(-t * 35) * Math.min(1, t * 400) * sin(380 * t + 2600 * t * t, 1), 0.8);

// Encaissé : « ding » de caisse (deux notes de cloche).
ecrire("ding", 1.3, (t) => {
  const cloche = (f, t0) =>
    t < t0 ? 0 : Math.exp(-(t - t0) * 3.5) * (sin(f, t - t0) + 0.5 * sin(f * 2.76, t - t0) * Math.exp(-(t - t0) * 6));
  return cloche(1318.5, 0) + 0.9 * cloche(1975.5, 0.09);
});

// Photo de la perte : déclic d'appareil (deux claquements).
ecrire("declic", 0.18, (t) => {
  const claque = (t0) => (t < t0 ? 0 : Math.exp(-(t - t0) * 90) * bruit());
  return claque(0) + 0.7 * claque(0.07);
});

// Transition : souffle (bruit qui gonfle puis retombe, filtré).
{
  let a = 0;
  ecrire("souffle", 0.45, (t, d) => {
    const env = Math.sin((Math.PI * t) / d) ** 2;
    const coef = 0.05 + 0.25 * (t / d); // le souffle s'éclaircit
    a += coef * (bruit() - a);
    return env * a;
  }, 0.7);
}

// Problème barré : trait de feutre (bruit court et rugueux).
{
  let a = 0;
  ecrire("rature", 0.22, (t, d) => {
    a += 0.35 * (bruit() - a);
    return Math.sin((Math.PI * t) / d) * a * (0.7 + 0.3 * sin(55, t));
  }, 0.6);
}

// Réseau coupé / revenu : bip qui descend ou qui monte.
ecrire("bip-bas", 0.35, (t) => Math.exp(-t * 6) * Math.min(1, t * 300) * sin(880 * t - 500 * t * t, 1), 0.7);
ecrire("bip-haut", 0.35, (t) => Math.exp(-t * 6) * Math.min(1, t * 300) * sin(520 * t + 700 * t * t, 1), 0.7);

console.log("Bruitages écrits dans public/sons/");
