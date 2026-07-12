// FE-A01/FE-A04 · Layout raiz — fontes, tokens, providers (TanStack Query em FE-A03)
import type { Metadata, Viewport } from "next";
import "@/styles/tokens.css";

export const metadata: Metadata = {
  title: "Leve Sabor AI — o teu plano alimentar, feito para a tua vida",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#C43E1C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      {/* TODO FE-A02: <link> das fontes Bricolage Grotesque / Work Sans / IBM Plex Mono com display=swap e subsets */}
      <body>{children}</body>
    </html>
  );
}
