/**
 * Generates print-ready QR assets per flyer batch code — SPEC §7.
 *
 *   npm run qr                          # every code in BATCHES
 *   npm run qr -- --code PW1
 *   npm run qr -- --base-url https://washboys.com.au
 *   npm run qr -- --verify              # check what is on disk, write nothing
 *
 * Run --verify before anything goes to a printer. It exits non-zero on a
 * mismatch, so it can gate a print step rather than just inform one.
 *
 * Print rules this enforces, all from SPEC §7 and FLYER_BRIEF:
 *  - the QR encodes a /go/CODE redirect, never a raw destination URL, so the
 *    destination stays re-pointable after 6,000 flyers are printed;
 *  - error correction level H, so a scuffed or rain-marked flyer still scans;
 *  - a full quiet zone (4 modules), because a QR bled to the edge of a panel
 *    will not scan reliably;
 *  - dark modules on a light ground only — never inverted;
 *  - sized for 28mm at 300dpi (331px) as the printed minimum.
 *
 * It refuses to write assets while the domain is still a placeholder. A QR
 * pointing at "https://[DOMAIN]/go/PW1" is 1,000 pieces of dead card.
 *
 * Codes are also registered in the `qr_codes` table when Supabase is
 * configured, which is what /go/[code] reads to resolve a scan. An unregistered
 * code still redirects - a scan is worth more than its attribution - but the
 * batch gets no credit and the per-code funnel is blind.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import {
  CAMPAIGN_WAVE_1,
  FLYER_BATCHES,
  getBatch,
} from "../src/data/batches";
import { BUSINESS, isPlaceholder } from "../src/data/business";

const ROOT = path.resolve(import.meta.dirname, "..");
const QR_DIR = path.join(ROOT, "flyer", "qr");

/** 28mm at 300dpi, the printed minimum from FLYER_BRIEF. */
const PRINT_PX = Math.round((28 / 25.4) * 300);

const OPTIONS = {
  errorCorrectionLevel: "H",
  margin: 4, // full quiet zone
  color: { dark: "#1B2328", light: "#FFFFFF" },
} as const;

export function scanUrl(code: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/go/${code.toUpperCase()}`;
}

export function resolveBaseUrl(explicit?: string): {
  baseUrl: string;
  placeholder: boolean;
} {
  if (explicit) return { baseUrl: explicit, placeholder: false };
  const domain = BUSINESS.domain;
  if (isPlaceholder(domain)) {
    return { baseUrl: `https://${domain}`, placeholder: true };
  }
  return { baseUrl: `https://${domain}`, placeholder: false };
}

export async function writeQr(code: string, baseUrl: string) {
  mkdirSync(QR_DIR, { recursive: true });
  const url = scanUrl(code, baseUrl);

  const svg = await QRCode.toString(url, { ...OPTIONS, type: "svg" });
  writeFileSync(path.join(QR_DIR, `${code}.svg`), svg, "utf8");

  await QRCode.toFile(path.join(QR_DIR, `${code}.png`), url, {
    ...OPTIONS,
    type: "png",
    width: PRINT_PX,
  });

  return { url, svg: `${code}.svg`, png: `${code}.png` };
}

/**
 * Registers each batch in `qr_codes` (SPEC §7).
 *
 * A printed QR that is not in this table redirects to the landing page with
 * no attribution - the scan still works, but the batch that paid for it gets
 * no credit and the per-code funnel is blind. Upsert, so re-running after
 * re-pointing a destination in admin does not clobber it.
 *
 * Skipped silently when Supabase is not configured: image generation is the
 * job, registration is the follow-up.
 */
async function registerCodes(
  batches: { code: string; suburb: string }[],
): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return "not registered — Supabase not configured (set it up, then re-run)";
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = batches.map((batch) => {
    const planned = getBatch(batch.code);
    return {
      code: batch.code,
      campaign: planned?.campaign ?? CAMPAIGN_WAVE_1,
      suburb: batch.suburb || null,
      destination: "/",
    };
  });

  const { error } = await supabase
    .from("qr_codes")
    .upsert(rows, { onConflict: "code", ignoreDuplicates: false });

  return error
    ? `registration FAILED: ${error.message}`
    : `${rows.length} code(s) registered in qr_codes`;
}

/**
 * Re-derives every asset and checks it byte for byte against the file on disk
 * — npm run qr -- --verify
 *
 * The manifest records what each code was generated against, but nothing
 * proved the PNG next to it still matches: a QR looks identical whatever URL
 * is inside it, and a hand-edited manifest or a half-finished regeneration
 * leaves no visible trace. Re-encoding is the only check that reads the actual
 * artwork. Run it before sending anything to a printer - it is the last point
 * where a wrong URL costs nothing.
 */
async function verifyAssets(baseUrl: string): Promise<boolean> {
  const manifestPath = path.join(QR_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("No flyer/qr/manifest.json — run `npm run qr` first.");
    return false;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    baseUrl: string;
    codes: Record<string, string>;
  };

  let ok = true;

  if (manifest.baseUrl !== baseUrl) {
    console.error(
      `  manifest was generated against ${manifest.baseUrl}, but the domain is now ${baseUrl}`,
    );
    ok = false;
  }

  for (const [code, recordedUrl] of Object.entries(manifest.codes)) {
    const expectedUrl = scanUrl(code, baseUrl);
    const pngPath = path.join(QR_DIR, `${code}.png`);
    const svgPath = path.join(QR_DIR, `${code}.svg`);

    if (!existsSync(pngPath) || !existsSync(svgPath)) {
      console.error(`  ${code.padEnd(6)} MISSING asset`);
      ok = false;
      continue;
    }

    const expectedPng = await QRCode.toBuffer(expectedUrl, {
      ...OPTIONS,
      type: "png",
      width: PRINT_PX,
    });
    const expectedSvg = await QRCode.toString(expectedUrl, { ...OPTIONS, type: "svg" });

    const pngMatch = Buffer.compare(expectedPng, readFileSync(pngPath)) === 0;
    const svgMatch = expectedSvg === readFileSync(svgPath, "utf8");
    const urlMatch = recordedUrl === expectedUrl;

    if (pngMatch && svgMatch && urlMatch) {
      console.log(`  ${code.padEnd(6)} ok       ${expectedUrl}`);
      continue;
    }

    ok = false;
    const wrong = [
      urlMatch ? null : `manifest says ${recordedUrl}`,
      pngMatch ? null : "PNG does not match",
      svgMatch ? null : "SVG does not match",
    ]
      .filter(Boolean)
      .join(", ");
    console.error(`  ${code.padEnd(6)} MISMATCH ${expectedUrl} — ${wrong}`);
  }

  return ok;
}

async function main() {
  const argv = process.argv.slice(2);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const { baseUrl, placeholder } = resolveBaseUrl(value("base-url"));

  if (argv.includes("--verify")) {
    if (placeholder) {
      console.error("Domain is still a placeholder — nothing here is printable.");
      process.exitCode = 1;
      return;
    }
    console.log(`Verifying flyer/qr against ${baseUrl}\n`);
    const ok = await verifyAssets(baseUrl);
    console.log(
      ok
        ? "\nEvery asset encodes the URL it claims. Safe to print."
        : "\nDO NOT PRINT. Re-run `npm run qr` to regenerate.",
    );
    process.exitCode = ok ? 0 : 1;
    return;
  }

  const only = value("code")?.toUpperCase();
  const batches: { code: string; suburb: string }[] = only
    ? FLYER_BATCHES.filter((b) => b.code === only).map((b) => ({ code: b.code, suburb: b.suburb }))
    : FLYER_BATCHES.map((b) => ({ code: b.code, suburb: b.suburb }));

  if (only && batches.length === 0) {
    // Still allow one-off codes that are not in the wave-1 plan.
    batches.push({ code: only, suburb: "" });
  }

  if (placeholder) {
    console.error(
      [
        "",
        "REFUSING TO GENERATE — the domain is still a placeholder.",
        "",
        `  Every QR would encode ${scanUrl("PW1", baseUrl)}`,
        "  which scans to nothing. Printing that wastes the whole run.",
        "",
        "  Fix one of these, then run again:",
        "    - set `domain` in src/data/business.ts once the domain is bought, or",
        "    - pass --base-url https://your-domain.com.au explicitly.",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Base URL: ${baseUrl}\n`);
  const written: Record<string, string> = {};
  for (const batch of batches) {
    const out = await writeQr(batch.code, baseUrl);
    written[batch.code] = out.url;
    console.log(
      `  ${batch.code.padEnd(6)} ${out.url.padEnd(44)} ${out.svg}, ${out.png}`,
    );
  }

  /*
    Record what these encode. A QR image looks identical whatever URL is inside
    it, so without this a set generated against an old or test domain could sit
    in flyer/qr and be printed months later. The flyer preflight compares this
    against the current domain and refuses to print on a mismatch.
  */
  writeFileSync(
    path.join(QR_DIR, "manifest.json"),
    `${JSON.stringify({ baseUrl, codes: written }, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `\n${batches.length} QR code(s) in flyer/qr/ — ${PRINT_PX}px PNG (28mm @ 300dpi), level H, full quiet zone.`,
  );
  console.log(await registerCodes(batches));
}

await main();
