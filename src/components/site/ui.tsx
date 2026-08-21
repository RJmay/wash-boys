import type { ReactNode } from "react";

import { BUSINESS } from "@/data/business";

/**
 * The single yellow call to action. Hi-vis is reserved for this and the QR
 * frame on the flyer (SPEC §2) - if you are reaching for this class a second
 * time on the same screen, use `ctaQuiet` instead.
 */
export const cta =
  "inline-flex items-center justify-center rounded-lg bg-hivis px-7 py-4 font-display text-xl uppercase tracking-wide text-ink transition hover:brightness-95 active:translate-y-px";

/** Secondary action. Outlined, never yellow. */
export const ctaQuiet =
  "inline-flex items-center justify-center rounded-lg border-2 border-harbour px-6 py-3 font-semibold text-harbour transition hover:bg-harbour hover:text-surface";

export const card =
  "rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(27,35,40,0.04)]";

/** Section shell: consistent rhythm, and an id for in-page anchors. */
export function Section({
  id,
  className = "",
  children,
  labelledBy,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      // scroll-mt clears the sticky bar when an in-page anchor lands here.
      className={`scroll-mt-16 px-5 py-12 sm:py-16 ${className}`}
    >
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="display-caps text-section text-harbour">
      {children}
    </h2>
  );
}

function TickIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 size-4 shrink-0 fill-current"
    >
      <path d="M7.6 14.6 3.4 10.4l1.4-1.4 2.8 2.8 7-7 1.4 1.4z" />
    </svg>
  );
}

/**
 * The three claims that decide whether a stranger gets onto the property.
 * All three must be true before flyers drop (SPEC §9).
 */
export function TrustTicks({ tone = "light" }: { tone?: "light" | "dark" }) {
  const colour = tone === "dark" ? "text-white/90" : "text-ink-muted";
  return (
    <ul className={`flex flex-col gap-1.5 text-sm sm:flex-row sm:gap-5 ${colour}`}>
      {[
        BUSINESS.trust.insured,
        BUSINESS.trust.local,
        "Re-wash guarantee",
      ].map((claim) => (
        <li key={claim} className="flex items-start gap-1.5">
          <TickIcon />
          <span>{claim}</span>
        </li>
      ))}
    </ul>
  );
}
