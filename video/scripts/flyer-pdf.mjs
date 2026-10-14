// Met l'affiche (JPEG 1748 × 2480, 300 dpi) dans un PDF au format A5 exact,
// sans bibliothèque : une page, une image en DCTDecode.
import { readFileSync, writeFileSync } from "node:fs";

const jpeg = readFileSync(new URL("../sortie/fruya-flyer-a5.jpg", import.meta.url));
const [L, H] = [1748, 2480];
const [PL, PH] = [419.53, 595.28]; // A5 en points (148 × 210 mm)

const contenu = `q ${PL} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
const objets = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PL} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  null, // image
  `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
];

const morceaux = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
const positions = [];
let taille = morceaux[0].length;
objets.forEach((o, i) => {
  positions.push(taille);
  const corps =
    o === null
      ? Buffer.concat([
          Buffer.from(
            `${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${L} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
            "latin1",
          ),
          jpeg,
          Buffer.from("\nendstream\nendobj\n", "latin1"),
        ])
      : Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, "latin1");
  morceaux.push(corps);
  taille += corps.length;
});
const xref =
  `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n` +
  positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("") +
  `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${taille}\n%%EOF\n`;
morceaux.push(Buffer.from(xref, "latin1"));

writeFileSync(new URL("../sortie/fruya-flyer-a5.pdf", import.meta.url), Buffer.concat(morceaux));
console.log("sortie/fruya-flyer-a5.pdf");
