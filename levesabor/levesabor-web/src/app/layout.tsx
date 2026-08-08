// FE-A01/FE-A04 · Layout raiz — fontes, tokens, providers (TanStack Query em FE-A03)
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Work_Sans } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/tokens.css";

// next/font carrega os ficheiros da fonte e expõe cada um como uma custom property própria
// (--font-bricolage / --font-work-sans / --font-ibm-plex-mono). tokens.css já declara
// --font-display/--font-body/--font-mono como fallback de string literal (sem ficheiro real
// carregado); o bind final para a fonte carregada é feito em tokens.css (ver bloco de Tipografia)
// com `var(--font-bricolage, ...)` etc., para evitar colidir o nome da variável aqui.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-work-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Ottimizo — o teu plano alimentar, feito para a tua vida",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#C43E1C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-PT"
      className={`${bricolage.variable} ${workSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
