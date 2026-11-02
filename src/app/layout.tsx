import type { Metadata } from "next";
import { Anton, Figtree } from "next/font/google";
import "./globals.css";

import { BUSINESS } from "@/data/business";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";
import { JsonLd, localBusiness } from "@/lib/schema";

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
  metadataBase: new URL(`https://${BUSINESS.domain}`),
  // Every page sets its own title; this template brands it.
  title: {
    default: `${BUSINESS.name} | Exterior home cleaning, Sunshine Coast`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: `House wash, driveway, gutters and windows in one morning. ${HEADLINE_BUNDLE.name} ${formatPrice(HEADLINE_BUNDLE.price)}, fixed price. Sunshine Coast, based in Aroona.`,
  openGraph: {
    siteName: BUSINESS.name,
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
      <body className="flex min-h-full flex-col">
        <JsonLd data={localBusiness()} />
        {children}
      </body>
    </html>
  );
}
