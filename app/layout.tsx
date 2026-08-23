import type { Metadata, Viewport } from "next";
import { Sora, Manrope } from "next/font/google";
import "./globals.css";

/* design.md 4 - Sora for display, Manrope for body. Self-hosted at build time
   by next/font so there is no render-blocking request to Google.
   Only 400 and 500 are loaded: nothing on the site goes above medium, so
   shipping the heavier faces would be dead weight in the font payload. */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sora",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://potentiaa.com"),
  title: {
    default: "Potentiaa - billing, inventory and management software for small businesses",
    template: "%s | Potentiaa",
  },
  description:
    "We consult, build and maintain personalised digital solutions - billing and inventory software, websites and management apps - so you can run your operations from your phone.",
  keywords: [
    "billing software",
    "inventory software",
    "small business software",
    "management app",
    "custom software consulting",
  ],
  openGraph: {
    type: "website",
    siteName: "Potentiaa",
    title: "Stop losing time and money to manual systems",
    description:
      "Personalised billing, inventory and management software for small businesses. Consult, build, maintain.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Potentiaa",
    description:
      "Personalised billing, inventory and management software for small businesses.",
  },
};

export const viewport: Viewport = {
  themeColor: "#020A24",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
