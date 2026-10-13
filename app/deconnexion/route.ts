import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function deconnecter(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
}

// POST : bouton « Se déconnecter ».
// GET : redirection interne quand un compte n'a pas de profil métier.
export const POST = deconnecter;
export const GET = deconnecter;
