import { Footer, StickyBar } from "@/components/site/chrome";
import { GutterWaitlist } from "@/components/site/gutter-waitlist";
import { Hero } from "@/components/site/hero";
import {
  BundleNudge,
  Faq,
  HowItWorks,
  ProofStrip,
  ServiceArea,
} from "@/components/site/sections";
import { ServicesGrid } from "@/components/site/services";
import { TrackLand } from "@/components/site/tracking";

/**
 * Landing page — SPEC §4, in the order the spec sets out.
 *
 * Fully static: no request-time data, so it prerenders at build and serves
 * from the Cloudflare assets binding. The hero is text rather than an image,
 * which keeps the largest paint cheap on a 4G phone at a letterbox.
 *
 * Renders and converts with JavaScript disabled. The FAQ is details/summary,
 * the waitlist is a plain form action, and the coming-soon card is an anchor.
 * JS only enhances: the funnel events and the before/after slider.
 */
export default function Home() {
  return (
    <>
      <StickyBar />
      <TrackLand />

      <main>
        <Hero />
        <ServicesGrid />
        <HowItWorks />
        <BundleNudge />
        <ProofStrip />
        <ServiceArea />
        <GutterWaitlist />
        <Faq />
      </main>

      <Footer />
    </>
  );
}
