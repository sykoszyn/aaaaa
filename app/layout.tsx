import type { Metadata, Viewport } from "next";
import { Inter, Rubik } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const SITE_URL = "https://juegosargentinos.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juegos Argentinos — Jugá online con amigos",
    template: "%s · Juegos Argentinos",
  },
  description:
    "UNO, Truco Argentino, Pool, Bowling y Ludo online, en tiempo real, contra amigos o rivales de todo el país. Creá una sala, compartí el código y jugá.",
  applicationName: "Juegos Argentinos",
  keywords: ["truco online", "uno online", "juegos multijugador", "juegos argentinos", "pool online", "ludo online"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Juegos Argentinos",
    title: "Juegos Argentinos — Jugá online con amigos",
    description: "Minijuegos multijugador en tiempo real: UNO, Truco, Pool, Bowling y Ludo.",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#08070d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${rubik.variable} h-full`}>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
