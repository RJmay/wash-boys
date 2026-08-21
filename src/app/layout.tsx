import type { Metadata } from "next";
import { Anton, Figtree } from "next/font/google";
import "./globals.css";

import { BUSINESS } from "@/data/business";

// Two families, both preloaded and self-hosted by next/font (SPEC §2).
// Anton: condensed, signage energy — headlines and prices only.
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

// Figtree: the clean body face. Everything a customer actually reads.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BUSINESS.name} — Pressure washing, Caloundra to Buderim`,
  description:
    "Driveways, house washes, patios and fences across the Caloundra to Buderim corridor. Local, insured, owner-operated. Book online in 60 seconds.",
  openGraph: {
    title: `${BUSINESS.name} — Pressure washing, Caloundra to Buderim`,
    description:
      "Driveways, house washes, patios and fences. Local, insured, owner-operated.",
    locale: "en_AU",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${anton.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
