import { redirect } from "next/navigation";
import { getProfil, pageAccueil } from "@/lib/session";

// Aiguillage selon le rôle. Un gérant sans fruits voit sur la caisse le
// bouton « Ajouter mes fruits » (pas de requête de plus ici : chargement
// plus rapide).
export default async function Accueil() {
  const profil = await getProfil();
  if (!profil) redirect("/deconnexion");
  redirect(pageAccueil(profil.role));
}
