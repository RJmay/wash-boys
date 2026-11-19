import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import {
  Closing,
  FaqList,
  GutterGuardFeature,
  Hero,
  HowItWorksSteps,
  JustGuttersLine,
  PriceTag,
  RecentWork,
  SingleServices,
  WhereWeWork,
  WhyUs,
} from "@/components/site/sections";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";

export const metadata: Metadata = {
  title: {
    absolute: "House Washing, Gutters & Windows, Sunshine Coast | Wash Boys",
  },
  description: `House wash, driveway, gutters and windows in one day:${formatPrice(HEADLINE_BUNDLE.price)} fixed price for a single-storey home. No call-out fee, no quote visit. Aroona-based, Sunshine Coast.`,
  alternates: { canonical: "/" },
};

/**
 * Home (docs/brief/site-content.md, "Home").
 *
 * Reads top to bottom as one argument: the offer and its price, proof it is
 * real, how a day works, why us, the smaller options, where we go, then book
 * or talk. The $790 and the Book button sit inside the first screen on a
 * 375px phone (brief point 6); photos start below the hero where they cannot
 * push the offer off screen.
 */
export default function Home() {
  return (
    <PageShell>
      <Hero heading="Your whole exterior, done in one day." after={<JustGuttersLine />}>
        <p className="text-lg text-white/90">
          House wash, driveway, gutters and windows.{" "}
          <PriceTag amount={HEADLINE_BUNDLE.price} />, fixed price, single-storey home.
        </p>
        <p className="text-white/80">
          We already deliver to your street, so there&apos;s no call-out fee and no quote visit.
        </p>
      </Hero>
      <RecentWork tone="grey" />
      <HowItWorksSteps tone="white" />
      <WhyUs tone="grey" />
      <SingleServices tone="white" />
      <GutterGuardFeature />
      <WhereWeWork tone="white" />
      <FaqList limit={4} tone="grey" />
      <Closing tone="white" />
    </PageShell>
  );
}
