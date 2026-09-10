import type { Metadata } from "next";
import { Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import CursorGlow from "@/components/CursorGlow";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: "#0d0f10",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "AI Reasoning Observatory",
  description:
    "Watch one question run through a conventional LLM and a BDH-CQ-style latent-state model — live telemetry, real memory, nothing invented.",
  keywords: [
    "AI",
    "LLM",
    "BDH-CQ",
    "Pathway",
    "recurrent latent state",
    "AI observability",
    "token memory",
    "latent memory",
  ],
  authors: [{ name: "AI Reasoning Observatory" }],
  openGraph: {
    title: "AI Reasoning Observatory",
    description:
      "Watch how two very different kinds of AI memory remember the same question — live.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}>
      <body className="font-sans min-h-screen antialiased">
        <CursorGlow />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}