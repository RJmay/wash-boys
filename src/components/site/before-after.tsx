"use client";

import Image from "next/image";
import { useId, useState } from "react";

import type { BeforeAfterPair } from "@/data/site";

/**
 * The signature element (SPEC §2): drag the handle, the clean half follows.
 * The most persuasive artifact this trade has - and worth nothing with a stock
 * photo in it, which is why it only renders when we have a real pair of our
 * own work.
 *
 * Built on a range input rather than pointer maths, which buys keyboard
 * support, screen-reader semantics and touch handling for free. The visual
 * handle is decorative; the input is the control.
 */
export function BeforeAfterSlider({
  pair,
  priority = false,
}: {
  pair: BeforeAfterPair;
  priority?: boolean;
}) {
  const [position, setPosition] = useState(50);
  const labelId = useId();

  return (
    <figure className="m-0">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-harbour-deep select-none">
        {/* After sits underneath; before is clipped over the top of it. */}
        <Image
          src={pair.after}
          alt={`After: ${pair.alt}`}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-cover"
          priority={priority}
        />

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={pair.before}
            alt={`Before: ${pair.alt}`}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
            priority={priority}
          />
        </div>

        <span className="pointer-events-none absolute top-3 left-3 rounded bg-ink/75 px-2 py-1 text-xs font-semibold tracking-wide text-white uppercase">
          Before
        </span>
        <span className="pointer-events-none absolute top-3 right-3 rounded bg-hivis px-2 py-1 text-xs font-semibold tracking-wide text-ink uppercase">
          After
        </span>

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

      <figcaption className="mt-2 text-sm text-ink-muted">
        {pair.alt} — {pair.suburb}. Our own work, not a stock photo.
      </figcaption>
    </figure>
  );
}

/**
 * Placeholder that marks where a real before/after goes, so nobody mistakes
 * an empty slot for a finished design. Never shipped to production copy - the
 * section that uses it hides itself until real photos exist.
 */
export function PhotoSlot({ label }: { label: string }) {
  return (
    <div className="flex aspect-4/3 w-full items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-surface/60 p-4 text-center">
      <span className="text-sm font-medium text-ink-muted">
        Photo slot — {label}
        <br />
        <span className="font-normal">Real before/after only</span>
      </span>
    </div>
  );
}
