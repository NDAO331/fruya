// Entités du modèle de données (docs/PRD.md, section 6).
import type { Forme } from "@/lib/formes";

export type Role = "vendeur" | "gerant" | "admin";
export type Unite = "kg" | "piece";

export type Profil = {
  id: string;
  telephone: string;
  nom: string;
  role: Role;
  stall_id: string | null;
};

export type Etal = {
  id: string;
  nom: string;
  gerant_id: string;
  date_inscription: string;
  date_fin_acces: string;
  bloque: boolean;
  raison_blocage: string | null;
};

export type Fruit = {
  id: string;
  stall_id: string;
  nom: string;
  unite_defaut: Unite;
  forme: Forme;
  prix_kg: number | null;
  prix_piece: number | null;
  dernier_prix_kg: number | null;
  dernier_prix_piece: number | null;
  actif: boolean;
};

/** Résultat renvoyé par les Server Actions de formulaire. */
export type EtatFormulaire = { erreur?: string; succes?: string } | null;
