import type { Metadata, Viewport } from "next";
import { Nunito, Outfit } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/content/taxonomy";
import PwaRegister from "@/components/PwaRegister";

const sans = Nunito({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — un pas après l'autre`, template: `%s · ${APP_NAME}` },
  description: "Vous n'avez pas besoin d'être entraîneur pour aider votre enfant à progresser au football. Séances guidées, exercices expliqués, repos respecté.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#0f844f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans"><a href="#contenu" className="skip">Aller au contenu</a>{children}<PwaRegister /></body>
    </html>
  );
}
