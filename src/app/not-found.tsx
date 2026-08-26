import Link from "next/link";

import { Footer, StickyBar } from "@/components/site/chrome";
import { PhoneLink } from "@/components/site/tracking";
import { cta, ctaQuiet, Section } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";

export default function NotFound() {
  return (
    <>
      <StickyBar />
      <main>
        <Section>
          <p className="display-caps text-hero text-harbour">Nothing here</p>
          <p className="mt-4 max-w-prose text-lg text-ink-muted">
            That page does not exist. If you scanned a flyer and landed here,
            the code may have been misread — the home page has everything, or
            give us a call and we will sort it out.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className={cta}>
              Go to the home page
            </Link>
            <PhoneLink className={ctaQuiet}>
              Call {BUSINESS.phone.display}
            </PhoneLink>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
