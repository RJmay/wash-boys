import type { ReactNode } from "react";


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

/** Text inputs and selects. line-strong is the 3.64:1 perceivable border. */
export const field =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-3 text-ink placeholder:text-ink-muted/70";

/** Error text under a field. Harbour rather than red - red is not in the palette. */
export const fieldError = "mt-1 text-sm font-medium text-harbour";

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

export function TickIcon({ className = "mt-0.5 size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`${className} shrink-0 fill-current`}
    >
      <path d="M7.6 14.6 3.4 10.4l1.4-1.4 2.8 2.8 7-7 1.4 1.4z" />
    </svg>
  );
}

/** A ticked list, used for "what's included" blocks. */
export function TickList({
  items,
  className = "",
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <TickIcon className="mt-1 size-4 text-harbour" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders a `[PLACEHOLDER]` from src/data/placeholders.ts so it is impossible
 * to mistake for finished copy: dashed outline, monospace. Once the string is
 * replaced with real wording it renders as plain text.
 */
export function Placeholder({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  if (!value.startsWith("[")) return <span className={className}>{value}</span>;
  return (
    <span
      className={`inline-block rounded border border-dashed border-current px-1.5 py-0.5 font-mono text-[0.8em] ${className}`}
      data-placeholder=""
    >
      {value}
    </span>
  );
}
