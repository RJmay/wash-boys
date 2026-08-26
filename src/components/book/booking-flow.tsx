"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { BUSINESS } from "@/data/business";
import { getService, isBanded, type ServiceSlug } from "@/data/services";
import { getSuburb } from "@/data/suburbs";
import { createBooking, type BookingState } from "@/lib/actions/booking";
import { logEvent } from "@/lib/actions/events";
import type { SlotOption } from "@/lib/actions/availability";
import { formatLongDate, SLOT_LABELS, type Slot } from "@/lib/dates";
import { estimateRange, formatRange } from "@/lib/pricing";
import { readSourceCode } from "@/components/site/tracking";
import { cta, ctaQuiet } from "@/components/site/ui";
import { OutOfArea } from "./out-of-area";
import {
  OUT_OF_AREA,
  StepAddress,
  StepDetails,
  StepServices,
  StepTime,
} from "./steps";

export type Draft = {
  services: { slug: ServiceSlug; bandId?: string }[];
  address: string;
  suburb: string;
  date: string;
  slot: Slot | "";
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const STEPS = ["Services", "Address", "Time", "Details"] as const;

const initialState: BookingState = { status: "idle" };

const AU_MOBILE = /^(?:\+?61|0)4\d{8}$/;

/**
 * The four-step booking flow (SPEC §5).
 *
 * State lives here rather than in the URL or on the server: each step has to
 * come back instantly, and a half-filled booking is not worth a round trip.
 * This is the one part of the site allowed to require JavaScript (CLAUDE.md);
 * everything else renders without it.
 *
 * Step boundaries are kept clean on purpose - the Phase-2 instant quote slots
 * in between address and time without touching the other steps (SPEC §10).
 */
export function BookingFlow({
  slots,
  initialServices,
  initialSuburb,
}: {
  slots: SlotOption[];
  initialServices: ServiceSlug[];
  initialSuburb: string;
}) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState,
  );
  const [draft, setDraft] = useState<Draft>({
    services: initialServices.map((slug) => ({ slug })),
    address: "",
    suburb: initialSuburb,
    date: "",
    slot: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void logEvent({ type: "book_start", code: readSourceCode() });
  }, []);

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const estimate = estimateRange(draft.services);
  const outOfArea = draft.suburb === OUT_OF_AREA;

  /** Client-side gate per step. The server revalidates everything anyway. */
  function validate(index: number): Record<string, string> {
    const found: Record<string, string> = {};

    if (index === 0) {
      if (draft.services.length === 0) {
        found.services = "Pick at least one service to get started.";
      }
      for (const chosen of draft.services) {
        const service = getService(chosen.slug);
        if (service && isBanded(service) && !chosen.bandId) {
          found[`band:${chosen.slug}`] =
            `Pick a size for ${service.shortName.toLowerCase()}.`;
        }
      }
    }

    if (index === 1) {
      if (draft.address.trim().length < 5) {
        found.address = "Please enter the street address.";
      }
      if (!draft.suburb) found.suburb = "Choose your suburb.";
    }

    if (index === 2 && (!draft.date || !draft.slot)) {
      found.slot = "Pick a day and a half-day that suits.";
    }

    if (index === 3) {
      if (draft.name.trim().length < 2) found.name = "Please enter your name.";
      const phone = draft.phone.replace(/[\s()\-.]/g, "");
      if (!AU_MOBILE.test(phone)) {
        found.phone = "Enter an Australian mobile, like 0412 345 678.";
      }
      if (draft.email.trim() && !draft.email.includes("@")) {
        found.email = "That email does not look right.";
      }
    }

    return found;
  }

  const next = () => {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((s) => s + 1);
  };

  const payload = JSON.stringify({
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    address: draft.address,
    suburb: draft.suburb,
    service_slugs: draft.services.map((s) => s.slug),
    service_options: Object.fromEntries(
      draft.services
        .filter((s) => s.bandId)
        .map((s) => [s.slug, { band: s.bandId }]),
    ),
    preferred_date: draft.date,
    slot: draft.slot,
    notes: draft.notes || undefined,
    source_code: typeof window === "undefined" ? undefined : readSourceCode(),
  });

  if (state.status === "success") {
    return <Confirmation draft={draft} booking={state.booking} />;
  }

  if (outOfArea) {
    return <OutOfArea onBack={() => update({ suburb: "" })} />;
  }

  const serverErrors = state.status === "error" ? state.errors : {};
  const shown = { ...serverErrors, ...errors };

  return (
    <div>
      <ol className="flex gap-1.5" aria-label="Booking progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <span
              aria-current={i === step ? "step" : undefined}
              className={`block h-1.5 rounded-full ${
                i <= step ? "bg-harbour" : "bg-line"
              }`}
            />
            <span
              className={`mt-1.5 block text-xs ${
                i === step ? "font-semibold text-harbour" : "text-ink-muted"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        {step === 0 ? (
          <StepServices draft={draft} update={update} errors={shown} />
        ) : null}
        {step === 1 ? (
          <StepAddress draft={draft} update={update} errors={shown} />
        ) : null}
        {step === 2 ? (
          <StepTime draft={draft} update={update} errors={shown} slots={slots} />
        ) : null}
        {step === 3 ? (
          <StepDetails draft={draft} update={update} errors={shown} />
        ) : null}
      </div>

      {shown.form ? (
        <p role="alert" className="mt-4 rounded-lg bg-harbour/10 px-4 py-3 text-sm font-medium text-harbour">
          {shown.form}
        </p>
      ) : null}

      <form action={formAction} className="mt-6">
        <input type="hidden" name="payload" value={payload} />
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className={ctaQuiet}
            >
              Back
            </button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={cta}>
              Continue
            </button>
          ) : (
            <button type="submit" disabled={pending} className={`${cta} disabled:opacity-60`}>
              {pending ? "Booking…" : "Book it in"}
            </button>
          )}
        </div>
      </form>

      {/* Live estimate. Sticky, because it is the reason people keep going. */}
      {estimate.hasPricedServices ? (
        <div className="sticky bottom-0 z-10 mt-6 border-t border-line bg-concrete/95 py-3 backdrop-blur">
          <p className="font-display text-price text-harbour tabular-nums">
            Estimated {formatRange(estimate.low, estimate.high)}
          </p>
          <p className="text-xs text-ink-muted">
            {estimate.bundleApplied
              ? `${BUSINESS.bundleDiscountPct}% multi-service discount applied. `
              : ""}
            {estimate.isProvisional ? "Pick a size to firm this up. " : ""}
            {BUSINESS.pricingDisclaimer}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** SPEC §5 confirm screen. */
function Confirmation({
  draft,
  booking,
}: {
  draft: Draft;
  booking: NonNullable<Extract<BookingState, { status: "success" }>["booking"]>;
}) {
  const suburb = getSuburb(draft.suburb);
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <p className="display-caps text-section text-harbour">Booked ✔</p>
      <p className="mt-3 text-lg text-ink">
        We will text you to confirm your exact arrival window.
      </p>

      <dl className="mt-5 grid gap-2 border-y border-line py-4 text-sm">
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-ink-muted">What</dt>
          <dd className="font-medium text-ink">
            {draft.services
              .map((s) => getService(s.slug)?.name ?? s.slug)
              .join(", ")}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-ink-muted">When</dt>
          <dd className="font-medium text-ink">
            {formatLongDate(booking.date)},{" "}
            {SLOT_LABELS[booking.slot].toLowerCase()}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-ink-muted">Where</dt>
          <dd className="font-medium text-ink">
            {draft.address}
            {suburb ? `, ${suburb.name}` : ""}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 shrink-0 text-ink-muted">Estimate</dt>
          <dd className="font-medium text-ink tabular-nums">
            {formatRange(booking.estLow, booking.estHigh)}
            {booking.bundleDiscount ? " (bundle applied)" : ""}
          </dd>
        </div>
      </dl>

      <ol className="mt-5 grid gap-2 text-sm text-ink-muted">
        <li>1. We text you to confirm the arrival window.</li>
        <li>2. We turn up and do the work.</li>
        <li>3. You pay on the day, once you have had a look at it.</li>
      </ol>

      <p className="mt-5 text-sm text-ink-muted">
        {BUSINESS.pricingDisclaimer} {BUSINESS.trust.guarantee}
      </p>

      <Link href="/" className={`${ctaQuiet} mt-6`}>
        Back to the site
      </Link>
    </div>
  );
}
