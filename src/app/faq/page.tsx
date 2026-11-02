import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import { BookBand, FaqList } from "@/components/site/sections";
import { FAQ } from "@/data/faq";
import { faqSchema, JsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "FAQ: Soft Washing, Gutters and Booking",
  description:
    "Do you need to be home? Will soft washing damage paint or plants? Where does the water go? What if it rains? Answers to the common questions before you book.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <PageShell>
      <JsonLd data={faqSchema(FAQ)} />
      <FaqList headingLevel="h1" />
      <BookBand />
    </PageShell>
  );
}
