"use client";

import Dexie, { type EntityTable } from "dexie";
import type { Paiement, Unite } from "@/lib/types";

// Base locale du téléphone (IndexedDB) : toute vente et toute perte y est
// enregistrée d'abord, puis envoyée au serveur dès que le réseau est là
// (PRD 4.1).

export type LigneVente = {
  product_id: string;
  quantite: number;
  unite: Unite;
  prix_unitaire: number;
};

export type EtatEnvoi = "en_attente" | "envoyee" | "refusee";

export type VenteLocale = {
  id: string; // généré sur le téléphone : un renvoi ne crée pas de doublon
  stall_id: string;
  user_id: string;
  date: string; // ISO, heure du téléphone
  methode: "manuelle" | "vocale";
  paiement?: Paiement; // absent sur les ventes d'avant : espèces
  lignes: LigneVente[];
  montant_total: number; // calcul local ; le serveur recalcule
  resume: string; // « Mangue · 2,5 kg à 750 F »
  etat: EtatEnvoi;
  envoyee_le?: string;
  erreur?: string;
  annulee?: boolean; // annulée sur le serveur (jamais supprimée)
};

export type PerteLocale = {
  id: string;
  stall_id: string;
  user_id: string;
  date: string;
  product_id: string;
  quantite: number;
  unite: Unite;
  raison: string | null;
  resume: string; // « Mangue · 2 kg · Pourri »
  etat: EtatEnvoi;
  erreur?: string;
  // La perte est enregistrée tout de suite, la photo suit (PRD 4.1) :
  // gardée ici jusqu'à son envoi, puis effacée du téléphone.
  photo: Blob | null;
  photo_envoyee: boolean;
  annulee?: boolean;
};

class BaseFruya extends Dexie {
  ventes!: EntityTable<VenteLocale, "id">;
  pertes!: EntityTable<PerteLocale, "id">;

  constructor() {
    super("fruya");
    this.version(1).stores({ ventes: "id, etat, date, user_id, stall_id" });
    this.version(2).stores({
      ventes: "id, etat, date, user_id, stall_id",
      pertes: "id, etat, date, user_id, stall_id",
    });
  }
}

let instance: BaseFruya | null = null;

/** Base locale, ouverte uniquement dans le navigateur. */
export function baseLocale(): BaseFruya {
  if (typeof window === "undefined") {
    throw new Error("La base locale n'existe que dans le navigateur.");
  }
  instance ??= new BaseFruya();
  return instance;
}

/** Identifiant unique, même hors HTTPS (randomUUID n'y est pas disponible). */
export function nouvelId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const o = crypto.getRandomValues(new Uint8Array(16));
  o[6] = (o[6] & 0x0f) | 0x40;
  o[8] = (o[8] & 0x3f) | 0x80;
  const h = Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
