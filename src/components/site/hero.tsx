import Link from "next/link";

import { BUSINESS } from "@/data/business";
import { HERO_MODE, heroPair } from "@/data/site";
import { BeforeAfterSlider } from "./before-after";
import { cta, TrustTicks } from "./ui";

/**
 * Hero (SPEC §4.2).
 *
 * v0 is typographic: a harbour block with the outcome stated plainly, one
 * yellow CTA and the three trust claims. No imagery at all, which is also the
 * cheapest way to hold LCP under 2.0s on 4G - the largest paint is text.
 *
 * The moment there is a real before/after from our own work, set HERO_MODE to
 * "slider" in src/data/site.ts and the slider takes this spot.
 *
 * The headline names gutters deliberately (owner's call, CLAUDE.md) because
 * the service is imminent. The guardrail lives below it: there is no gutter
 * price and no gutter booking affordance anywhere near this block, and the
 * services grid immediately underneath states plainly that gutters are not
 * bookable yet.
 */
export function Hero() {
  const showSlider = HERO_MODE === "slider" && heroPair !== null;

  return (
    <section className="on-dark bg-harbour px-5 pt-10 pb-12 text-white sm:pt-14 sm:pb-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
          {BUSINESS.base.suburb} based · {BUSINESS.base.city} to Buderim
        </p>

        <h1 className="display-caps text-hero text-balance">
          Driveways, houses and gutters — looking new again
        </h1>

        {showSlider && heroPair ? (
          <BeforeAfterSlider pair={heroPair} priority />
        ) : null}

        <p className="max-w-prose text-lg text-white/85">
          Local crew covering the Caloundra to Buderim corridor. We clean it
          properly, and we confirm the price with you on site before we start.
        </p>

        <div>
          <Link href="/book" className={cta}>
            Book in 60 seconds
          </Link>
        </div>

        <TrustTicks tone="dark" />
      </div>
    </section>
  );
}
