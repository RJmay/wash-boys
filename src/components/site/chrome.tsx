import Link from "next/link";

import { BUSINESS, isPlaceholder } from "@/data/business";
import { SUBURBS_ALPHABETICAL } from "@/data/suburbs";
import { PhoneLink } from "./tracking";

/**
 * Sticky mini-bar (SPEC §4.1). Three things and nothing else: who we are, a
 * number to call, and the way to book. It stays on screen because most of this
 * traffic is one-handed on a phone at a letterbox.
 */
export function StickyBar() {
  return (
    <header className="on-dark sticky top-0 z-50 bg-harbour-deep text-white">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="display-caps text-xl leading-none">
          {BUSINESS.name}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <PhoneLink className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-white/10">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
            </svg>
            <span className="sr-only">Call </span>
            <span aria-hidden="true">Call</span>
          </PhoneLink>

          <Link
            href="/book"
            className="rounded-lg bg-hivis px-4 py-2.5 font-display text-base tracking-wide text-ink uppercase"
          >
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const emailConfigured = !BUSINESS.email.includes("[");

  return (
    <footer className="on-dark mt-auto bg-harbour-deep px-5 py-12 text-white/80">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <p className="display-caps text-2xl text-white">{BUSINESS.name}</p>
          <p className="mt-1 text-sm">{BUSINESS.tagline}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <h2 className="font-semibold text-white">Get in touch</h2>
            <p>
              <PhoneLink className="underline underline-offset-4">
                {BUSINESS.phone.display}
              </PhoneLink>
            </p>
            <p>
              {emailConfigured ? (
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="underline underline-offset-4"
                >
                  {BUSINESS.email}
                </a>
              ) : (
                <span title="Set the domain in src/data/business.ts">
                  {BUSINESS.email}
                </span>
              )}
            </p>
            <p>
              {BUSINESS.hours.days}. {BUSINESS.hours.note}
            </p>
          </div>

          <div className="space-y-1 text-sm">
            <h2 className="font-semibold text-white">The legals</h2>
            <p>{BUSINESS.trust.insured}</p>
            <p>
              ABN{" "}
              {isPlaceholder(BUSINESS.abn) ? (
                <span title="Set the ABN in src/data/business.ts">
                  {BUSINESS.abn}
                </span>
              ) : (
                BUSINESS.abn
              )}
            </p>
            <p>{BUSINESS.trust.guarantee}</p>
            {/* TODO(session 6): link /privacy here once the page exists.
                Not linked while it would 404. */}
          </div>
        </div>

        <div className="text-xs leading-relaxed">
          <h2 className="mb-1 font-semibold text-white">Suburbs we cover</h2>
          <p>{SUBURBS_ALPHABETICAL.map((s) => s.name).join(" · ")}</p>
        </div>

        <p className="text-xs">
          © {new Date().getFullYear()} {BUSINESS.name}. Prices shown are ranges
          and are confirmed on site before any work starts.
        </p>
      </div>
    </footer>
  );
}
