import type { Metadata } from "next";

import { PageShell } from "@/components/site/chrome";
import {
  BookBand,
  GutterGuardTeaser,
  Hero,
  HowItWorksSteps,
  PriceTag,
  RecentWork,
  RefreshIncludes,
  TrustStrip,
  WhereWeWork,
} from "@/components/site/sections";
import { formatPrice, HEADLINE_BUNDLE } from "@/data/pricing";

export const metadata: Metadata = {
  title: {
    absolute: "House Washing, Gutters & Windows, Sunshine Coast | Wash Boys",
  },
  description: `House wash, driveway, gutters and windows in one morning: ${formatPrice(HEADLINE_BUNDLE.price)} fixed price for a single-storey home. No call-out fee, no quote visit. Aroona-based, Sunshine Coast.`,
  alternates: { canonical: "/" },
};

/**
 * Home (docs/brief/site-content.md, "Home").
 *
 * Fully static and text-led above the fold: the $790 and the Book button sit
 * inside the first screen on a 375px phone (brief point 6). Photos come
 * further down where they cannot push the offer off screen.
 */
export default function Home() {
  return (
    <PageShell>
      <Hero heading="Your whole exterior, done in one morning.">
        <p className="text-lg text-white/90">
          House wash, driveway, gutters and windows.{" "}
          <PriceTag amount={HEADLINE_BUNDLE.price} />, fixed price, single-storey home.
        </p>
        <p className="text-white/80">
          We already deliver to your street, so there&apos;s no call-out fee and no quote visit.
        </p>
      </Hero>
      <RefreshIncludes />
      <HowItWorksSteps />
      <GutterGuardTeaser />
      <RecentWork />
      <WhereWeWork />
      <TrustStrip />
      <BookBand />
    </PageShell>
  );
}
