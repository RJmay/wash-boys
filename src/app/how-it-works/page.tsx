import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import { BookBand, HowItWorksSteps } from "@/components/site/sections";
import { HOW_IT_WORKS_FULL } from "@/data/copy";
import { DEPOSITS, formatPrice } from "@/data/pricing";

export const metadata: Metadata = {
  title: "How It Works",
  description: `Book a day we're in your suburb, pay a ${formatPrice(DEPOSITS.cleaning)} deposit, and two of us clean the outside of your home in one morning. You don't need to be home.`,
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <PageShell>
      <HowItWorksSteps steps={HOW_IT_WORKS_FULL} asPageHeading />
      <BookBand />
    </PageShell>
  );
}
