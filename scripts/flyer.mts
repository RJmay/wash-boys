/**
 * Renders flyer/dl-flyer.html to PDF per batch code — SPEC §11.
 *
 *   npm run flyer                     # print-ready PDFs, preflight enforced
 *   npm run flyer -- --proof          # proofs, placeholders allowed
 *   npm run flyer -- --code PW1
 *   npm run flyer -- --crop-marks     # 6mm margin with trim marks
 *   npm run flyer -- --png            # PNG previews alongside
 *   npm run flyer -- --guides         # trim/safe guides (proof mode only)
 *
 * Prices and business facts are injected from src/data, so the printed flyer
 * cannot drift from the site.
 *
 * PREFLIGHT: print mode refuses to write anything while the domain, phone or
 * ABN is a placeholder, or while a batch has no QR image. Those are exactly
 * the faults that are invisible on screen and fatal on 6,000 pieces of card.
 * Use --proof to look at the design before those exist.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser } from "playwright-core";

import { FLYER_BATCHES } from "../src/data/batches";
import { BUSINESS, isPlaceholder } from "../src/data/business";
import {
  BOOKABLE_SERVICES,
  isBanded,
  serviceFromPrice,
} from "../src/data/services";
import { formatPrice } from "../src/lib/pricing";


const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE = path.join(ROOT, "flyer", "dl-flyer.html");
const OUT_DIR = path.join(ROOT, "flyer", "out");
const QR_DIR = path.join(ROOT, "flyer", "qr");

/** Artwork board: 99x210 trim + 3mm bleed all round. */
const BOARD = { w: 105, h: 216 };
/** Extra room for trim marks when --crop-marks is used. */
const MARK_MARGIN = 6;

function priceRows() {
  return BOOKABLE_SERVICES.map((service) => {
    let note = "";
    if (service.slug === "house-washing") note = "single storey";
    else if (isBanded(service)) {
      note =
        service.pricing.unit === "m2"
          ? "priced on the area"
          : "by the metre, per side";
    }
    return {
      name: service.name,
      note,
      amount: `from ${formatPrice(serviceFromPrice(service))}`,
    };
  });
}

function buildConfig() {
  return {
    domain: BUSINESS.domain,
    phone: BUSINESS.phone.display,
    abn: BUSINESS.abn,
    areaLine: `Local crew, ${BUSINESS.base.city} to Buderim`,
    prices: priceRows(),
  };
}

function qrPath(code: string) {
  return path.join(QR_DIR, `${code}.svg`);
}

/** Faults that are invisible on screen and fatal once printed. */
function preflight(codes: string[]): string[] {
  const problems: string[] = [];

  if (isPlaceholder(BUSINESS.domain)) {
    problems.push(
      `domain is still ${BUSINESS.domain} — the flyer would print a dead web address`,
    );
  }
  if (isPlaceholder(BUSINESS.phone.tel)) {
    problems.push(
      `phone is still ${BUSINESS.phone.display} — the flyer would print a dead number`,
    );
  }
  if (isPlaceholder(BUSINESS.abn)) {
    problems.push(`ABN is still ${BUSINESS.abn} — the trust bar claims an ABN`);
  }

  const missingQr = codes.filter((code) => !existsSync(qrPath(code)));
  if (missingQr.length > 0) {
    problems.push(
      `no QR image for ${missingQr.join(", ")} — run \`npm run qr\` first`,
    );
  }

  /*
    A QR image looks the same whatever URL is inside it, so a set generated
    against an old or test domain would print silently. Compare what they
    actually encode against the domain we are about to print beside them.
  */
  const manifestPath = path.join(QR_DIR, "manifest.json");
  if (existsSync(manifestPath) && !isPlaceholder(BUSINESS.domain)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        baseUrl?: string;
      };
      const expected = `https://${BUSINESS.domain}`;
      if (manifest.baseUrl && manifest.baseUrl !== expected) {
        problems.push(
          `QR codes encode ${manifest.baseUrl} but the flyer prints ${BUSINESS.domain} — regenerate with \`npm run qr\``,
        );
      }
    } catch {
      problems.push("flyer/qr/manifest.json is unreadable — regenerate with `npm run qr`");
    }
  }

  return problems;
}

function templateUrl(
  code: string,
  suburb: string,
  opts: { guides: boolean; seasonal: boolean; cropMarks: boolean },
) {
  const config = Buffer.from(JSON.stringify(buildConfig())).toString("base64");
  const url = pathToFileURL(TEMPLATE);
  url.searchParams.set("code", code);
  url.searchParams.set("suburb", suburb);
  url.searchParams.set("config", config);
  if (opts.seasonal) url.searchParams.set("seasonal", "1");
  if (opts.guides) url.searchParams.set("guides", "1");
  if (opts.cropMarks) url.searchParams.set("cropmarks", "1");

  if (existsSync(qrPath(code))) {
    url.searchParams.set("qr", pathToFileURL(qrPath(code)).href);
  }

  return url.href;
}

async function render(
  browser: Browser,
  code: string,
  suburb: string,
  opts: {
    guides: boolean;
    seasonal: boolean;
    png: boolean;
    cropMarks: boolean;
    proof: boolean;
  },
) {
  const page = await browser.newPage();
  await page.goto(templateUrl(code, suburb, opts), {
    waitUntil: "networkidle",
  });
  // Local webfonts still have to finish decoding before the PDF is taken.
  await page.evaluate(() => document.fonts.ready);

  const pad = opts.cropMarks ? MARK_MARGIN * 2 : 0;
  const suffix = opts.proof ? "-PROOF" : "";
  const pdfPath = path.join(OUT_DIR, `wash-boys-DL-${code}${suffix}.pdf`);

  await page.pdf({
    path: pdfPath,
    width: `${BOARD.w + pad}mm`,
    height: `${BOARD.h + pad}mm`,
    printBackground: true,
    preferCSSPageSize: false,
  });

  if (opts.png) {
    for (const side of ["front", "back"] as const) {
      await page.locator(`#${side}`).screenshot({
        path: path.join(OUT_DIR, `wash-boys-DL-${code}${suffix}-${side}.png`),
        scale: "device",
      });
    }
  }

  await page.close();
  return pdfPath;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const value = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const proof = flag("proof");
  const only = value("code")?.toUpperCase();
  const batches = only
    ? FLYER_BATCHES.filter((b) => b.code === only)
    : FLYER_BATCHES;

  if (batches.length === 0) {
    console.error(
      `No batch called ${only}. Known: ${FLYER_BATCHES.map((b) => b.code).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  const problems = preflight(batches.map((b) => b.code));

  if (problems.length > 0 && !proof) {
    console.error(
      [
        "",
        "NOT PRINT READY — refusing to write artwork.",
        "",
        ...problems.map((p) => `  - ${p}`),
        "",
        "  Fix these, or run `npm run flyer -- --proof` to look at the design",
        "  with placeholders in place. Proof files are named -PROOF so they",
        "  cannot be sent to a printer by mistake.",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const opts = {
    guides: flag("guides"),
    seasonal: !flag("no-seasonal"),
    png: flag("png"),
    cropMarks: flag("crop-marks"),
    proof,
  };

  if (proof && problems.length > 0) {
    console.log("PROOF ONLY — not print ready:");
    for (const p of problems) console.log(`  - ${p}`);
    console.log("");
  }

  const browser = await chromium.launch({ channel: value("channel") ?? "chrome" });

  try {
    for (const batch of batches) {
      const out = await render(browser, batch.code, batch.suburb, opts);
      console.log(
        `  ${batch.code.padEnd(6)} ${batch.suburb.padEnd(16)} ${path.basename(out)}`,
      );
    }
  } finally {
    await browser.close();
  }

  const size = opts.cropMarks
    ? `${BOARD.w + MARK_MARGIN * 2} x ${BOARD.h + MARK_MARGIN * 2}mm with trim marks`
    : `${BOARD.w} x ${BOARD.h}mm, bleed included, no marks`;

  console.log(`\n${batches.length} file(s) in flyer/out/ — ${size}.`);
  if (!proof) {
    console.log("Print ready. See flyer/README.md for the printer order spec.");
  }
}

await main();
