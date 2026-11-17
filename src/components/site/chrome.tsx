import Link from "next/link";
import type { ReactNode } from "react";

import { BUSINESS } from "@/data/business";
import { HEADLINE_PRICE } from "@/data/copy";
import { PRIORITY_SUBURBS } from "@/data/suburbs";
import { PhoneLink, TextLink, TrackLand } from "./tracking";
import { container } from "./ui";

/** Site navigation, in the order the brief lists the pages. */
export const NAV: readonly { href: string; label: string }[] = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/gutter-guard", label: "Gutter guard" },
  { href: "/areas", label: "Service areas" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-current`}>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
    </svg>
  );
}

function TextIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-current`}>
      <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2zm3 6v2h2V9zm4 0v2h2V9zm4 0v2h2V9z" />
    </svg>
  );
}

/**
 * Sticky bar. On a phone: name, menu, call, text, and the price-plus-book
 * button, so the bundle price and a way to book are always one tap away at
 * the letterbox. On a desktop the menu opens out into links and the number is
 * written in full.
 *
 * The phone menu is a <details>, so it opens with JavaScript disabled.
 */
export function StickyBar() {
  return (
    <header className="on-dark sticky top-0 z-50 border-b border-white/10 bg-harbour-deep text-white">
      <div className={`${container} relative flex items-center gap-1.5 py-2 lg:gap-6 lg:py-3`}>
        <Link href="/" className="display-caps mr-auto text-xl leading-none lg:mr-4 lg:text-2xl">
          {BUSINESS.name}
        </Link>

        <nav aria-label="Main" className="hidden lg:mr-auto lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <details className="group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-lg px-2 py-2 text-sm font-semibold hover:bg-white/10 marker:hidden">
            Menu
          </summary>
          <nav
            aria-label="Main"
            className="absolute inset-x-0 top-full border-t border-white/10 bg-harbour-deep px-3 pb-3 shadow-lg"
          >
            <ul className="mx-auto grid max-w-6xl gap-1 pt-2">
              {[...NAV, { href: "/book", label: "Book" }].map((item) => (
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

        <PhoneLink className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-white/10">
          <PhoneIcon />
          <span className="sr-only">Call </span>
          <span className="sr-only xl:not-sr-only">{BUSINESS.phone.display}</span>
        </PhoneLink>

        <TextLink className="flex items-center rounded-lg px-2 py-2 hover:bg-white/10">
          <TextIcon />
          <span className="sr-only">Text {BUSINESS.phone.display}</span>
        </TextLink>

        <Link
          href="/book"
          className="rounded-lg bg-hivis px-3 py-2 font-display text-base tracking-wide text-ink uppercase transition hover:brightness-95 lg:px-5 lg:py-2.5 lg:text-lg"
        >
          Book {HEADLINE_PRICE}
        </Link>
      </div>
    </header>
  );
}

const footerLink = "text-white/80 underline-offset-4 transition hover:text-white hover:underline";

export function Footer() {
  return (
    <footer className="on-dark mt-auto bg-harbour-deep text-white/80">
      <div className={`${container} grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:py-16`}>
        <div className="col-span-2 lg:col-span-1">
          <p className="display-caps text-3xl text-white">{BUSINESS.name}</p>
          <p className="mt-2 max-w-xs">{BUSINESS.tagline}</p>
          <ul className="mt-6 grid gap-2">
            <li>
              <PhoneLink className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
                <PhoneIcon className="size-4" />
                {BUSINESS.phone.display}
              </PhoneLink>
            </li>
            <li>
              <TextLink className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
                <TextIcon className="size-4" />
                Send a text
              </TextLink>
            </li>
            <li>
              <a href={`mailto:${BUSINESS.email}`} className={footerLink}>
                {BUSINESS.email}
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow text-white/60">Pages</h2>
          <ul className="mt-4 grid gap-2">
            {[
              { href: "/", label: "Home" },
              ...NAV,
              { href: "/book", label: "Book" },
              { href: "/privacy", label: "Privacy" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow text-white/60">Suburbs</h2>
          <ul className="mt-4 grid gap-2">
            {PRIORITY_SUBURBS.map((s) => (
              <li key={s.slug}>
                <Link href={`/areas/${s.slug}`} className={footerLink}>
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/areas" className={footerLink}>
                All service areas
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className={`${container} py-5 text-sm text-white/65`}>
          {BUSINESS.name} · ABN {BUSINESS.abn} · Based in {BUSINESS.base.suburb},{" "}
          {BUSINESS.base.region}, {BUSINESS.base.state} · {BUSINESS.gstNote}
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
