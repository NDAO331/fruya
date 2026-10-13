import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client avec la clé secrète : contourne toutes les règles RLS.
// À n'utiliser QUE dans des Server Actions, après avoir vérifié les droits
// de l'utilisateur connecté. Jamais importé depuis un composant client.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Le client admin Supabase ne doit jamais être utilisé côté navigateur.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Variable SUPABASE_SECRET_KEY manquante. Vérifiez le fichier .env.local.",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
