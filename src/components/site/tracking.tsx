"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { BUSINESS, PHONE_CONFIGURED } from "@/data/business";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  normaliseCode,
} from "@/lib/attribution";
import { logEvent } from "@/lib/actions/events";

/**
 * The flyer batch code for this visitor.
 *
 * Checks the URL first, then the first-party cookie that /go/[code] stamps on
 * the way through. The cookie is what matters: most people scan at the
 * letterbox, read, wander off, and book later. Without it a booking three days
 * after the scan looks like organic traffic and the batch that paid for it
 * gets no credit.
 *
 * Read on the client so pages stay static - a static landing page is most of
 * how the LCP budget is met on 4G.
 */
export function readSourceCode(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const fromUrl = normaliseCode(
    new URLSearchParams(window.location.search).get("c"),
  );
  if (fromUrl) {
    // A ?c= that did not come through /go/ (a typed link, a shared URL) still
    // deserves to stick for the rest of the visit.
    document.cookie = `${ATTRIBUTION_COOKIE}=${fromUrl}; path=/; max-age=${ATTRIBUTION_MAX_AGE}; samesite=lax`;
    return fromUrl;
  }

  const fromCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ATTRIBUTION_COOKIE}=`))
    ?.split("=")[1];

  return normaliseCode(fromCookie) ?? undefined;
}

/** Logs one `land` event per page view (SPEC §1). Renders nothing. */
export function TrackLand() {
  const fired = useRef(false);

  useEffect(() => {
    // Guards against React's double-invoked effects in development.
    if (fired.current) return;
    fired.current = true;
    void logEvent({ type: "land", code: readSourceCode() });
  }, []);

  return null;
}

/**
 * Phone link that logs `call_tap`. Calling is the second-best outcome after a
 * booking, so it gets counted (CLAUDE.md).
 *
 * The click handler is an enhancement - the underlying anchor dials with
 * JavaScript disabled either way.
 */
export function PhoneLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  if (!PHONE_CONFIGURED) {
    return (
      <span className={className} title="Set the phone number in src/data/business.ts">
        {children}
      </span>
    );
  }

  return (
    <a
      href={`tel:${BUSINESS.phone.tel}`}
      className={className}
      onClick={() => {
        void logEvent({ type: "call_tap", code: readSourceCode() });
      }}
    >
      {children}
    </a>
  );
}

/** Copies `?c=` into a hidden field so form posts keep their attribution. */
export function SourceCodeField() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const code = readSourceCode();
    if (code && ref.current) ref.current.value = code;
  }, []);

  return <input ref={ref} type="hidden" name="source_code" defaultValue="" />;
}
