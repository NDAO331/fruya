import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profil, Role } from "@/lib/types";

/** Profil de l'utilisateur connecté (null si non connecté ou sans profil). */
export const getProfil = cache(async (): Promise<Profil | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profil } = await supabase
    .from("users")
    .select("id, telephone, nom, role, stall_id")
    .eq("id", userId)
    .maybeSingle<Profil>();

  return profil ?? null;
});

/**
 * À appeler en tête de chaque page ou Server Action protégée.
 * Renvoie le profil si son rôle est autorisé, sinon redirige.
 */
export async function exigerRole(roles: Role[]): Promise<Profil> {
  const profil = await getProfil();
  // Compte de connexion sans profil métier : on le déconnecte.
  if (!profil) redirect("/deconnexion");
  if (!roles.includes(profil.role)) redirect("/");
  return profil;
}

export function pageAccueil(role: Role): string {
  switch (role) {
    case "vendeur":
      return "/caisse";
    case "gerant":
      return "/caisse";
    case "admin":
      return "/admin";
  }
}
