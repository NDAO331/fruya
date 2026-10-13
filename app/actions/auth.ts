"use server";

import { redirect } from "next/navigation";
import { majuscule } from "@/lib/format";
import { pageAccueil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { emailDepuisTelephone, normaliserTelephone, pinValide } from "@/lib/telephone";
import type { EtatFormulaire, Role } from "@/lib/types";

export async function connexion(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const telephone = normaliserTelephone(String(formData.get("telephone") ?? ""));
  const pin = String(formData.get("pin") ?? "");

  if (!telephone || !pinValide(pin)) {
    return { erreur: "Numéro ou code PIN incorrect." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailDepuisTelephone(telephone),
    password: pin,
  });

  if (error) {
    return { erreur: "Numéro ou code PIN incorrect." };
  }

  // Directement sur le bon écran (évite un passage par « / »).
  const { data: profil } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: Role }>();
  redirect(profil ? pageAccueil(profil.role) : "/");
}

// Inscription d'un gérant : le trigger handle_new_user crée l'étal
// (essai de 14 jours) et le profil à partir des métadonnées.
export async function inscription(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const nom = majuscule(String(formData.get("nom") ?? ""));
  const nomEtal = majuscule(String(formData.get("nom_etal") ?? ""));
  const telephone = normaliserTelephone(String(formData.get("telephone") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  const pinConfirmation = String(formData.get("pin_confirmation") ?? "");

  if (!nom) return { erreur: "Écris ton nom." };
  if (!nomEtal) return { erreur: "Donne un nom à ton étal." };
  if (!telephone) return { erreur: "Numéro invalide. Exemple : 77 123 45 67." };
  if (!pinValide(pin)) return { erreur: "Le code PIN fait 6 chiffres." };
  if (pin !== pinConfirmation) return { erreur: "Les deux codes PIN ne sont pas pareils." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: emailDepuisTelephone(telephone),
    password: pin,
    options: { data: { nom, telephone, nom_etal: nomEtal } },
  });

  if (error) {
    // Journal serveur uniquement (jamais affiché au gérant).
    console.error("[inscription] échec Supabase :", error.code, error.status, error.message);
    if (error.code === "user_already_exists") {
      return { erreur: "Ce numéro a déjà un compte. Connecte-toi." };
    }
    if (error.code === "weak_password") {
      return { erreur: "Code PIN trop simple. Choisis-en un autre." };
    }
    return { erreur: "L'inscription n'a pas marché. Réessaie dans un instant." };
  }

  // Sans session, la confirmation email est encore active dans Supabase.
  if (!data.session) {
    return { erreur: "Compte créé, mais connexion impossible. Appelle le support." };
  }

  // Premier lancement : le gérant ajoute ses fruits.
  redirect("/gerant/fruits");
}
