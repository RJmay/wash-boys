import { NextResponse } from "next/server";

import { logEvent } from "@/lib/actions/events";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  normaliseCode,
  UNKNOWN_CODE,
} from "@/lib/attribution";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * QR redirect and scan logging (SPEC §7).
 *
 * Every printed QR points here rather than at a destination, which is the
 * whole reason destinations stay changeable after 5,500 flyers are in
 * letterboxes: BUD1 can be re-aimed at the gutter page in September without
 * reprinting anything.
 *
 * The hard rule is that this route never fails. Somebody is standing at a
 * letterbox holding a piece of card. An unknown code, a database outage, a
 * malformed path - all of it redirects to the landing page and logs what it
 * can. A 404 here is a wasted flyer and a lost customer.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  // Typed inline rather than with the generated RouteContext helper, so
  // typecheck does not depend on a build having run first.
  ctx: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code: rawCode } = await ctx.params;
  const code = normaliseCode(rawCode);

  let destination = "/";
  let campaign = "unknown";
  let known = false;

  if (code) {
    try {
      const { data } = await createAdminSupabase()
        .from("qr_codes")
        .select("code, destination, campaign")
        .eq("code", code)
        .maybeSingle();

      if (data) {
        destination = data.destination || "/";
        campaign = data.campaign;
        known = true;
      }
    } catch {
      // Not configured, or a transient failure. Still redirect - the scan is
      // worth more than the attribution.
    }
  }

  const target = new URL(destination, request.url);
  target.searchParams.set("c", known && code ? code : UNKNOWN_CODE);
  target.searchParams.set("utm_source", "flyer");
  target.searchParams.set("utm_medium", "qr");
  target.searchParams.set("utm_campaign", campaign);

  const response = NextResponse.redirect(target, 302);

  /*
    First-party attribution cookie. Set even for an unrecognised code so a
    booking that follows can still be traced back to "a flyer, batch unknown"
    rather than looking like organic traffic.
  */
  response.cookies.set({
    name: ATTRIBUTION_COOKIE,
    value: known && code ? code : UNKNOWN_CODE,
    maxAge: ATTRIBUTION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false, // the client reads it to attribute form submissions
    secure: process.env.NODE_ENV === "production",
  });

  // Only known codes carry a code on the event; the FK would reject the rest,
  // and the database trigger would null it anyway.
  await logEvent({
    type: "scan",
    code: known && code ? code : undefined,
    meta: {
      raw: rawCode,
      known,
      campaign,
      ua: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
  });

  return response;
}
