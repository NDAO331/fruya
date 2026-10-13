// Analyses simples, sans IA (PRD 4.6), calculées à partir des totaux par
// fruit renvoyés par le serveur (fonctions ventes_par_fruit / pertes_par_fruit).

import type { Forme } from "./formes";
import type { Unite } from "./types";

export type LigneVentes = { product_id: string; unite: Unite; quantite: number; montant: number };
export type LignePertes = { product_id: string; unite: Unite; quantite: number; valeur: number };
export type LigneAchats = { product_id: string; unite: Unite; quantite: number; montant: number };
export type FruitAnalyse = { id: string; nom: string; forme: Forme };

export type StatFruit = {
  fruit: FruitAnalyse;
  montantVentes: number;
  valeurPertes: number;
  valeurPertesAvant: number;
  // Quantités par unité (kg et pièces ne s'additionnent pas).
  vendu: Record<Unite, number>;
  perdu: Record<Unite, number>;
  tauxPerte: number | null; // pertes / ventes, dans la même unité (en %)
  montantParUnite: Record<Unite, number>;
  // Marge (PRD 4.6 / 4.9) : chiffre d'affaires − coût d'achat des quantités
  // vendues, au prix d'achat moyen des arrivages du mois, dans l'unité de
  // stock. null si aucun arrivage ce mois-ci.
  prixAchatMoyen: number | null;
  marge: number | null;
};

export type Analyse = {
  totalMois: number;
  totalAvant: number;
  evolution: number | null; // en %
  parFruit: StatFruit[]; // triés du plus vendu au moins vendu (en montant)
  pertesValeur: number;
  pertesQuantite: Record<Unite, number>;
  messages: string[];
};

const SEUIL_HAUSSE_PERTES = 20; // %
const SEUIL_TAUX_PERTE = 10; // %
const SEUIL_EVOLUTION = 10; // %

function pourcentage(nouveau: number, ancien: number): number | null {
  return ancien > 0 ? Math.round(((nouveau - ancien) / ancien) * 100) : null;
}

export function analyser(
  fruits: FruitAnalyse[],
  ventes: LigneVentes[],
  ventesAvant: LigneVentes[],
  pertes: LignePertes[],
  pertesAvant: LignePertes[],
  achats: LigneAchats[] = [],
): Analyse {
  const stats = new Map<string, StatFruit>();
  const stat = (id: string) => {
    if (!stats.has(id)) {
      const fruit = fruits.find((f) => f.id === id) ?? { id, nom: "Fruit retiré", forme: "autre" as Forme };
      stats.set(id, {
        fruit,
        montantVentes: 0,
        valeurPertes: 0,
        valeurPertesAvant: 0,
        vendu: { kg: 0, piece: 0 },
        perdu: { kg: 0, piece: 0 },
        tauxPerte: null,
        montantParUnite: { kg: 0, piece: 0 },
        prixAchatMoyen: null,
        marge: null,
      });
    }
    return stats.get(id)!;
  };

  for (const v of ventes) {
    const s = stat(v.product_id);
    s.montantVentes += Number(v.montant);
    s.montantParUnite[v.unite] += Number(v.montant);
    s.vendu[v.unite] += Number(v.quantite);
  }
  for (const a of achats) {
    const s = stat(a.product_id);
    const quantite = Number(a.quantite);
    if (quantite <= 0) continue;
    s.prixAchatMoyen = Number(a.montant) / quantite;
    s.marge = Math.round(s.montantParUnite[a.unite] - s.vendu[a.unite] * s.prixAchatMoyen);
  }
  for (const p of pertes) {
    const s = stat(p.product_id);
    s.valeurPertes += Number(p.valeur);
    s.perdu[p.unite] += Number(p.quantite);
  }
  for (const p of pertesAvant) {
    if (stats.has(p.product_id)) stats.get(p.product_id)!.valeurPertesAvant += Number(p.valeur);
  }

  for (const s of stats.values()) {
    // Taux de perte : dans l'unité où le fruit a le plus de mouvements.
    const unite: Unite = s.vendu.kg + s.perdu.kg >= s.vendu.piece + s.perdu.piece ? "kg" : "piece";
    const vendu = s.vendu[unite];
    const perdu = s.perdu[unite];
    s.tauxPerte = vendu > 0 ? Math.round((perdu / vendu) * 100) : perdu > 0 ? null : 0;
  }

  const parFruit = [...stats.values()].sort((a, b) => b.montantVentes - a.montantVentes);
  const totalMois = ventes.reduce((s, v) => s + Number(v.montant), 0);
  const totalAvant = ventesAvant.reduce((s, v) => s + Number(v.montant), 0);
  const evolution = pourcentage(totalMois, totalAvant);

  // Messages automatiques basés sur des seuils.
  const messages: string[] = [];
  if (evolution !== null && Math.abs(evolution) >= SEUIL_EVOLUTION) {
    messages.push(
      evolution > 0
        ? `Tes ventes ont augmenté de ${evolution} % par rapport au mois dernier.`
        : `Tes ventes ont baissé de ${-evolution} % par rapport au mois dernier.`,
    );
  }
  for (const s of parFruit) {
    const hausse = pourcentage(s.valeurPertes, s.valeurPertesAvant);
    if (hausse !== null && hausse >= SEUIL_HAUSSE_PERTES) {
      messages.push(`Tes pertes de ${s.fruit.nom.toLowerCase()} ont augmenté de ${hausse} % ce mois-ci.`);
    }
    if (s.tauxPerte !== null && s.tauxPerte >= SEUIL_TAUX_PERTE) {
      messages.push(`${s.fruit.nom} : ${s.tauxPerte} % des quantités vendues sont perdues. Achète-en un peu moins ou vends-les plus vite.`);
    }
  }

  return {
    totalMois,
    totalAvant,
    evolution,
    parFruit,
    pertesValeur: pertes.reduce((s, p) => s + Number(p.valeur), 0),
    pertesQuantite: {
      kg: pertes.filter((p) => p.unite === "kg").reduce((s, p) => s + Number(p.quantite), 0),
      piece: pertes.filter((p) => p.unite === "piece").reduce((s, p) => s + Number(p.quantite), 0),
    },
    messages,
  };
}
