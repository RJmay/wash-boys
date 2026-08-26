"use client";

import Link from "next/link";
import { useId } from "react";

import { BUSINESS } from "@/data/business";
import {
  BOOKABLE_SERVICES,
  COMING_SOON_SERVICES,
  isBanded,
  serviceFromPrice,
  type Service,
} from "@/data/services";
import { SUBURBS_ALPHABETICAL } from "@/data/suburbs";
import type { SlotOption } from "@/lib/actions/availability";
import { formatShortDate, SLOT_LABELS, type Slot } from "@/lib/dates";
import { formatPrice, formatRange } from "@/lib/pricing";
import { field, fieldError } from "@/components/site/ui";
import type { Draft } from "./booking-flow";

/** Sentinel for "my suburb is not on the list", which opens the lead catch. */
export const OUT_OF_AREA = "__out_of_area__";

type StepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: Record<string, string>;
};

/* ── Step 1 — services ──────────────────────────────────────────────────── */

function SizePicker({
  service,
  selectedBand,
  onPick,
  invalid,
}: {
  service: Service;
  selectedBand?: string;
  onPick: (bandId: string) => void;
  invalid?: boolean;
}) {
  if (!isBanded(service)) return null;

  return (
    <fieldset className="mt-3 border-0 p-0">
      <legend className="text-sm font-semibold text-ink">
        {service.pricing.prompt}
      </legend>
      <div className="mt-2 grid gap-2">
        {service.pricing.bands.map((band) => {
          const active = band.id === selectedBand;
          return (
            <button
              key={band.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(band.id)}
              className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? "border-harbour bg-harbour/5"
                  : invalid
                    ? "border-harbour/60"
                    : "border-line hover:border-harbour/50"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {band.label}
                </span>
                <span className="block text-xs text-ink-muted">{band.hint}</span>
              </span>
              <span className="shrink-0 pt-0.5 text-sm font-semibold text-harbour tabular-nums">
                {band.quoteOnly
                  ? "Quoted"
                  : formatRange(band.priceLow, band.priceHigh)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function StepServices({ draft, update, errors }: StepProps) {
  const toggle = (slug: Service["slug"]) => {
    const exists = draft.services.some((s) => s.slug === slug);
    update({
      services: exists
        ? draft.services.filter((s) => s.slug !== slug)
        : [...draft.services, { slug }],
    });
  };

  const setBand = (slug: Service["slug"], bandId: string) =>
    update({
      services: draft.services.map((s) =>
        s.slug === slug ? { ...s, bandId } : s,
      ),
    });

  return (
    <div>
      <h2 className="display-caps text-section text-harbour">
        What needs cleaning?
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Pick everything you want done — two or more takes{" "}
        {BUSINESS.bundleDiscountPct}% off.
      </p>

      {errors.services ? (
        <p role="alert" className={fieldError}>
          {errors.services}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3">
        {BOOKABLE_SERVICES.map((service) => {
          const chosen = draft.services.find((s) => s.slug === service.slug);
          const needsBand = Boolean(errors[`band:${service.slug}`]);
          return (
            <li
              key={service.slug}
              className={`rounded-xl border bg-surface p-4 transition ${
                chosen ? "border-harbour" : "border-line"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(chosen)}
                  onChange={() => toggle(service.slug)}
                  className="mt-1 size-5 shrink-0 accent-[#123c52]"
                />
                <span className="flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-ink">{service.name}</span>
                    <span className="shrink-0 font-display text-lg text-harbour tabular-nums">
                      from {formatPrice(serviceFromPrice(service))}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {service.blurb}
                  </span>
                </span>
              </label>

              {chosen ? (
                <>
                  <SizePicker
                    service={service}
                    selectedBand={chosen.bandId}
                    onPick={(bandId) => setBand(service.slug, bandId)}
                    invalid={needsBand}
                  />
                  {needsBand ? (
                    <p role="alert" className={fieldError}>
                      {errors[`band:${service.slug}`]}
                    </p>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}

        {/* Never selectable. Gutters go to the waitlist, never a booking. */}
        {COMING_SOON_SERVICES.map((service) => (
          <li
            key={service.slug}
            className="rounded-xl border border-dashed border-line bg-surface/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-ink-muted">{service.name}</span>
              <span className="shrink-0 rounded-full bg-harbour/10 px-3 py-1 text-xs font-semibold tracking-wide text-harbour uppercase">
                Coming soon
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Not bookable yet, and we will not quote it until it is.{" "}
              <Link
                href="/#gutter-waitlist"
                className="font-semibold text-harbour underline underline-offset-4"
              >
                Join the waitlist
              </Link>{" "}
              and we will call you first.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Step 2 — address ───────────────────────────────────────────────────── */

export function StepAddress({ draft, update, errors }: StepProps) {
  const addressId = useId();
  const suburbId = useId();

  return (
    <div>
      <h2 className="display-caps text-section text-harbour">Where is it?</h2>
      <p className="mt-2 text-sm text-ink-muted">
        We only need the street address to plan the run.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor={addressId} className="block text-sm font-semibold">
            Street address
          </label>
          <input
            id={addressId}
            value={draft.address}
            onChange={(e) => update({ address: e.target.value })}
            autoComplete="street-address"
            placeholder="12 Beach Parade"
            className={`${field} mt-1`}
            aria-describedby={errors.address ? `${addressId}-err` : undefined}
          />
          {errors.address ? (
            <p id={`${addressId}-err`} className={fieldError}>
              {errors.address}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={suburbId} className="block text-sm font-semibold">
            Suburb
          </label>
          <select
            id={suburbId}
            value={draft.suburb}
            onChange={(e) => update({ suburb: e.target.value })}
            className={`${field} mt-1`}
            aria-describedby={errors.suburb ? `${suburbId}-err` : undefined}
          >
            <option value="">Choose your suburb…</option>
            {SUBURBS_ALPHABETICAL.map((suburb) => (
              <option key={suburb.slug} value={suburb.slug}>
                {suburb.name}
              </option>
            ))}
            <option value={OUT_OF_AREA}>My suburb is not listed</option>
          </select>
          {errors.suburb ? (
            <p id={`${suburbId}-err`} className={fieldError}>
              {errors.suburb}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Step 3 — time ──────────────────────────────────────────────────────── */

export function StepTime({
  draft,
  update,
  errors,
  slots,
}: StepProps & { slots: SlotOption[] }) {
  const byDate = new Map<string, SlotOption[]>();
  for (const slot of slots) {
    byDate.set(slot.date, [...(byDate.get(slot.date) ?? []), slot]);
  }

  return (
    <div>
      <h2 className="display-caps text-section text-harbour">
        When suits you?
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Half-days, {BUSINESS.hours.days.toLowerCase()}. We text you the exact
        arrival window once we confirm.
      </p>

      {errors.slot ? (
        <p role="alert" className={fieldError}>
          {errors.slot}
        </p>
      ) : null}

      {byDate.size === 0 ? (
        <p className="mt-5 rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted">
          No slots are open in the next two weeks. Give us a call on{" "}
          {BUSINESS.phone.display} and we will sort something out.
        </p>
      ) : (
        <ul className="mt-5 grid gap-2">
          {[...byDate.entries()].map(([date, options]) => (
            <li
              key={date}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <span className="w-24 shrink-0 text-sm font-semibold text-ink">
                {formatShortDate(date)}
              </span>
              <span className="flex flex-1 gap-2">
                {(["am", "pm"] as Slot[]).map((slot) => {
                  const option = options.find((o) => o.slot === slot);
                  if (!option) return <span key={slot} className="flex-1" />;
                  const active =
                    draft.date === date && draft.slot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!option.available}
                      aria-pressed={active}
                      onClick={() => update({ date, slot })}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-harbour bg-harbour text-white"
                          : option.available
                            ? "border-line text-ink hover:border-harbour/50"
                            : "cursor-not-allowed border-line/60 text-ink-muted/60 line-through"
                      }`}
                    >
                      {option.available
                        ? SLOT_LABELS[slot]
                        : "Booked out"}
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Sunday afternoons are overflow only and start after 11am — petrol
        washers are loud.
      </p>
    </div>
  );
}

/* ── Step 4 — details ───────────────────────────────────────────────────── */

export function StepDetails({ draft, update, errors }: StepProps) {
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const notesId = useId();

  return (
    <div>
      <h2 className="display-caps text-section text-harbour">
        How do we reach you?
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        No account, no deposit. We text you to confirm the window.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor={nameId} className="block text-sm font-semibold">
            Name
          </label>
          <input
            id={nameId}
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            autoComplete="name"
            className={`${field} mt-1`}
          />
          {errors.name ? <p className={fieldError}>{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor={phoneId} className="block text-sm font-semibold">
            Mobile
          </label>
          <input
            id={phoneId}
            value={draft.phone}
            onChange={(e) => update({ phone: e.target.value })}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            className={`${field} mt-1`}
          />
          {errors.phone ? <p className={fieldError}>{errors.phone}</p> : null}
        </div>

        <div>
          <label htmlFor={emailId} className="block text-sm font-semibold">
            Email <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id={emailId}
            value={draft.email}
            onChange={(e) => update({ email: e.target.value })}
            type="email"
            autoComplete="email"
            className={`${field} mt-1`}
          />
          {errors.email ? <p className={fieldError}>{errors.email}</p> : null}
          <p className="mt-1 text-xs text-ink-muted">
            Only used to send your booking confirmation.
          </p>
        </div>

        <div>
          <label htmlFor={notesId} className="block text-sm font-semibold">
            Anything we should know?{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id={notesId}
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={3}
            placeholder="Gate code, dog in the yard, where to park…"
            className={`${field} mt-1`}
          />
          {errors.notes ? <p className={fieldError}>{errors.notes}</p> : null}
        </div>
      </div>
    </div>
  );
}
