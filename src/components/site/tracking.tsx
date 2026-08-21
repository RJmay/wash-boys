"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { BUSINESS, PHONE_CONFIGURED } from "@/data/business";
import { logEvent } from "@/lib/actions/events";

/**
 * The flyer batch code, read from `?c=` on the landing URL.
 *
 * Read on the client rather than from searchParams on the server so the page
 * stays fully static - a static landing page is most of how we hold the
 * LCP < 2.0s budget on 4G at a letterbox. Session 4 adds the first-party
 * cookie so attribution survives a browse.
 */
export function readSourceCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("c");
  if (!raw) return undefined;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{1,16}$/.test(code) ? code : undefined;
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
