import type { ReactNode } from "react";

import { isFilled, SHOW_PLACEHOLDERS } from "@/data/placeholders";

/**
 * Page width. Text inside it is held to a readable measure by the blocks that
 * use it (`max-w-2xl` on leads, `max-w-prose` on body copy); the full width is
 * for grids and two-column layouts on a desktop.
 */
export const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";

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

/** Secondary action on a harbour background. */
export const ctaOnDark =
  "inline-flex items-center justify-center rounded-lg border-2 border-white/80 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-harbour";

/** Inline text link with an arrow, on light backgrounds. */
export const textLink =
  "inline-flex items-center gap-1 font-semibold text-harbour underline underline-offset-4 hover:text-harbour-deep";

export const card =
  "rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(27,35,40,0.04)] sm:p-6";

/** Suburb and area chips. */
export const chip =
  "inline-block rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink transition hover:border-harbour hover:text-harbour";

/** Text inputs and selects. line-strong is the 3.64:1 perceivable border. */
export const field =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-3 text-ink placeholder:text-ink-muted/70";

/** Error text under a field. Harbour rather than red - red is not in the palette. */
export const fieldError = "mt-1 text-sm font-medium text-harbour";

export type Tone = "white" | "grey" | "dark";

const TONE: Record<Tone, string> = {
  white: "bg-surface",
  grey: "bg-concrete",
  dark: "on-dark bg-harbour text-white",
};

/**
 * Section shell. Every band on every page goes through this, so the vertical
 * rhythm and the page width are the same everywhere. Pages alternate tones
 * so each band reads as one idea.
 */
export function Section({
  id,
  tone = "white",
  className = "",
  children,
  labelledBy,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      // scroll-mt clears the sticky bar when an in-page anchor lands here.
      className={`scroll-mt-20 py-14 sm:py-20 lg:py-24 ${TONE[tone]} ${className}`}
    >
      <div className={container}>{children}</div>
    </section>
  );
}

/**
 * Eyebrow, heading and lead for a section. `action` sits to the right of the
 * heading on wider screens (a "see all" link), under it on a phone.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  action,
  as: Heading = "h2",
  onDark = false,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10 ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={`eyebrow mb-3 ${onDark ? "text-white/70" : "text-harbour"}`}>{eyebrow}</p>
        ) : null}
        <Heading
          id={id}
          className={`display-caps text-section text-balance ${onDark ? "text-white" : "text-harbour"}`}
        >
          {title}
        </Heading>
        {lead ? (
          <p className={`mt-4 text-lg ${onDark ? "text-white/85" : "text-ink-muted"}`}>{lead}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 md:pb-1">{action}</div> : null}
    </div>
  );
}

/**
 * The dark band at the top of every inner page: eyebrow, h1, lead, then
 * whatever the page needs (a price, a button). `aside` becomes a right-hand
 * column on a desktop and stacks underneath on a phone.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
  aside,
  titleClassName = "text-hero",
  compact = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  titleClassName?: string;
  /** Less height, for pages where the content below is the point (the form). */
  compact?: boolean;
}) {
  return (
    <section className="on-dark bg-harbour text-white">
      <div
        className={`${container} grid gap-10 lg:items-center lg:gap-16 ${
          compact ? "pt-6 pb-8 sm:pt-10 sm:pb-12" : "pt-8 pb-12 sm:pt-12 sm:pb-16 lg:py-20"
        } ${aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}`}
      >
        <div className="flex max-w-2xl flex-col gap-4">
          {eyebrow ? <p className="eyebrow text-white/70">{eyebrow}</p> : null}
          <h1 className={`display-caps text-balance ${titleClassName}`}>{title}</h1>
          {lead ? <div className="text-lg text-white/85">{lead}</div> : null}
          {children}
        </div>
        {aside}
      </div>
    </section>
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
  onDark = false,
}: {
  items: readonly string[];
  className?: string;
  onDark?: boolean;
}) {
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <TickIcon className={`mt-1 size-4 ${onDark ? "text-white/70" : "text-harbour"}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/**
 * Renders a `[PLACEHOLDER]` from src/data/placeholders.ts so it is impossible
 * to mistake for finished copy: dashed outline, monospace. Once the string is
 * replaced with real wording it renders as plain text.
 *
 * In a production build an unfilled one renders nothing. Callers that wrap it
 * in a list item or paragraph should check `isShown()` first so they do not
 * leave an empty row behind.
 */
export function Placeholder({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  if (isFilled(value)) return <span className={className}>{value}</span>;
  if (!SHOW_PLACEHOLDERS) return null;
  return (
    <span
      className={`inline-block rounded border border-dashed border-current px-1.5 py-0.5 font-mono text-[0.8em] ${className}`}
      data-placeholder=""
    >
      {value}
    </span>
  );
}
