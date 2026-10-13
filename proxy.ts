import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages accessibles sans être connecté.
const PAGES_PUBLIQUES = ["/connexion", "/inscription"];

// Rafraîchit la session Supabase à chaque requête et renvoie vers la
// connexion si personne n'est connecté. Les droits par rôle sont vérifiés
// dans chaque page côté serveur (lib/session.ts).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([cle, valeur]) => response.headers.set(cle, valeur));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims);
  const chemin = request.nextUrl.pathname;
  const pagePublique = PAGES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));

  if (!connecte && !pagePublique) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  if (connecte && pagePublique) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques, les images, les icônes et le manifeste
    // de l'app (ils doivent rester accessibles sans être connecté).
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
