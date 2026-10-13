import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Développement uniquement : autorise un téléphone du même Wi-Fi
  // (http://192.168.x.x:3000) à charger l'app pour la tester.
  allowedDevOrigins: ["192.168.*.*"],

  // En-têtes recommandés par le guide PWA de Next.js
  // (node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
