"use server";

import { revalidatePath } from "next/cache";
import { majuscule } from "@/lib/format";
import { exigerRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emailDepuisTelephone, normaliserTelephone, pinValide } from "@/lib/telephone";
import type { EtatFormulaire } from "@/lib/types";

// Création d'un compte vendeur avec la clé secrète.
// Sécurité (docs/A_FAIRE.md) : l'étal n'est jamais lu depuis le formulaire.
// Il vient du profil de l'utilisateur connecté, et on vérifie en base que
// cet utilisateur est bien le gérant de cet étal avant d'utiliser la clé.
export async function creerVendeur(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const profil = await exigerRole(["gerant"]);

  const supabase = await createClient();
  const { data: etal } = await supabase
    .from("stalls")
    .select("id")
    .eq("id", profil.stall_id!)
    .eq("gerant_id", profil.id)
    .maybeSingle();
  if (!etal) return { erreur: "Seul le gérant de l'étal peut ajouter un vendeur." };

  const nom = majuscule(String(formData.get("nom") ?? ""));
  const telephone = normaliserTelephone(String(formData.get("telephone") ?? ""));
  const pin = String(formData.get("pin") ?? "");

  if (!nom) return { erreur: "Écris le nom du vendeur." };
  if (!telephone) return { erreur: "Numéro invalide. Exemple : 77 123 45 67." };
  if (!pinValide(pin)) return { erreur: "Le code PIN fait 6 chiffres." };

  const admin = createAdminClient();

  const { data: existant } = await admin
    .from("users")
    .select("id")
    .eq("telephone", telephone)
    .maybeSingle();
  if (existant) return { erreur: "Ce numéro a déjà un compte Fruya." };

  // 1. Compte de connexion. Pas de nom_etal dans les métadonnées : le trigger
  //    handle_new_user (réservé à l'inscription des gérants) ne fait rien.
  const { data: cree, error } = await admin.auth.admin.createUser({
    email: emailDepuisTelephone(telephone),
    password: pin,
    email_confirm: true,
    user_metadata: { nom, telephone },
  });

  if (error) {
    // Journal serveur uniquement (jamais affiché au gérant).
    console.error("[creerVendeur] échec Supabase :", error.code, error.status, error.message);
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return { erreur: "Ce numéro a déjà un compte Fruya." };
    }
    if (error.code === "weak_password") {
      return { erreur: "Code PIN trop simple. Choisis-en un autre." };
    }
    return { erreur: "Le compte n'a pas été créé. Réessaie." };
  }

  // 2. Fiche vendeur, rattachée à l'étal vérifié plus haut (jamais au formulaire).
  //    En cas d'échec, on retire le compte de connexion orphelin (il n'a
  //    encore rien enregistré).
  const { error: erreurProfil } = await admin.from("users").insert({
    id: cree.user.id,
    telephone,
    nom,
    role: "vendeur",
    stall_id: etal.id,
  });
  if (erreurProfil) {
    console.error("[creerVendeur] fiche vendeur non créée :", erreurProfil.code, erreurProfil.message);
    await admin.auth.admin.deleteUser(cree.user.id);
    return { erreur: "Le compte n'a pas été créé. Réessaie." };
  }

  revalidatePath("/gerant/vendeurs");
  return { succes: `Compte de ${nom} créé. Donne-lui son numéro et son code PIN.` };
}
