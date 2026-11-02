import Link from "next/link";
import type { ReactNode } from "react";

import { BUSINESS } from "@/data/business";
import { HEADLINE_PRICE } from "@/data/copy";
import { PRIORITY_SUBURBS } from "@/data/suburbs";
import { PhoneLink, TrackLand } from "./tracking";

/** Site navigation, in the order the brief lists the pages. */
export const NAV: readonly { href: string; label: string }[] = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Bundles and pricing" },
  { href: "/gutter-guard", label: "Gutter guard" },
  { href: "/areas", label: "Service areas" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/book", label: "Book" },
];

/**
 * Sticky bar. Name, menu, call, and the price-plus-book button. It stays on
 * screen on every page, so the bundle price and a way to book are always one
 * tap away for a visitor on a phone at the letterbox.
 *
 * The menu is a <details>, so it opens with JavaScript disabled.
 */
export function StickyBar() {
  return (
    <header className="on-dark sticky top-0 z-50 bg-harbour-deep text-white">
      <div className="relative mx-auto flex w-full max-w-2xl items-center gap-1.5 px-3 py-2">
        <Link href="/" className="display-caps mr-auto text-lg leading-none sm:text-xl">
          {BUSINESS.name}
        </Link>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center rounded-lg px-2 py-2 text-sm font-semibold hover:bg-white/10 marker:hidden">
            Menu
          </summary>
          <nav
            aria-label="Main"
            className="absolute inset-x-0 top-full border-t border-white/10 bg-harbour-deep px-3 pb-3 shadow-lg"
          >
            <ul className="mx-auto grid max-w-2xl gap-1 pt-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>

        <PhoneLink className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-white/10">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
          </svg>
          <span className="sr-only">Call {BUSINESS.phone.display}</span>
        </PhoneLink>

        <Link
          href="/book"
          className="rounded-lg bg-hivis px-3 py-2 font-display text-base tracking-wide text-ink uppercase"
        >
          Book {HEADLINE_PRICE}
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="on-dark mt-auto bg-harbour-deep px-5 py-12 text-white/80">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <p className="display-caps text-2xl text-white">{BUSINESS.name}</p>
          <p className="mt-1 text-sm">{BUSINESS.tagline}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <nav aria-label="Footer" className="text-sm">
            <h2 className="font-semibold text-white">Pages</h2>
            <ul className="mt-1 space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV, { href: "/privacy", label: "Privacy" }].map(
                (item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="underline underline-offset-4">
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="text-sm">
            <h2 className="font-semibold text-white">Suburbs</h2>
            <ul className="mt-1 space-y-1">
              {PRIORITY_SUBURBS.map((s) => (
                <li key={s.slug}>
                  <Link href={`/areas/${s.slug}`} className="underline underline-offset-4">
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/areas" className="underline underline-offset-4">
                  All service areas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-sm leading-relaxed">
          {BUSINESS.name} ·{" "}
          <PhoneLink className="underline underline-offset-4">{BUSINESS.phone.display}</PhoneLink>{" "}
          ·{" "}
          <a href={`mailto:${BUSINESS.email}`} className="underline underline-offset-4">
            {BUSINESS.email}
          </a>{" "}
          · ABN {BUSINESS.abn} · {BUSINESS.base.region}, {BUSINESS.base.state} ·{" "}
          {BUSINESS.gstNote}
        </p>
      </div>
    </footer>
  );
}

/** Every page: sticky bar, the land event (which also stamps ?src=), footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <StickyBar />
      <TrackLand />
      <main>{children}</main>
      <Footer />
    </>
  );
}
