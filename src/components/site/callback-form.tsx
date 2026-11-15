"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import { requestCallback, type LeadState } from "@/lib/actions/leads";
import { SourceCodeField } from "./tracking";
import { ctaQuiet, field, fieldError } from "./ui";

const initialState: LeadState = { status: "idle" };

/**
 * "Call me back": mobile, suburb, optional name. The low-commitment option
 * for a visitor not ready to book a day yet.
 *
 * Posts straight to the server action, so it works with JavaScript off; with
 * it on, the source code and page are filled in for attribution.
 */
export function CallbackForm() {
  const [state, formAction, pending] = useActionState(requestCallback, initialState);
  const ids = { name: useId(), phone: useId(), suburb: useId() };
  const pageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pageRef.current) pageRef.current.value = window.location.pathname;
  }, []);

  if (state.status === "success") {
    return (
      <p role="status" className="mt-5 rounded-lg bg-harbour/5 px-4 py-3 font-semibold text-ink">
        Thanks. We&apos;ll call you back soon.
      </p>
    );
  }

  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={formAction} className="mt-5 grid gap-3">
      <SourceCodeField />
      <input ref={pageRef} type="hidden" name="page" defaultValue="" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.phone} className="block text-sm font-semibold">
            Mobile
          </label>
          <input
            id={ids.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            required
            aria-invalid={errors.phone ? true : undefined}
            className={`${field} mt-1`}
          />
          {errors.phone ? <p className={fieldError}>{errors.phone}</p> : null}
        </div>
        <div>
          <label htmlFor={ids.suburb} className="block text-sm font-semibold">
            Suburb
          </label>
          <input
            id={ids.suburb}
            name="suburb"
            autoComplete="address-level2"
            required
            aria-invalid={errors.suburb ? true : undefined}
            className={`${field} mt-1`}
          />
          {errors.suburb ? <p className={fieldError}>{errors.suburb}</p> : null}
        </div>
      </div>
      <div>
        <label htmlFor={ids.name} className="block text-sm font-semibold">
          Name <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id={ids.name}
          name="name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          className={`${field} mt-1`}
        />
        {errors.name ? <p className={fieldError}>{errors.name}</p> : null}
      </div>

      {errors.form ? (
        <p role="alert" className="rounded-lg bg-harbour/10 px-4 py-3 text-sm font-medium text-harbour">
          {errors.form}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${ctaQuiet} w-full sm:w-fit disabled:opacity-60`}>
        {pending ? "Sending…" : "Call me back"}
      </button>
    </form>
  );
}
