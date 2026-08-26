"use client";

import { useActionState, useId } from "react";

import { BUSINESS } from "@/data/business";
import { captureLead, type LeadState } from "@/lib/actions/leads";
import { field, fieldError } from "@/components/site/ui";
import { SourceCodeField } from "@/components/site/tracking";

const initialState: LeadState = { status: "idle" };

/**
 * The out-of-area catch from booking step 2 (SPEC §5).
 *
 * Deliberately not a booking. Promising a job in a suburb we do not service
 * is a cancelled job and a bad review, so this only ever takes a number. Which
 * suburbs keep asking is the input to the next flyer wave.
 */
export function OutOfArea({ onBack }: { onBack: () => void }) {
  const [state, formAction, pending] = useActionState(captureLead, initialState);
  const suburbId = useId();
  const nameId = useId();
  const phoneId = useId();

  const errors = state.status === "error" ? state.errors : {};

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="display-caps text-section text-harbour">
          Thanks — you are on the list
        </h2>
        <p className="mt-3 text-ink-muted">
          We will give you a call if we start covering your area. In the
          meantime, if you are close to the corridor it is worth ringing{" "}
          {BUSINESS.phone.display} — we sometimes stretch for a good job.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h2 className="display-caps text-section text-harbour">
        We are not out there yet
      </h2>
      <p className="mt-3 text-ink-muted">
        We cover the Caloundra to Buderim corridor at the moment. Leave your
        number and we will call you if we head your way — we are adding
        suburbs as we go.
      </p>

      <form action={formAction} className="mt-5 grid gap-4">
        <div>
          <label htmlFor={suburbId} className="block text-sm font-semibold">
            Which suburb?
          </label>
          <input
            id={suburbId}
            name="suburb"
            required
            autoComplete="address-level2"
            className={`${field} mt-1`}
          />
          {errors.suburb ? <p className={fieldError}>{errors.suburb}</p> : null}
        </div>

        <div>
          <label htmlFor={nameId} className="block text-sm font-semibold">
            Name <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id={nameId}
            name="name"
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
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            required
            className={`${field} mt-1`}
          />
          {errors.phone ? <p className={fieldError}>{errors.phone}</p> : null}
        </div>

        <SourceCodeField />

        {errors.form ? (
          <p role="alert" className={fieldError}>
            {errors.form}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-hivis px-6 py-3 font-display text-lg tracking-wide text-ink uppercase disabled:opacity-60"
          >
            {pending ? "Sending…" : "Leave my number"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-lg border-2 border-harbour px-5 py-3 font-semibold text-harbour"
          >
            Pick a different suburb
          </button>
        </div>
      </form>
    </div>
  );
}
