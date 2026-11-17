import Link from "next/link";

import { Footer, StickyBar } from "@/components/site/chrome";
import { PhoneLink } from "@/components/site/tracking";
import { cta, ctaOnDark, PageHeader } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";

export default function NotFound() {
  return (
    <>
      <StickyBar />
      <main>
        <PageHeader
          eyebrow="Page not found"
          title="Nothing here"
          lead={
            <p>
              That page does not exist. If you scanned a flyer and landed here, the code may have
              been misread. The home page has everything, or give us a call and we will sort it
              out.
            </p>
          }
        >
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className={cta}>
              Go to the home page
            </Link>
            <PhoneLink className={ctaOnDark}>Call {BUSINESS.phone.display}</PhoneLink>
          </div>
        </PageHeader>
      </main>
      <Footer />
    </>
  );
}
