/**
 * Generates the flyer QR — npm run qr
 *
 *   npm run qr                                  # write the QR
 *   npm run qr -- --verify                      # check what is on disk
 *   npm run qr -- --base-url https://example.au # override the destination
 *
 * One QR, encoding the website address. Every flyer carries the same one.
 *
 * Print rules this enforces, from SPEC §7 and FLYER_BRIEF:
 *  - error correction level H, so a scuffed or rain-marked flyer still scans;
 *  - a full quiet zone (4 modules), because a QR bled to the edge of a panel
 *    will not scan reliably;
 *  - dark modules on a light ground only — never inverted;
 *  - sized for 28mm at 300dpi (331px) as the printed minimum.
 *
 * It refuses to write while the domain is still a placeholder. A QR pointing at
 * "https://[DOMAIN]" is 5,500 pieces of dead card.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import { BUSINESS, isPlaceholder } from "../src/data/business";

const ROOT = path.resolve(import.meta.dirname, "..");
const QR_DIR = path.join(ROOT, "flyer", "qr");

/** The one QR. Named for what it is, not for a batch. */
export const QR_NAME = "site";

/** 28mm at 300dpi, the printed minimum from FLYER_BRIEF. */
const PRINT_PX = Math.round((28 / 25.4) * 300);

const OPTIONS = {
  errorCorrectionLevel: "H",
  margin: 4, // full quiet zone
  color: { dark: "#1B2328", light: "#FFFFFF" },
} as const;

export function resolveBaseUrl(explicit?: string): {
  baseUrl: string;
  placeholder: boolean;
} {
  if (explicit) return { baseUrl: explicit.replace(/\/$/, ""), placeholder: false };
  const domain = BUSINESS.domain;
  return { baseUrl: `https://${domain}`, placeholder: isPlaceholder(domain) };
}

async function write(baseUrl: string) {
  mkdirSync(QR_DIR, { recursive: true });

  const svg = await QRCode.toString(baseUrl, { ...OPTIONS, type: "svg" });
  writeFileSync(path.join(QR_DIR, `${QR_NAME}.svg`), svg, "utf8");

  await QRCode.toFile(path.join(QR_DIR, `${QR_NAME}.png`), baseUrl, {
    ...OPTIONS,
    type: "png",
    width: PRINT_PX,
  });

  /*
    Record what it encodes. A QR image looks identical whatever URL is inside
    it, so without this one generated against an old or test domain could sit
    in flyer/qr and be printed months later. The flyer preflight compares this
    against the current domain and refuses to print on a mismatch.
  */
  writeFileSync(
    path.join(QR_DIR, "manifest.json"),
    `${JSON.stringify({ baseUrl, file: `${QR_NAME}.svg` }, null, 2)}\n`,
    "utf8",
  );
}

/**
 * Re-derives the QR and checks it byte for byte against the file on disk.
 *
 * Run before anything goes to a printer. Re-encoding is the only check that
 * reads the actual artwork rather than trusting the note beside it, and it
 * exits non-zero, so it can gate a print step rather than just inform one.
 */
async function verify(baseUrl: string): Promise<boolean> {
  const manifestPath = path.join(QR_DIR, "manifest.json");
  const pngPath = path.join(QR_DIR, `${QR_NAME}.png`);
  const svgPath = path.join(QR_DIR, `${QR_NAME}.svg`);

  if (!existsSync(manifestPath) || !existsSync(pngPath) || !existsSync(svgPath)) {
    console.error("  QR assets are missing — run `npm run qr` first.");
    return false;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    baseUrl?: string;
  };

  let ok = true;
  if (manifest.baseUrl !== baseUrl) {
    console.error(
      `  manifest records ${manifest.baseUrl}, but the domain is now ${baseUrl}`,
    );
    ok = false;
  }

  const expectedPng = await QRCode.toBuffer(baseUrl, {
    ...OPTIONS,
    type: "png",
    width: PRINT_PX,
  });
  const expectedSvg = await QRCode.toString(baseUrl, { ...OPTIONS, type: "svg" });

  if (Buffer.compare(expectedPng, readFileSync(pngPath)) !== 0) {
    console.error("  PNG does not encode that address");
    ok = false;
  }
  if (expectedSvg !== readFileSync(svgPath, "utf8")) {
    console.error("  SVG does not encode that address");
    ok = false;
  }

  if (ok) console.log(`  ok   ${baseUrl}`);
  return ok;
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--base-url");
  const { baseUrl, placeholder } = resolveBaseUrl(i >= 0 ? argv[i + 1] : undefined);

  if (placeholder) {
    console.error(
      [
        "",
        "REFUSING TO GENERATE — the domain is still a placeholder.",
        "",
        `  The QR would encode ${baseUrl}, which scans to nothing.`,
        "",
        "  Set `domain` in src/data/business.ts, or pass --base-url.",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (argv.includes("--verify")) {
    console.log(`Verifying flyer/qr against ${baseUrl}\n`);
    const ok = await verify(baseUrl);
    console.log(ok ? "\nSafe to print." : "\nDO NOT PRINT. Re-run `npm run qr`.");
    process.exitCode = ok ? 0 : 1;
    return;
  }

  await write(baseUrl);
  console.log(
    `\nflyer/qr/${QR_NAME}.svg and .png — encodes ${baseUrl}` +
      `\n${PRINT_PX}px PNG (28mm @ 300dpi), level H, full quiet zone.`,
  );
}

await main();
