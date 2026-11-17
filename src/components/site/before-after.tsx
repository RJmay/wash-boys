"use client";

import Image from "next/image";
import { useId, useState } from "react";

import type { BeforeAfterPair, ImageAdjust, ImageSource } from "@/data/site";

/**
 * Blur up from the image's own colours rather than popping in from an empty
 * box. Next generates the placeholder at build time for a static import; a
 * plain URL has none, and asking for "blur" without one throws.
 */
function placeholderFor(src: ImageSource) {
  return typeof src === "string" ? ("empty" as const) : ("blur" as const);
}

/**
 * Turns a framing tweak into inline styles. The container clips, so a scaled
 * image crops off-screen rather than overflowing - which is what lets the
 * wider shot fill from the side with spare margin and sit underneath without
 * the size difference showing at the wipe line.
 */
function adjustStyle(adjust?: ImageAdjust): React.CSSProperties | undefined {
  if (!adjust) return undefined;
  return {
    objectPosition: adjust.position,
    transform: adjust.scale ? `scale(${adjust.scale})` : undefined,
    transformOrigin: adjust.origin ?? "center",
  };
}

const LABEL =
  "pointer-events-none absolute top-3 rounded px-2 py-1 text-xs font-semibold tracking-wide uppercase";

/**
 * The signature element (SPEC §2): drag the handle, the clean half follows.
 * The most persuasive artifact this trade has - and worth nothing with a stock
 * photo in it, which is why it only renders when we have a real pair of our
 * own work.
 *
 * Each label lives inside its own photo's layer, so it is clipped with that
 * photo: drag fully to "before" and the "after" tag goes with the after shot.
 *
 * Built on a range input rather than pointer maths, which buys keyboard
 * support, screen-reader semantics and touch handling for free. The visual
 * handle is decorative; the input is the control.
 */
export function BeforeAfterSlider({
  pair,
  title,
  priority = false,
  sizes = "(min-width: 1024px) 560px, (min-width: 640px) 50vw, 100vw",
  tone = "light",
}: {
  pair: BeforeAfterPair;
  /** Shown left of the suburb under the photo, e.g. "Gutter clean". */
  title?: string;
  priority?: boolean;
  sizes?: string;
  /** "dark" = sitting on a harbour panel, so the caption needs light text. */
  tone?: "light" | "dark";
}) {
  const [position, setPosition] = useState(50);
  const labelId = useId();

  return (
    <figure className="m-0">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-harbour-deep select-none">
        {/* After sits underneath, with its tag; before is clipped over the top. */}
        <div className="absolute inset-0">
          <Image
            src={pair.after}
            alt={`After: ${pair.alt}`}
            fill
            sizes={sizes}
            className="object-cover"
            style={adjustStyle(pair.adjust?.after)}
            priority={priority}
            placeholder={placeholderFor(pair.after)}
          />
          <span aria-hidden="true" className={`${LABEL} right-3 bg-hivis text-ink`}>
            After
          </span>
        </div>

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={pair.before}
            alt={`Before: ${pair.alt}`}
            fill
            sizes={sizes}
            className="object-cover"
            style={adjustStyle(pair.adjust?.before)}
            priority={priority}
            placeholder={placeholderFor(pair.before)}
          />
          <span aria-hidden="true" className={`${LABEL} left-3 bg-ink/75 text-white`}>
            Before
          </span>
        </div>

        {/* Decorative divider that follows the input value. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(27,35,40,0.25)]"
          style={{ left: `${position}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
            <svg viewBox="0 0 24 24" className="size-5 fill-harbour">
              <path d="M9.2 6.6 4.8 11l4.4 4.4 1.4-1.4L8.2 11l2.4-2.6zm5.6 0-1.4 1.4 2.4 2.6-2.4 2.6 1.4 1.4L19.2 11z" />
            </svg>
          </span>
        </div>

        <label htmlFor={labelId} className="sr-only">
          Reveal more of the before or after photo
        </label>
        <input
          id={labelId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>

      <figcaption
        className={`mt-3 flex items-baseline justify-between gap-3 text-sm ${
          tone === "dark" ? "text-white/75" : "text-ink-muted"
        }`}
      >
        {pair.placeholder ? (
          <span>Layout placeholder — a real before and after goes here.</span>
        ) : title ? (
          <>
            <span className={`text-base font-semibold ${tone === "dark" ? "text-white" : "text-ink"}`}>
              {title}
            </span>
            {pair.suburb ? <span className="shrink-0">{pair.suburb}</span> : null}
          </>
        ) : (
          <span>
            {pair.alt}
            {pair.suburb ? `, ${pair.suburb}` : ""}.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
