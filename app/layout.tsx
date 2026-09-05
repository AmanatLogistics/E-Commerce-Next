import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

/**
 * Two faces doing two jobs (docs/DESIGN.md). Cormorant Garamond carries the wordmark, stone
 * names and headings: a high-contrast old-style serif is the register fine jewellery is
 * sold in, and its fine hairlines sit naturally beside faceted material. Jost carries
 * everything factual — spec tables, forms, navigation and the whole admin — because a
 * geometric sans keeps a data-dense table readable under an ornate heading, and it holds
 * the wide letter-spacing the category uses for small labels without falling apart.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

/**
 * Metadata is generated rather than declared, because the business name is editable from
 * /admin/settings and a static object is evaluated once at module load — it would keep
 * serving the old name until the process restarted.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(settings.url),
    title: {
      default: `${settings.name} — ${settings.tagline}`,
      template: `%s · ${settings.name}`,
    },
    description: settings.description,
    openGraph: {
      type: "website",
      siteName: settings.name,
      locale: settings.locale.replace("-", "_"),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#14171a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={siteConfig.locale} className={`${cormorant.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
