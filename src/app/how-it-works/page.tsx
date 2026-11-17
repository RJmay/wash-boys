import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import { Closing, FaqList, HowItWorksSteps } from "@/components/site/sections";
import { PageHeader } from "@/components/site/ui";
import { HOW_IT_WORKS_FULL } from "@/data/copy";
import { DEPOSITS, formatPrice } from "@/data/pricing";

const DESCRIPTION = `Book a day we're in your suburb, pay a ${formatPrice(DEPOSITS.cleaning)} deposit, and two of us clean the outside of your home in one morning. You don't need to be home.`;

export const metadata: Metadata = {
  title: "How It Works",
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <PageShell>
      <PageHeader eyebrow="No quote visit" title="How it works" lead={<p>{DESCRIPTION}</p>} />
      <HowItWorksSteps steps={HOW_IT_WORKS_FULL} tone="white" eyebrow="Step by step" title="From booking to done" />
      <FaqList tone="grey" />
      <Closing tone="white" />
    </PageShell>
  );
}
