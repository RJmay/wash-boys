/**
 * Generates print-ready QR assets per flyer batch code — SPEC §7.
 *
 *   npm run qr                          # every code in BATCHES
 *   npm run qr -- --code PW1
 *   npm run qr -- --base-url https://washboys.com.au
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
 * NOTE: this writes images only. Registering each code in the `qr_codes`
 * table, and the /go/[code] route that reads it, are session 4. Codes must
 * exist in that table before the flyers drop or the redirect has nothing to
 * look up.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import { FLYER_BATCHES } from "../src/data/batches";
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

async function main() {
  const argv = process.argv.slice(2);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const { baseUrl, placeholder } = resolveBaseUrl(value("base-url"));
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
  console.log(
    "Register these in the qr_codes table before the flyers drop (session 4).",
  );
}

await main();
