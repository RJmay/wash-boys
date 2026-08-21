"use client";

import { useActionState, useId, useSyncExternalStore } from "react";

import { isStormSeason } from "@/data/site";
import { SUBURBS_ALPHABETICAL } from "@/data/suburbs";
import { joinWaitlist, type WaitlistState } from "@/lib/actions/waitlist";
import { SourceCodeField } from "./tracking";
import { Section, SectionHeading } from "./ui";

const initialState: WaitlistState = { status: "idle" };

const field =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-3 text-ink placeholder:text-ink-muted/70";

/** No subscription — the month does not change while someone reads the page. */
const noopSubscribe = () => () => {};
const readSeason = () => isStormSeason(new Date().getMonth() + 1);
/** Server render is always the off-season copy, so hydration matches. */
const seasonOnServer = () => false;

/**
 * Gutter waitlist (SPEC §4.8, CLAUDE.md).
 *
 * The only destination for a gutter enquiry until the service is live. No
 * price is shown here and none may be added: the whole point is to build a
 * ready call list for the week it switches on.
 *
 * Storm season (Sept-Nov) drives most of this demand, so the prompt sharpens
 * during those months. That check runs on the client because the page itself
 * is static - a build in August would otherwise still be claiming August in
 * November.
 */
export function GutterWaitlist() {
  const [state, formAction, pending] = useActionState(
    joinWaitlist,
    initialState,
  );
  const inSeason = useSyncExternalStore(
    noopSubscribe,
    readSeason,
    seasonOnServer,
  );
  const nameId = useId();
  const phoneId = useId();
  const suburbId = useId();
  const listId = useId();

  const errors = state.status === "error" ? state.errors : {};

  return (
    <Section id="gutter-waitlist" labelledBy="waitlist-heading">
      <div className="rounded-xl border border-line bg-surface p-6">
        <SectionHeading id="waitlist-heading">
          Gutter cleaning is coming
        </SectionHeading>

        <p className="mt-3 text-ink-muted">
          {inSeason
            ? "Storm season is here and gutters fill fast. We are getting set up for it now — join the list and we will call you first, before we take any general bookings."
            : "We are getting set up for gutter cleaning ahead of storm season. Join the list and we will call you first when it goes live."}
        </p>

        {state.status === "success" ? (
          <p
            role="status"
            className="mt-5 rounded-lg bg-harbour px-4 py-3 font-semibold text-white"
          >
            You are on the list. We will call you before we open gutter
            bookings up.
          </p>
        ) : (
          <form action={formAction} className="mt-5 grid gap-4">
            <div>
              <label htmlFor={nameId} className="block text-sm font-semibold">
                Name
              </label>
              <input
                id={nameId}
                name="name"
                autoComplete="name"
                required
                className={`${field} mt-1`}
                aria-describedby={errors.name ? `${nameId}-err` : undefined}
              />
              {errors.name ? (
                <p id={`${nameId}-err`} className="mt-1 text-sm text-harbour">
                  {errors.name}
                </p>
              ) : null}
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
                aria-describedby={errors.phone ? `${phoneId}-err` : undefined}
              />
              {errors.phone ? (
                <p id={`${phoneId}-err`} className="mt-1 text-sm text-harbour">
                  {errors.phone}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor={suburbId} className="block text-sm font-semibold">
                Suburb
              </label>
              <input
                id={suburbId}
                name="suburb"
                list={listId}
                autoComplete="address-level2"
                className={`${field} mt-1`}
              />
              <datalist id={listId}>
                {SUBURBS_ALPHABETICAL.map((suburb) => (
                  <option key={suburb.slug} value={suburb.name} />
                ))}
              </datalist>
            </div>

            <SourceCodeField />

            {errors.form ? (
              <p role="alert" className="text-sm font-semibold text-harbour">
                {errors.form}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-fit items-center justify-center rounded-lg border-2 border-harbour px-6 py-3 font-semibold text-harbour transition hover:bg-harbour hover:text-surface disabled:opacity-60"
            >
              {pending ? "Adding you…" : "Join the waitlist"}
            </button>

            <p className="text-xs text-ink-muted">
              We will only use this to call you about gutter cleaning.
            </p>
          </form>
        )}
      </div>
    </Section>
  );
}
