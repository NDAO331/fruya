import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import { EnregistrementSW } from "@/components/EnregistrementSW";
import "./globals.css";

// Barlow : texte. Barlow Semi Condensed : montants, épais et étroits.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const barlowCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Fruya",
  description: "La caisse des vendeurs de fruits, même sans réseau.",
  appleWebApp: { capable: true, title: "Fruya", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

// Cadre d'application : une colonne de la largeur d'un téléphone, même sur
// ordinateur, pour que l'app se comporte toujours comme une app mobile.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}>
      <body className="font-sans font-medium">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-fond">{children}</div>
        <EnregistrementSW />
      </body>
    </html>
  );
}
