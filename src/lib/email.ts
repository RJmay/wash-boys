import "server-only";

import { Resend } from "resend";

import { BUSINESS } from "@/data/business";
import { getService } from "@/data/services";
import { formatLongDate, SLOT_LABELS, type Slot } from "@/lib/dates";
import { emailEnv, siteUrl } from "@/lib/env";
import { formatAuMobile } from "@/lib/validation";
import { formatRange } from "@/lib/pricing";

/**
 * Transactional email (SPEC §5).
 *
 * Sending is best-effort and never blocks a booking. A booking that is saved
 * but unemailed is a phone call; a booking rejected because Resend was down is
 * a lost job. Every failure here is swallowed and reported back so the caller
 * can decide what to tell the customer.
 */

export type BookingEmailData = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  suburbName: string;
  serviceSlugs: string[];
  serviceOptions?: Record<string, { band: string }>;
  date: string;
  slot: Slot;
  estLow: number;
  estHigh: number;
  bundleDiscount: boolean;
  notes?: string;
};

function serviceLines(data: BookingEmailData): string[] {
  return data.serviceSlugs.map((slug) => {
    const service = getService(slug);
    const band = data.serviceOptions?.[slug]?.band;
    const name = service?.name ?? slug;
    if (!band || !service || service.pricing.kind !== "banded") return name;
    const label = service.pricing.bands.find((b) => b.id === band)?.label;
    return label ? `${name} (${label})` : name;
  });
}

/** Plain text only. It renders everywhere and never lands in a promotions tab. */
function customerBody(data: BookingEmailData): string {
  const lines = [
    `Thanks ${data.name.split(" ")[0]}, your clean is booked in.`,
    "",
    `  What:  ${serviceLines(data).join(", ")}`,
    `  When:  ${formatLongDate(data.date)}, ${SLOT_LABELS[data.slot].toLowerCase()}`,
    `  Where: ${data.address}, ${data.suburbName}`,
    "",
    `Estimate: ${formatRange(data.estLow, data.estHigh)}${
      data.bundleDiscount
        ? ` (includes your ${BUSINESS.bundleDiscountPct}% multi-service discount)`
        : ""
    }`,
    "",
    BUSINESS.pricingDisclaimer,
    "",
    "What happens next:",
    "  1. We text you to confirm the arrival window.",
    "  2. We turn up and do the work.",
    "  3. You pay on the day, once you have had a look at it.",
    "",
    BUSINESS.trust.guarantee,
    "",
    `Need to change anything? Just reply, or call ${BUSINESS.phone.display}.`,
    "",
    `${BUSINESS.name} — ABN ${BUSINESS.abn}`,
    siteUrlSafe(),
  ];
  return lines.join("\n");
}

/** The owner is on a driveway. Everything they need to act, in the first line. */
function ownerBody(data: BookingEmailData): string {
  return [
    `NEW BOOKING — ${data.suburbName}`,
    "",
    `  ${data.name}   ${formatAuMobile(data.phone)}`,
    `  ${data.address}, ${data.suburbName}`,
    `  ${formatLongDate(data.date)} ${SLOT_LABELS[data.slot].toLowerCase()}`,
    "",
    `  ${serviceLines(data).join("\n  ")}`,
    "",
    `  Quoted ${formatRange(data.estLow, data.estHigh)}${data.bundleDiscount ? " (bundle)" : ""}`,
    data.email ? `  Email: ${data.email}` : "",
    data.notes ? `  Notes: ${data.notes}` : "",
    "",
    `Call them: tel:${data.phone}`,
    `Booking id: ${data.id}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function siteUrlSafe(): string {
  try {
    return siteUrl();
  } catch {
    return `https://${BUSINESS.domain}`;
  }
}

export type EmailResult = { customer: boolean; owner: boolean };

export async function sendBookingEmails(
  data: BookingEmailData,
): Promise<EmailResult> {
  const result: EmailResult = { customer: false, owner: false };

  let resend: Resend;
  let adminEmail: string;
  try {
    const env = emailEnv();
    resend = new Resend(env.RESEND_API_KEY);
    adminEmail = env.ADMIN_EMAIL;
  } catch {
    // Resend not configured yet. The booking is already saved.
    return result;
  }

  const from = `${BUSINESS.name} <${BUSINESS.email}>`;

  if (data.email) {
    try {
      await resend.emails.send({
        from,
        to: data.email,
        subject: `Booked in — ${formatLongDate(data.date)}`,
        text: customerBody(data),
      });
      result.customer = true;
    } catch {
      /* best effort */
    }
  }

  try {
    await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: data.email,
      subject: `New booking — ${data.suburbName}, ${formatLongDate(data.date)}`,
      text: ownerBody(data),
    });
    result.owner = true;
  } catch {
    /* best effort */
  }

  return result;
}
