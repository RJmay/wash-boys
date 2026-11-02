import "server-only";

import { Resend } from "resend";

import { BUSINESS, isPlaceholder } from "@/data/business";
import { formatPrice, type PriceLine } from "@/data/pricing";
import { formatLongDate } from "@/lib/dates";
import { emailEnv, siteUrl } from "@/lib/env";
import { formatAuMobile } from "@/lib/validation";

/**
 * Transactional email.
 *
 * Sending is best-effort and never blocks a booking. A booking that is saved
 * but unemailed is a phone call; a booking rejected because Resend was down is
 * a lost job. Every failure here is swallowed and reported back so the caller
 * can decide what to tell the customer.
 */

export type BookingEmailData = {
  reference: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  suburbName: string;
  summary: string;
  lines: PriceLine[];
  total: number;
  isFrom: boolean;
  deposit: number;
  confirmByPhone: string[];
  storeys: "single" | "double";
  roofType?: string;
  date: string;
  notes?: string;
  source?: string;
  page?: string;
  photoCount: number;
};

function totalLabel(data: BookingEmailData): string {
  return `${data.isFrom ? "from " : ""}${formatPrice(data.total)}`;
}

/** Bank details, or a plain note while they are still placeholders. */
export function bankLines(reference: string, deposit: number): string[] {
  const { accountName, bsb, accountNumber } = BUSINESS.bank;
  if ([accountName, bsb, accountNumber].some(isPlaceholder)) {
    return [
      `Deposit: ${formatPrice(deposit)}. We'll text you the bank details to pay it.`,
      `Reference: ${reference}`,
    ];
  }
  return [
    `Deposit: ${formatPrice(deposit)} by bank transfer`,
    `  Account name: ${accountName}`,
    `  BSB:          ${bsb}`,
    `  Account:      ${accountNumber}`,
    `  Reference:    ${reference}`,
  ];
}

/** Plain text only. It renders everywhere and never lands in a promotions tab. */
function customerBody(data: BookingEmailData): string {
  return [
    `Thanks ${data.name.split(" ")[0]}, you're booked for ${formatLongDate(data.date)}.`,
    "",
    `  What:  ${data.summary}`,
    `  Where: ${data.address}, ${data.suburbName}`,
    `  Price: ${totalLabel(data)} (GST incl.)`,
    ...data.lines.map((l) => `         ${l.label}: ${formatPrice(l.amount)}`),
    ...(data.confirmByPhone.length
      ? ["", ...data.confirmByPhone.map((l) => `  ${l}`)]
      : []),
    "",
    ...bankLines(data.reference, data.deposit),
    "",
    "Please put the reference on the transfer so we can match it to your booking.",
    "",
    "What happens next:",
    "  1. We call if we need to check size, storeys or access.",
    "  2. We'll text you the day before.",
    "  3. On the day, leave a gate open and a tap we can use. You don't need to be home.",
    "  4. Before-and-after photos by text, and the balance invoiced.",
    "",
    `Need to change anything? Just reply, or call ${BUSINESS.phone.display}.`,
    "",
    `${BUSINESS.name} · ABN ${BUSINESS.abn} · ${BUSINESS.gstNote}`,
    siteUrlSafe(),
  ].join("\n");
}

/** The owner is on a ladder. Everything they need to act, in the first lines. */
function ownerBody(data: BookingEmailData): string {
  return [
    `NEW BOOKING ${data.reference} — ${data.suburbName}, ${formatLongDate(data.date)}`,
    "",
    `  ${data.name}   ${formatAuMobile(data.phone)}   ${data.email}`,
    `  ${data.address}, ${data.suburbName}`,
    `  ${data.storeys === "double" ? "DOUBLE storey" : "Single storey"}${data.roofType ? `, roof: ${data.roofType}` : ""}`,
    "",
    `  ${data.summary}`,
    ...data.lines.map((l) => `    ${l.label}: ${formatPrice(l.amount)}`),
    `  Total ${totalLabel(data)}   Deposit ${formatPrice(data.deposit)} (pending)`,
    ...data.confirmByPhone.map((l) => `  CHECK: ${l}`),
    data.notes ? `  Notes: ${data.notes}` : "",
    data.photoCount ? `  Photos: ${data.photoCount} in job-photos/bookings/${data.reference}/` : "",
    `  Source: ${data.source ?? "none"}   Page: ${data.page ?? "-"}`,
    "",
    `Call them: tel:${data.phone}`,
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

  try {
    const { error } = await resend.emails.send({
      from,
      to: data.email,
      subject: `You're booked for ${formatLongDate(data.date)} — ref ${data.reference}`,
      text: customerBody(data),
    });
    result.customer = !error;
  } catch {
    /* best effort */
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: adminEmail,
      replyTo: data.email,
      subject: `New booking ${data.reference} — ${data.suburbName}, ${formatLongDate(data.date)}`,
      text: ownerBody(data),
    });
    result.owner = !error;
  } catch {
    /* best effort */
  }

  return result;
}
