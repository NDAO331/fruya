// Service worker Fruya : permet d'ouvrir l'app sans réseau (PRD 4.1).
// - Fichiers de l'app (JS, CSS, polices, icônes) : servis depuis le cache.
// - Pages connectées (caisse, gérant, compte) : réseau d'abord, et la
//   dernière version reçue est gardée pour l'ouverture hors-ligne.
// Les ventes elles-mêmes ne passent pas par ici : elles sont dans IndexedDB.

const PAGES = "fruya-pages-v1";
const STATIQUE = "fruya-statique-v1";
const PAGES_GARDEES = ["/caisse", "/gerant", "/compte"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== PAGES && c !== STATIQUE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function estStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-icon") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function estPageGardee(url) {
  return PAGES_GARDEES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  const url = new URL(requete.url);
  if (requete.method !== "GET" || url.origin !== self.location.origin) return;

  if (estStatique(url)) {
    event.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(STATIQUE).then((c) => c.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
    return;
  }

  if (requete.mode === "navigate") {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          // On ne garde que les vraies pages connectées (pas une redirection
          // vers la connexion).
          if (reponse.ok && !reponse.redirected && estPageGardee(url)) {
            const copie = reponse.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copie));
          }
          return reponse;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES);
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match("/caisse")) ||
            new Response(
              "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Fruya</title>" +
                "<body style='font-family:sans-serif;padding:24px'><h1>Pas de réseau</h1>" +
                "<p>Ouvre Fruya une première fois avec du réseau pour pouvoir l'utiliser ensuite sans réseau.</p></body>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }),
    );
  }
});

// Déconnexion : la page envoie ce message pour effacer les pages gardées.
self.addEventListener("message", (event) => {
  if (event.data === "fruya:oublier-pages") {
    event.waitUntil(caches.delete(PAGES));
  }
});
