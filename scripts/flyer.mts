/**
 * Renders flyer/dl-flyer.html to print-ready PDF (and a PNG proof) per batch
 * code — SPEC §11, KICKOFF session 7.
 *
 *   npm run flyer                      # every code in BATCHES
 *   npm run flyer -- --code PW1        # just one
 *   npm run flyer -- --png             # also write PNG proofs
 *   npm run flyer -- --guides          # draw trim/safe guides (proofing only)
 *
 * Prices and business facts are injected from src/data, so the printed flyer
 * cannot drift from the site. Batch code, suburb and the QR image come in as
 * query params.
 *
 * Uses the Chrome already installed on this machine rather than downloading a
 * browser. If Chrome is missing, pass --channel msedge.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser } from "playwright-core";

import { BUSINESS } from "../src/data/business";
import { BOOKABLE_SERVICES, isBanded, serviceFromPrice } from "../src/data/services";
import { formatPrice } from "../src/lib/pricing";

/** Wave 1 batches, one QR code per suburb drop (FLYER_BRIEF). */
const BATCHES: { code: string; suburb: string }[] = [
  { code: "PW1", suburb: "Pelican Waters" },
  { code: "MIN1", suburb: "Minyama" },
  { code: "BUD1", suburb: "Buderim" },
  { code: "ARO1", suburb: "Aroona" },
  { code: "CUR1", suburb: "Currimundi" },
  { code: "AURA1", suburb: "Baringa" },
];

const ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE = path.join(ROOT, "flyer", "dl-flyer.html");
const OUT_DIR = path.join(ROOT, "flyer", "out");
const QR_DIR = path.join(ROOT, "flyer", "qr");

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

function templateUrl(
  code: string,
  suburb: string,
  opts: { guides: boolean; seasonal: boolean },
) {
  const config = Buffer.from(JSON.stringify(buildConfig())).toString("base64");
  const url = pathToFileURL(TEMPLATE);
  url.searchParams.set("code", code);
  url.searchParams.set("suburb", suburb);
  url.searchParams.set("config", config);
  if (opts.seasonal) url.searchParams.set("seasonal", "1");
  if (opts.guides) url.searchParams.set("guides", "1");

  // Session 4 writes these. Until then the template prints its QR placeholder.
  const qr = path.join(QR_DIR, `${code}.svg`);
  if (existsSync(qr)) url.searchParams.set("qr", pathToFileURL(qr).href);

  return url.href;
}

async function render(
  browser: Browser,
  code: string,
  suburb: string,
  opts: { guides: boolean; seasonal: boolean; png: boolean },
) {
  const page = await browser.newPage();
  await page.goto(templateUrl(code, suburb, opts), { waitUntil: "networkidle" });

  const pdfPath = path.join(OUT_DIR, `wash-boys-DL-${code}.pdf`);
  await page.pdf({
    path: pdfPath,
    // Artwork board: 99x210 trim + 3mm bleed all round.
    width: "105mm",
    height: "216mm",
    printBackground: true,
    preferCSSPageSize: true,
  });

  if (opts.png) {
    for (const side of ["front", "back"] as const) {
      await page
        .locator(`#${side}`)
        .screenshot({
          path: path.join(OUT_DIR, `wash-boys-DL-${code}-${side}.png`),
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

  const only = value("code")?.toUpperCase();
  const batches = only
    ? BATCHES.filter((b) => b.code === only) ?? []
    : BATCHES;

  if (batches.length === 0) {
    console.error(
      `No batch called ${only}. Known: ${BATCHES.map((b) => b.code).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: value("channel") ?? "chrome",
  });

  const opts = {
    guides: flag("guides"),
    seasonal: !flag("no-seasonal"),
    png: flag("png"),
  };

  try {
    for (const batch of batches) {
      const out = await render(browser, batch.code, batch.suburb, opts);
      console.log(`  ${batch.code.padEnd(6)} ${batch.suburb.padEnd(16)} ${out}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${batches.length} flyer(s) written to flyer/out/`);
  if (!existsSync(path.join(QR_DIR, `${batches[0].code}.svg`))) {
    console.log(
      "NOTE: no QR images in flyer/qr yet, so the QR placeholder was printed.\n" +
        "      Generate them in session 4 (npm run qr) before sending to print.",
    );
  }
}

await main();
