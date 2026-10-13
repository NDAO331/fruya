"use client";

import { createClient } from "@/lib/supabase/client";
import { baseLocale, type PerteLocale, type VenteLocale } from "./base";

// Envoi des ventes et pertes en attente vers le serveur.
// RÈGLE (supabase/migrations/001) : jamais d'upsert, uniquement les fonctions
// enregistrer_vente / enregistrer_perte / attacher_photo_perte, qui ignorent
// un id déjà reçu (renvoi après coupure).

type Supabase = ReturnType<typeof createClient>;

let enCours: Promise<number> | null = null;

// Erreurs définitives (refus par les règles du serveur) : exception levée par
// nos fonctions (P0001) ou donnée invalide (22xxx, 23xxx). Tout le reste
// (réseau, session expirée…) sera retenté plus tard.
function estDefinitive(code: string | undefined): boolean {
  return !!code && (code.startsWith("P0") || code.startsWith("22") || code.startsWith("23"));
}

/**
 * Envoie ventes, pertes puis photos en attente de cet utilisateur, des plus
 * anciennes aux plus récentes. Renvoie le nombre d'éléments envoyés.
 * Ce qui appartient à un autre compte (téléphone partagé) attend que ce
 * compte se reconnecte : rien n'est jamais envoyé au nom de quelqu'un d'autre.
 */
export function synchroniser(userId: string): Promise<number> {
  enCours ??= envoyerTout(userId).finally(() => {
    enCours = null;
  });
  return enCours;
}

async function envoyerTout(userId: string): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const supabase = createClient();

  const ventes = await envoyerVentes(supabase, userId);
  const pertes = await envoyerPertes(supabase, userId);
  const photos = await envoyerPhotos(supabase, userId);
  await purger();
  return ventes + pertes + photos;
}

async function envoyerVentes(supabase: Supabase, userId: string): Promise<number> {
  const base = baseLocale();
  const attente = (await base.ventes.where("etat").equals("en_attente").sortBy("date")).filter(
    (v: VenteLocale) => v.user_id === userId,
  );
  let envoyees = 0;

  for (const vente of attente) {
    const { error } = await supabase.rpc("enregistrer_vente", {
      p_id: vente.id,
      p_date: vente.date,
      p_methode: vente.methode,
      p_lignes: vente.lignes,
    });
    if (!error) {
      await base.ventes.update(vente.id, { etat: "envoyee", envoyee_le: new Date().toISOString() });
      envoyees++;
    } else if (estDefinitive(error.code)) {
      await base.ventes.update(vente.id, { etat: "refusee", erreur: error.message });
    } else {
      break; // réseau ou session : on réessaiera
    }
  }
  return envoyees;
}

async function envoyerPertes(supabase: Supabase, userId: string): Promise<number> {
  const base = baseLocale();
  const attente = (await base.pertes.where("etat").equals("en_attente").sortBy("date")).filter(
    (p: PerteLocale) => p.user_id === userId,
  );
  let envoyees = 0;

  for (const perte of attente) {
    const { error } = await supabase.rpc("enregistrer_perte", {
      p_id: perte.id,
      p_date: perte.date,
      p_product_id: perte.product_id,
      p_quantite: perte.quantite,
      p_unite: perte.unite,
      p_raison: perte.raison,
    });
    if (!error) {
      await base.pertes.update(perte.id, { etat: "envoyee" });
      envoyees++;
    } else if (estDefinitive(error.code)) {
      await base.pertes.update(perte.id, { etat: "refusee", erreur: error.message });
    } else {
      break;
    }
  }
  return envoyees;
}

// La photo part une fois la perte reçue par le serveur : d'abord le fichier
// (dossier de l'étal), puis son rattachement à la perte.
async function envoyerPhotos(supabase: Supabase, userId: string): Promise<number> {
  const base = baseLocale();
  const attente = (await base.pertes.where("etat").equals("envoyee").sortBy("date")).filter(
    (p: PerteLocale) => p.user_id === userId && !p.photo_envoyee && p.photo,
  );
  let envoyees = 0;

  for (const perte of attente) {
    const chemin = `${perte.stall_id}/${perte.id}.jpg`;
    const { error: erreurFichier } = await supabase.storage
      .from("pertes")
      .upload(chemin, perte.photo!, { contentType: perte.photo!.type || "image/jpeg", upsert: false });

    // Déjà reçu lors d'un essai précédent : on continue.
    const dejaLa = erreurFichier && "statusCode" in erreurFichier && erreurFichier.statusCode === "409";
    if (erreurFichier && !dejaLa) break;

    const { error } = await supabase.rpc("attacher_photo_perte", { p_id: perte.id, p_photo_url: chemin });
    if (error && !estDefinitive(error.code)) break;

    // Photo bien rangée (ou refus définitif) : on libère la place sur le téléphone.
    await base.pertes.update(perte.id, {
      photo: null,
      photo_envoyee: !error,
      erreur: error?.message,
    });
    if (!error) envoyees++;
  }
  return envoyees;
}

/** Ce qui est déjà envoyé n'est gardé que 2 jours sur le téléphone. */
async function purger() {
  const limite = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const base = baseLocale();
  await base.ventes
    .where("date")
    .below(limite)
    .filter((v) => v.etat === "envoyee")
    .delete();
  await base.pertes
    .where("date")
    .below(limite)
    .filter((p) => p.etat === "envoyee" && p.photo_envoyee)
    .delete();
}
