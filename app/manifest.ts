import type { MetadataRoute } from "next";

// Rend l'app installable sur l'écran d'accueil du téléphone (PWA).
// Icônes fournies avec le logo (public/icons, voir fruya-logo/LISEZMOI.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fruya",
    short_name: "Fruya",
    description: "La caisse des vendeurs de fruits, même sans réseau.",
    lang: "fr",
    // Ouvre directement la caisse (vendeur et gérant) : un chargement de moins.
    start_url: "/caisse",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FF7A1A",
    theme_color: "#FF7A1A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
