// Musique de fond de la pub, composée par code (libre de droits) :
// marimba en arpèges, basse ronde, grosse caisse douce, shaker.
// Do majeur, 112 BPM, grille Do – Sol – La mineur – Fa.
// Sortie : public/musique.wav (WAV 16 bits mono, 44,1 kHz, 50 s).
import { writeFileSync } from "node:fs";

const TAUX = 44100;
const DUREE = 50;
const BPM = 112;
const TEMPS = 60 / BPM;
const N = Math.round(TAUX * DUREE);
const son = new Float32Array(N);

const note = (demiTons) => 261.63 * 2 ** (demiTons / 12); // 0 = do4
const ACCORDS = [
  [0, 4, 7], // Do
  [-5, -1, 2], // Sol
  [-3, 0, 4], // La mineur
  [-7, -3, 0], // Fa
];

function ajouter(debut, duree, f) {
  const i0 = Math.round(debut * TAUX);
  const n = Math.min(Math.round(duree * TAUX), N - i0);
  for (let i = 0; i < n; i++) son[i0 + i] += f(i / TAUX);
}

const marimba = (freq, vol) => (t) =>
  vol * Math.exp(-t * 7) * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.exp(-t * 30) * Math.sin(2 * Math.PI * freq * 4 * t));
const basse = (freq, vol) => (t) => vol * Math.min(1, t * 200) * Math.exp(-t * 3) * (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t)); // harmonique : audible sur un haut-parleur de téléphone
const caisse = (vol) => (t) => vol * Math.exp(-t * 18) * Math.sin(2 * Math.PI * (45 * t + (75 / 30) * (1 - Math.exp(-t * 30)))); // 120 → 45 Hz

// Bruit blanc filtré (passe-haut simple) pour le shaker.
let graine = 1;
const hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647) * 2 - 1;
function shaker(debut, vol) {
  let prec = 0;
  ajouter(debut, 0.08, (t) => {
    const b = hasard();
    const h = b - prec;
    prec = b;
    return vol * Math.exp(-t * 60) * h;
  });
}

const MOTIF = [0, 1, 2, 1, 0, 2, 1, 2]; // ordre des notes de l'accord, en croches
const nbTemps = Math.floor(DUREE / TEMPS);

for (let b = 0; b < nbTemps; b++) {
  const debut = b * TEMPS;
  const mesure = Math.floor(b / 4);
  const accord = ACCORDS[mesure % 4];
  const dansMesure = b % 4;

  // Marimba : deux croches par temps, une octave au-dessus une mesure sur deux.
  for (let c = 0; c < 2; c++) {
    const k = MOTIF[(dansMesure * 2 + c) % 8];
    const octave = mesure % 2 === 1 && c === 1 ? 12 : 0;
    ajouter(debut + (c * TEMPS) / 2, 0.6, marimba(note(accord[k] + octave), c === 0 ? 0.32 : 0.24));
  }

  // Basse : fondamentale sur les temps 1 et 3, petite relance sur le « et » du 4.
  const fondamentale = note(accord[0] - 24);
  if (dansMesure === 0 || dansMesure === 2) ajouter(debut, TEMPS * 1.5, basse(fondamentale, 0.45));
  if (dansMesure === 3) ajouter(debut + TEMPS / 2, TEMPS / 2, basse(fondamentale * 1.5, 0.25));

  // Percussions, après l'accroche (2 mesures) pour une entrée en douceur.
  if (mesure >= 2) {
    if (dansMesure === 0 || dansMesure === 2) ajouter(debut, 0.3, caisse(0.55));
    shaker(debut + TEMPS / 2, 0.18);
    if (dansMesure === 1 || dansMesure === 3) shaker(debut, 0.1);
  }
}

// Fondu d'entrée (0,5 s) et de sortie (3 s), puis normalisation à -1 dB.
for (let i = 0; i < N; i++) {
  const t = i / TAUX;
  son[i] *= Math.min(1, t / 0.5, (DUREE - t) / 3);
}
const crete = son.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const gain = 0.89 / crete;

const donnees = Buffer.alloc(44 + N * 2);
donnees.write("RIFF", 0);
donnees.writeUInt32LE(36 + N * 2, 4);
donnees.write("WAVEfmt ", 8);
donnees.writeUInt32LE(16, 16);
donnees.writeUInt16LE(1, 20); // PCM
donnees.writeUInt16LE(1, 22); // mono
donnees.writeUInt32LE(TAUX, 24);
donnees.writeUInt32LE(TAUX * 2, 28);
donnees.writeUInt16LE(2, 32);
donnees.writeUInt16LE(16, 34);
donnees.write("data", 36);
donnees.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) donnees.writeInt16LE(Math.round(Math.max(-1, Math.min(1, son[i] * gain)) * 32767), 44 + i * 2);

writeFileSync(new URL("../public/musique.wav", import.meta.url), donnees);
console.log(`musique.wav : ${DUREE} s, ${(donnees.length / 1e6).toFixed(1)} Mo`);
