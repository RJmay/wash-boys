import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { BUSINESS } from "@/data/business";

// Placeholder face. Session 2's design pass picks the real pair: one
// condensed display face for headlines and prices, one clean body face
// (SPEC §2), preloaded, two families maximum.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BUSINESS.name} — ${BUSINESS.tagline}`,
  description:
    "Driveway, house, patio and fence cleaning across the Caloundra to Buderim corridor. Local, insured, owner-operated.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
