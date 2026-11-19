"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { BUSINESS } from "@/data/business";
import { isFilled, SHOW_PLACEHOLDERS } from "@/data/placeholders";
import {
  ADD_ONS,
  BUNDLES,
  DRIVEWAY_LARGEST,
  DRIVEWAY_OPTIONS,
  drivewayExtra,
  formatPrice,
  GUTTER_GUARD,
  includesDriveway,
  includesGutterGuard,
  itemName,
  packageLength,
  quote,
  servicePriceLabel,
  SERVICES_PRICED,
  type DrivewaySize,
  type DrivewaySizeOption,
  type GutterGuardSize,
  type PackageChoice,
  type ServiceId,
  type Storeys,
} from "@/data/pricing";
import { SUBURBS_ALPHABETICAL } from "@/data/suburbs";
import { createBooking, type BookingState, type BookingSuccess } from "@/lib/actions/booking";
import { logEvent } from "@/lib/actions/events";
import { addDays, formatLongDate, formatShortDate, todayISO } from "@/lib/dates";
import { OPEN_PICKER_DAYS } from "@/lib/street-days";
import { readSourceCode } from "@/components/site/tracking";
import { cta, ctaQuiet, field, fieldError, Placeholder } from "@/components/site/ui";

const OTHER = "other";
const MAX_PHOTOS = 4;

const initialState: BookingState = { status: "idle" };

const PACKAGE_LABELS: Record<PackageChoice, string> = {
  "exterior-refresh": "Exterior Refresh",
  "full-exterior": "Full Exterior",
  "gutter-guard": "Gutter guard",
  single: "Single services",
};

function packagePrice(choice: PackageChoice): string {
  if (choice === "gutter-guard") return `from ${formatPrice(GUTTER_GUARD.packages[0].price)}`;
  if (choice === "single") return `from ${formatPrice(Math.min(...SERVICES_PRICED.map((s) => s.price)))}`;
  return formatPrice(BUNDLES.find((b) => b.id === choice)?.price ?? 0);
}

/**
 * What a bundle actually is, under its name. A visitor straight off a flyer QR
 * can land here without having seen the pricing page, and "Full Exterior" on
 * its own does not say it is gutter guard plus the wash.
 */
function bundleDetail(choice: PackageChoice): string | undefined {
  const bundle = BUNDLES.find((b) => b.id === choice);
  if (!bundle) return undefined;
  const items = bundle.includes.map((id, i) => {
    const pkg = GUTTER_GUARD.packages.find((p) => p.id === id);
    const name = pkg
      ? `${pkg.name} gutter guard fitted (${packageLength(pkg)})${GUTTER_GUARD.includesGutterClean ? " with a gutter clean" : ""}`
      : itemName(id);
    return i === 0 ? name : name.charAt(0).toLowerCase() + name.slice(1);
  });
  const saving = bundle.saving ? ` Save ${formatPrice(bundle.saving)}.` : "";
  return `${items.join(", ")}.${saving}`;
}

/**
 * Shrinks a phone photo before upload: a 4MB camera shot becomes ~300KB,
 * which is the difference between a booking that sends on 4G at the
 * letterbox and one that times out. Falls back to the original file.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Same-origin path the visitor came from, else this page. */
function originPage(): string {
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && ref.pathname !== "/book") {
        return ref.pathname;
      }
    }
  } catch {
    /* fall through */
  }
  return window.location.pathname + window.location.search;
}

/**
 * The Book page form (docs/brief/site-content.md, "Book").
 *
 * One page, in the order the brief lists the fields, with the price updating
 * as choices change. Submitting saves the booking and moves to the deposit
 * step (bank transfer), then the confirmation.
 *
 * The booking form is the one part of the site allowed to need JavaScript
 * (CLAUDE.md): it shrinks photos and fills the hidden source/page fields.
 */
export function BookingForm({
  streetDays,
  initialPackage,
  initialServices,
  initialSize,
  initialSuburb,
}: {
  streetDays: Record<string, string[]>;
  initialPackage: PackageChoice;
  initialServices: ServiceId[];
  initialSize?: GutterGuardSize;
  initialSuburb: string;
}) {
  const [state, formAction, pending] = useActionState(createBooking, initialState);
  const [preparing, setPreparing] = useState(false);
  const [paidStep, setPaidStep] = useState(false);

  const [suburb, setSuburb] = useState(initialSuburb);
  const [storeys, setStoreys] = useState<Storeys>("single");
  const [choice, setChoice] = useState<PackageChoice>(initialPackage);
  const [services, setServices] = useState<ServiceId[]>(initialServices);
  const [addOns, setAddOns] = useState<ServiceId[]>([]);
  const [ggSize, setGgSize] = useState<GutterGuardSize | undefined>(initialSize);
  const [drivewaySize, setDrivewaySize] = useState<DrivewaySize>(DRIVEWAY_OPTIONS[0].id);
  const [date, setDate] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState("");

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = readSourceCode();
    // Browser-only values, read once on mount; the server render has none.
    setSource(code ?? "");
    setPage(originPage());
    void logEvent({ type: "book_start", code });
  }, []);

  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    address: useId(),
    suburb: useId(),
    other: useId(),
    date: useId(),
    photos: useId(),
    notes: useId(),
  };

  const isOther = suburb === OTHER;
  const days = streetDays[suburb] ?? [];
  const showRoof = includesGutterGuard({ package: choice });
  const showDriveway = includesDriveway({ package: choice, services });

  const priced = quote({
    package: choice,
    gutterGuardSize: choice === "gutter-guard" ? (ggSize ?? "not-sure") : undefined,
    services: choice === "single" ? services : undefined,
    addOns: choice === "single" ? undefined : addOns,
    drivewaySize: showDriveway ? drivewaySize : undefined,
    storeys,
  });

  /** In a bundle a size is what it adds; on its own it is the price. */
  const drivewayAside = (option: DrivewaySizeOption) => {
    if (choice === "single") return formatPrice(option.price);
    const extra = drivewayExtra(option);
    return extra === 0 ? "Included" : `+${formatPrice(extra)}`;
  };
  const hasSelection = choice !== "single" || services.length > 0;

  const errors = state.status === "error" ? state.errors : {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const photos = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_PHOTOS);
    formData.delete("photos");
    setPreparing(true);
    const shrunk = await Promise.all(photos.map(shrink));
    setPreparing(false);
    for (const file of shrunk) formData.append("photos", file);
    startTransition(() => formAction(formData));
  }

  if (state.status === "success") {
    return paidStep ? (
      <Confirmation booking={state.booking} />
    ) : (
      <DepositStep booking={state.booking} onDone={() => setPaidStep(true)} />
    );
  }

  if (state.status === "enquiry") return <EnquiryThanks suburb={state.suburb} />;

  const busy = pending || preparing;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-12"
    >
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="page" value={page} />

      <div className="grid gap-8">
        <Fieldset legend="What would you like?" error={errors.package ?? errors.services ?? errors.gutter_guard_size}>
          <div className="grid gap-2">
            {(Object.keys(PACKAGE_LABELS) as PackageChoice[]).map((value) => (
              <Choice
                key={value}
                name="package"
                value={value}
                checked={choice === value}
                onChange={() => setChoice(value)}
                aside={packagePrice(value)}
                detail={bundleDetail(value)}
              >
                {PACKAGE_LABELS[value]}
              </Choice>
            ))}
          </div>

          {choice === "gutter-guard" ? (
            <div className="mt-3 grid gap-2 border-l-2 border-harbour/30 pl-3">
              <p className="text-sm font-semibold">Gutter guard size</p>
              {GUTTER_GUARD.packages.map((pkg) => {
                const size = pkg.id.replace("gutter-guard-", "") as GutterGuardSize;
                return (
                  <Choice
                    key={pkg.id}
                    name="gutter_guard_size"
                    value={size}
                    checked={ggSize === size}
                    onChange={() => setGgSize(size)}
                    aside={formatPrice(pkg.price)}
                  >
                    {pkg.name} <span className="font-normal text-ink-muted">({packageLength(pkg)})</span>
                  </Choice>
                );
              })}
              <Choice
                name="gutter_guard_size"
                value="not-sure"
                checked={ggSize === "not-sure"}
                onChange={() => setGgSize("not-sure")}
              >
                Not sure <span className="font-normal text-ink-muted">(we&apos;ll measure by phone)</span>
              </Choice>
            </div>
          ) : null}

          {choice === "single" ? (
            <div className="mt-3 grid gap-2 border-l-2 border-harbour/30 pl-3">
              {SERVICES_PRICED.map((service) => (
                <Choice
                  key={service.id}
                  type="checkbox"
                  name="services"
                  value={service.id}
                  checked={services.includes(service.id)}
                  onChange={() =>
                    setServices((current) =>
                      current.includes(service.id)
                        ? current.filter((id) => id !== service.id)
                        : [...current, service.id],
                    )
                  }
                  aside={servicePriceLabel(service)}
                >
                  {service.name}
                </Choice>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {ADD_ONS.map((service) => (
                <Choice
                  key={service.id}
                  type="checkbox"
                  name="addons"
                  value={service.id}
                  checked={addOns.includes(service.id)}
                  onChange={() =>
                    setAddOns((current) =>
                      current.includes(service.id)
                        ? current.filter((id) => id !== service.id)
                        : [...current, service.id],
                    )
                  }
                  aside={servicePriceLabel(service)}
                >
                  Add {service.name.toLowerCase()} while we&apos;re there?
                </Choice>
              ))}
            </div>
          )}
        </Fieldset>

        {showDriveway ? (
          <Fieldset legend="Driveway size">
            <p className="-mt-1 text-sm text-ink-muted">How many cars fit on your driveway?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DRIVEWAY_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  name="driveway_size"
                  value={option.id}
                  checked={drivewaySize === option.id}
                  onChange={() => setDrivewaySize(option.id)}
                  aside={drivewayAside(option)}
                  detail={option.detail}
                >
                  {option.name}
                </Choice>
              ))}
              <Choice
                name="driveway_size"
                value="bigger"
                checked={drivewaySize === "bigger"}
                onChange={() => setDrivewaySize("bigger")}
                aside="By phone"
              >
                Bigger than {DRIVEWAY_LARGEST.cars} cars
              </Choice>
            </div>
          </Fieldset>
        ) : null}

        <Fieldset legend="Storeys">
          <div className="flex gap-2">
            {(["single", "double"] as const).map((value) => (
              <Choice
                key={value}
                name="storeys"
                value={value}
                checked={storeys === value}
                onChange={() => setStoreys(value)}
              >
                {value === "single" ? "Single" : "Double"}
              </Choice>
            ))}
          </div>
        </Fieldset>

        {showRoof ? (
          <Fieldset legend="Roof type" error={errors.roof_type}>
            <div className="flex flex-wrap gap-2">
              {(["tile", "metal", "not-sure"] as const).map((value) => (
                <Choice key={value} name="roof_type" value={value} required>
                  {value === "not-sure" ? "Not sure" : value === "tile" ? "Tile" : "Metal"}
                </Choice>
              ))}
            </div>
          </Fieldset>
        ) : null}

        <Fieldset legend="Your suburb">
          <div>
            <label htmlFor={ids.suburb} className="sr-only">
              Suburb
            </label>
            <select
              id={ids.suburb}
              name="suburb"
              value={suburb}
              required
              onChange={(e) => {
                setSuburb(e.target.value);
                setDate("");
              }}
              className={`${field} mt-1`}
            >
              <option value="">Choose your suburb…</option>
              {SUBURBS_ALPHABETICAL.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
              <option value={OTHER}>Other</option>
            </select>
            {errors.suburb ? <p className={fieldError}>{errors.suburb}</p> : null}
          </div>

          {isOther ? (
            <div className="rounded-lg bg-harbour/5 p-4">
              <TextField
                id={ids.other}
                name="other_suburb"
                label="Which suburb?"
                required
                error={errors.other_suburb}
              />
              <p className="mt-2 text-sm text-ink-muted">
                We&apos;re not booking there yet. Send your details and we&apos;ll call you about a
                day. No deposit needed.
              </p>
            </div>
          ) : null}
        </Fieldset>

        <Fieldset legend="Preferred day" error={errors.preferred_date}>
          {days.length > 0 ? (
            <>
              <p className="text-sm text-ink-muted">The days we&apos;re booking your suburb&apos;s streets:</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map((day) => (
                  <Choice
                    key={day}
                    name="preferred_date"
                    value={day}
                    checked={date === day}
                    onChange={() => setDate(day)}
                    required
                  >
                    {formatShortDate(day)}
                  </Choice>
                ))}
              </div>
            </>
          ) : (
            <div>
              <label htmlFor={ids.date} className="block text-sm font-semibold">
                Pick a day that suits
              </label>
              <input
                id={ids.date}
                type="date"
                name="preferred_date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={addDays(todayISO(), 1)}
                max={addDays(todayISO(), OPEN_PICKER_DAYS)}
                required
                className={`${field} mt-1`}
              />
              <p className="mt-1 text-xs text-ink-muted">
                {isOther
                  ? "We'll call to arrange a day."
                  : "We'll confirm the day by phone, matched to when we're in your street."}
              </p>
            </div>
          )}
        </Fieldset>

        <Fieldset legend="Your details">
          <TextField id={ids.name} name="name" label="Name" autoComplete="name" required error={errors.name} />
          <TextField
            id={ids.phone}
            name="phone"
            label="Mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            required
            error={errors.phone}
          />
          <TextField
            id={ids.email}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            error={errors.email}
            hint="Your booking and the deposit details go here."
          />
          <TextField
            id={ids.address}
            name="address"
            label="Street address"
            autoComplete="street-address"
            placeholder="12 Example Street"
            required
            error={errors.address}
          />
        </Fieldset>

        <div>
          <label htmlFor={ids.photos} className="block text-sm font-semibold">
            Photos of the house <span className="font-normal text-ink-muted">(optional, up to {MAX_PHOTOS})</span>
          </label>
          <input
            id={ids.photos}
            type="file"
            name="photos"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-harbour file:px-4 file:py-2.5 file:font-semibold file:text-white"
          />
          {errors.photos ? <p className={fieldError}>{errors.photos}</p> : null}
        </div>

        <div>
          <label htmlFor={ids.notes} className="block text-sm font-semibold">
            Anything we should know? <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id={ids.notes}
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="Gates, dogs, access…"
            className={`${field} mt-1`}
          />
          {errors.notes ? <p className={fieldError}>{errors.notes}</p> : null}
        </div>

        {errors.form ? (
          <p role="alert" className="rounded-lg bg-harbour/10 px-4 py-3 text-sm font-medium text-harbour">
            {errors.form}
          </p>
        ) : null}
        {Object.keys(errors).length > 0 && !errors.form ? (
          <p role="alert" className="rounded-lg bg-harbour/10 px-4 py-3 text-sm font-medium text-harbour">
            Please check the highlighted fields above.
          </p>
        ) : null}
      </div>

      {/*
        Price. Sticky, because it is the reason people keep going: a bar along
        the bottom of a phone, a summary card beside the form on a desktop.
      */}
      <div className="sticky bottom-0 z-10 -mx-5 border-t border-line bg-concrete/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:top-24 lg:bottom-auto lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface lg:p-6 lg:shadow-[0_1px_2px_rgba(27,35,40,0.04)] lg:backdrop-blur-none">
        <p className="eyebrow mb-3 hidden text-harbour lg:block">
          {isOther ? "Your enquiry" : "Your price"}
        </p>
        {!isOther && hasSelection ? (
          <div className="mb-3 lg:mb-5">
            <p className="font-display text-price text-harbour">
              {priced.isFrom ? "From " : ""}
              {formatPrice(priced.total)}
              <span className="ml-2 font-sans text-sm font-normal text-ink-muted">
                GST incl. · deposit {formatPrice(priced.deposit)}
              </span>
            </p>
            {priced.lines.length > 1 ? (
              <p className="text-xs text-ink-muted">
                {priced.lines.map((l) => `${l.label} ${formatPrice(l.amount)}`).join(" · ")}
              </p>
            ) : null}
            {priced.confirmByPhone.length ? (
              <p className="text-xs text-ink-muted">{priced.confirmByPhone.join(" ")}</p>
            ) : null}
          </div>
        ) : null}
        <button type="submit" disabled={busy} className={`${cta} w-full disabled:opacity-60`}>
          {preparing ? "Preparing photos…" : pending ? "Sending…" : isOther ? "Send enquiry" : "Book my day"}
        </button>
        {/* "Pay" on the button read as a card form. Nothing is charged here. */}
        <p className="mt-2 text-center text-xs text-ink-muted">
          {isOther
            ? "No deposit needed. We'll call you about a day."
            : "No payment on this page. The deposit details come next."}
        </p>
      </div>
    </form>
  );
}

/* ── Deposit and confirmation ───────────────────────────────────────────── */

/** Digits only: what a banking app's BSB and account fields accept. */
const digits = (value: string) => value.replace(/\D/g, "");

/**
 * The form is long and each step after it is short. Swapping one for the
 * other left a phone scrolled down to the footer, and the customer never saw
 * their reference or the bank details. So each step brings itself to the top
 * when it appears, and takes focus so a screen reader reads it out.
 */
function useStepInView() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, []);
  return ref;
}

const STEP_CARD =
  "max-w-2xl scroll-mt-24 rounded-2xl border border-line bg-surface p-6 focus:outline-none sm:p-8";

function DepositStep({ booking, onDone }: { booking: BookingSuccess; onDone: () => void }) {
  const { accountName, bsb, accountNumber } = BUSINESS.bank;
  const bankReady = [accountName, bsb, accountNumber].every(isFilled);
  // Unfilled bank details: placeholders while developing; in production the
  // same promise the confirmation email makes - we text the details.
  const showBank = bankReady || SHOW_PLACEHOLDERS;

  /** [label, shown value, value copied to the clipboard] */
  const rows: [string, string, string][] = [
    ...(showBank
      ? ([
          ["Account name", accountName, accountName],
          ["BSB", bsb, digits(bsb)],
          ["Account", accountNumber, digits(accountNumber)],
        ] as [string, string, string][])
      : []),
    ["Reference", booking.reference, booking.reference],
    ["Amount", formatPrice(booking.deposit), String(booking.deposit)],
  ];
  const ref = useStepInView();

  return (
    <div ref={ref} tabIndex={-1} className={STEP_CARD}>
      <p className="text-sm font-semibold tracking-wide text-harbour uppercase">Step 2 of 2</p>
      <p className="display-caps mt-1 text-section text-harbour">
        {showBank ? "Pay your deposit" : "Your deposit"}
      </p>
      <p className="mt-3 text-ink">
        {showBank ? (
          <>
            Transfer the {formatPrice(booking.deposit)} deposit to hold {formatLongDate(booking.date)}.
          </>
        ) : (
          <>
            We&apos;ll text you the bank details to pay the {formatPrice(booking.deposit)} deposit
            that holds {formatLongDate(booking.date)}.
          </>
        )}{" "}
        Put <strong>{booking.reference}</strong> as the reference so we can match it.
      </p>

      <dl className="mt-5 grid gap-1 border-y border-line py-3 text-sm">
        {rows.map(([label, value, copyValue]) => (
          <div key={label} className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
            <dd className="flex flex-1 items-center justify-between gap-2 font-semibold text-ink">
              <Placeholder value={value} />
              {isFilled(value) ? <CopyButton label={label} value={copyValue} /> : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm text-ink-muted">
        {booking.summary}: {booking.isFrom ? "from " : ""}
        {formatPrice(booking.total)} GST incl. The balance is invoiced after the job.
        {booking.confirmByPhone.length ? ` ${booking.confirmByPhone.join(" ")}` : ""}
      </p>
      {booking.emailed ? (
        <p className="mt-2 text-sm text-ink-muted">These details are also in your email.</p>
      ) : null}
      {booking.photosSent > booking.photosSaved ? (
        <p className="mt-2 text-sm text-ink-muted">
          Some photos didn&apos;t upload. You can text them to {BUSINESS.phone.display}.
        </p>
      ) : null}

      <button type="button" onClick={onDone} className={`${cta} mt-6 w-full`}>
        Done
      </button>
    </div>
  );
}

function Confirmation({ booking }: { booking: BookingSuccess }) {
  const ref = useStepInView();
  return (
    <div ref={ref} tabIndex={-1} className={STEP_CARD}>
      <p className="display-caps text-section text-harbour">
        You&apos;re booked for {formatLongDate(booking.date)}.
      </p>
      <p className="mt-3 text-lg text-ink">We&apos;ll text you the day before.</p>
      <p className="mt-3 text-sm text-ink-muted">
        Booking reference {booking.reference}. We call if we need to check size, storeys or
        access. Questions? Call {BUSINESS.phone.display}.
      </p>
      <Link href="/" className={`${ctaQuiet} mt-6`}>
        Back to the site
      </Link>
    </div>
  );
}

function EnquiryThanks({ suburb }: { suburb: string }) {
  const ref = useStepInView();
  return (
    <div ref={ref} tabIndex={-1} className={STEP_CARD}>
      <p className="display-caps text-section text-harbour">Thanks, we&apos;ll call you</p>
      <p className="mt-3 text-ink">
        We&apos;re not booking {suburb} streets yet. We have your details and will call you about
        a day.
      </p>
      <Link href="/" className={`${ctaQuiet} mt-6`}>
        Back to the site
      </Link>
    </div>
  );
}

/* ── Small form pieces ──────────────────────────────────────────────────── */

/**
 * Tap-to-copy for the deposit details. The customer is about to switch to
 * their banking app on the same phone; retyping a BSB and a WB- reference from
 * memory is where transfers go astray. Hidden where the clipboard API is not
 * available - the value is still on screen to copy by hand.
 */
function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const canCopy = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText),
    () => false,
  );
  if (!canCopy) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* the value is on screen either way */
        }
      }}
      className="shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold text-harbour hover:bg-harbour/5"
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      <span className="sr-only"> {label}</span>
    </button>
  );
}

const noopSubscribe = () => () => {};

function Fieldset({
  legend,
  error,
  children,
}: {
  legend: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-3 border-0 p-0">
      <legend className="mb-2 font-display text-xl tracking-wide text-harbour uppercase">
        {legend}
      </legend>
      {children}
      {error ? (
        <p role="alert" className={fieldError}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function TextField({
  id,
  label,
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${field} mt-1`}
      />
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-err`} className={fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A radio or checkbox styled as a tappable row. */
function Choice({
  type = "radio",
  name,
  value,
  checked,
  onChange,
  required,
  aside,
  detail,
  children,
}: {
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  checked?: boolean;
  onChange?: () => void;
  required?: boolean;
  aside?: string;
  /** A muted line under the label, e.g. what a bundle includes. */
  detail?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-3 has-[:checked]:border-harbour has-[:checked]:bg-harbour/5">
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        required={required}
        className="size-5 shrink-0 accent-[#123c52]"
      />
      <span className="flex-1">
        <span className="block font-semibold text-ink">{children}</span>
        {detail ? <span className="mt-0.5 block text-sm text-ink-muted">{detail}</span> : null}
      </span>
      {aside ? <span className="shrink-0 text-sm font-semibold text-harbour">{aside}</span> : null}
    </label>
  );
}
