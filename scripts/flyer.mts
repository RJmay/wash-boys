/**
 * Renders flyer/dl-flyer.html to a print-ready PDF — SPEC §11.
 *
 *   npm run flyer                     # print-ready PDF, preflight enforced
 *   npm run flyer -- --proof          # proof, placeholders allowed
 *   npm run flyer -- --crop-marks     # 6mm margin with trim marks
 *   npm run flyer -- --png            # PNG previews alongside
 *   npm run flyer -- --guides         # trim/safe guides (proof mode only)
 *   npm run flyer -- --standalone     # self-contained editable HTML
 *
 * One flyer, printed once, dropped anywhere in the service area. Prices and
 * business facts are injected from src/data, so the printed flyer cannot drift
 * from the site.
 *
 * PREFLIGHT: print mode refuses to write anything while the domain, phone or
 * ABN is a placeholder, or while the QR is missing or encodes a different
 * domain than the one printed beside it. Those are exactly the faults that are
 * invisible on screen and fatal on 5,500 pieces of card. Use --proof to look at
 * the design before those exist.
 *
 * It also measures the rendered page - overflow, QR size, and how close the QR
 * sits to the board edge. .page clips its overflow, so a layout that does not
 * fit is cut off silently rather than breaking visibly; that is how the back
 * page came to be 8mm too tall with its QR hanging over the edge. The checks
 * run under the seasonal setting in force, because the storm-season note is
 * what pushed it over.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser } from "playwright-core";

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

/** One QR for every flyer: it opens the website, nothing batch-specific. */
function qrPath() {
  return path.join(QR_DIR, "site.svg");
}

/**
 * ATO ABN checksum. Subtract 1 from the first digit, apply the weight vector,
 * and a valid ABN sums to a multiple of 89.
 *
 * Worth checking because a transposed digit looks completely normal on a proof
 * and ends up on every flyer and every invoice.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function validAbn(raw: string): boolean {
  const digits = raw.replace(/\s/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const nums = digits.split("").map(Number);
  nums[0] -= 1;
  return nums.reduce((t, n, i) => t + n * ABN_WEIGHTS[i], 0) % 89 === 0;
}

/** Faults that are invisible on screen and fatal once printed. */
function preflight(): string[] {
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
  } else if (!validAbn(BUSINESS.abn)) {
    problems.push(
      `ABN ${BUSINESS.abn} fails its checksum — a transposed digit here is printed on every flyer and every invoice`,
    );
  }

  if (!existsSync(qrPath())) {
    problems.push("no QR image — run `npm run qr` first");
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

function templateUrl(opts: { guides: boolean; seasonal: boolean; cropMarks: boolean }) {
  const config = Buffer.from(JSON.stringify(buildConfig())).toString("base64");
  const url = pathToFileURL(TEMPLATE);
  // No code or suburb: one flyer, the same everywhere. Left unset, the template
  // falls back to its own area line and leaves the batch slot empty.
  url.searchParams.set("config", config);
  if (opts.seasonal) url.searchParams.set("seasonal", "1");
  if (opts.guides) url.searchParams.set("guides", "1");
  if (opts.cropMarks) url.searchParams.set("cropmarks", "1");

  if (existsSync(qrPath())) {
    url.searchParams.set("qr", pathToFileURL(qrPath()).href);
  }

  return url.href;
}

/**
 * Emits a single self-contained HTML file: fonts and QR inlined, values baked
 * in, no server, no build, no query string. Double-click to open, edit in any
 * text editor, Ctrl+P to print.
 *
 * This is the hand-editable copy. It is a snapshot, not the source - the
 * template in flyer/ stays canonical, so anything you want to keep should end
 * up back there.
 */
function buildStandalone(opts: { seasonal: boolean }): string {
  let html = readFileSync(TEMPLATE, "utf8");

  // Inline the webfonts so the file works offline, anywhere.
  const fontsDir = path.join(ROOT, "flyer", "fonts");
  let css = readFileSync(path.join(fontsDir, "fonts.css"), "utf8");
  css = css.replace(/url\(\.\/([^)]+\.woff2)\)/g, (_match, file: string) => {
    const data = readFileSync(path.join(fontsDir, file)).toString("base64");
    return `url(data:font/woff2;base64,${data})`;
  });
  html = html.replace(
    /<link rel="stylesheet" href="\.\/fonts\/fonts\.css" \/>/,
    `<style>\n${css}\n    </style>`,
  );

  // Inline the QR as a data URI, if one has been generated.
  let qrDataUri = "";
  let qrNote =
    `No QR is embedded yet - the yellow frame shows a placeholder box.\n` +
    `        Generate one with \`npm run qr\` once the domain is live, then\n` +
    `        re-run this command. A QR cannot exist before the domain does.`;

  if (existsSync(qrPath())) {
    const svg = readFileSync(qrPath()).toString("base64");
    qrDataUri = `data:image/svg+xml;base64,${svg}`;

    let encodes = `https://${BUSINESS.domain}`;
    const manifestPath = path.join(QR_DIR, "manifest.json");
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
          baseUrl?: string;
        };
        encodes = manifest.baseUrl ?? encodes;
      } catch {
        /* fall back to the domain we are about to print */
      }
    }
    qrNote =
      `The embedded QR encodes:\n          ${encodes}\n` +
      `        CHECK THAT IS THE RIGHT DOMAIN before printing. Editing the\n` +
      `        text under the QR does not change where the QR points.`;
  }

  const preset = {
    qr: qrDataUri,
    seasonal: opts.seasonal ? "1" : "",
    config: buildConfig(),
  };

  const banner = `
    <!--
      ============================================================
      EDITABLE FLYER — Wash Boys DL
      ============================================================

      Self-contained. No internet, no build step. Double-click to open it in
      a browser; edit it in any text editor.

      TO PRINT
        Ctrl+P -> Destination "Save as PDF"
        Paper size: 105 x 216mm    Margins: None
        Tick "Background graphics" or the colour will not print.
        That gives the 99 x 210mm DL trim plus 3mm bleed all round.

      TO CHANGE THE WORDS AND PRICES
        Search this file for  __FLYER__  (near the bottom). Phone,
        domain, ABN and every price live there in plain text.
        Headlines are in the markup below it - search for "Your driveway".

      TO CHANGE THE COLOURS
        The five brand values are at the top of the <style> block: concrete,
        ink, harbour, harbour-deep, hivis. Keep hi-vis yellow on the CTA and
        the QR frame only - it stops reading as "press this" if it is
        everywhere.

      ABOUT THE QR
        ${qrNote}

      KEEP IN MIND
        - Anything important must stay 8mm from the edge of the board, or the
          guillotine can take it. Add ?guides=1 to the URL to see the lines.
        - This file is a SNAPSHOT. The source of truth is
          flyer/dl-flyer.html plus src/data - changes made here are not
          picked up by \`npm run flyer\`, so fold anything you want to keep
          back into those.
      ============================================================
    -->
`;

  html = html.replace(
    /<script>/,
    `<script>\n      globalThis.__FLYER__ = ${JSON.stringify(preset, null, 2).replace(/\n/g, "\n      ")};\n`,
  );

  return html.replace(/<head>/, `<head>${banner}`);
}

/** FLYER_BRIEF: minimum 28x28mm printed, or phones stop scanning it reliably. */
const QR_MIN_MM = 28;
/** 3mm bleed the guillotine removes, plus 5mm of safety. */
const SAFE_MM = 8;

/**
 * Geometry preflight, measured on the rendered page.
 *
 * The other preflight reads src/data and catches wrong values. It cannot see
 * layout, and layout is where the expensive mistakes hide: `.page` clips its
 * overflow, so content that does not fit is silently cut off rather than
 * spilling somewhere visible. That is how the back page came to be 8mm too
 * tall with its QR hanging past the board edge - the artwork looked correct in
 * every preview, and the fault only appears after the guillotine.
 *
 * It runs per batch because suburb names wrap differently, and with whatever
 * seasonal setting is in force - the storm-season note is what pushed the back
 * page over, so checking only the quiet-season layout proves nothing in
 * September.
 */
async function checkGeometry(
  page: Awaited<ReturnType<Browser["newPage"]>>,
): Promise<string[]> {
  return page.evaluate(
    ({ qrMin, safe }) => {
      const ruler = document.createElement("div");
      ruler.style.cssText = "width:100mm;height:1px;position:absolute;top:-9999px";
      document.body.appendChild(ruler);
      const perMm = ruler.offsetWidth / 100;
      ruler.remove();

      /*
        No helper functions in here. This body is serialised and run inside the
        browser, where the helper esbuild emits for a named function expression
        does not exist - it fails with "__name is not defined".
      */
      const problems: string[] = [];
      const pages = [...document.querySelectorAll(".page")];

      for (let index = 0; index < pages.length; index++) {
        const pageEl = pages[index];
        const side = index === 0 ? "front" : "back";
        const box = pageEl.getBoundingClientRect();

        const overflow = (pageEl.scrollHeight - box.height) / perMm;
        if (overflow > 0.5) {
          problems.push(
            `${side} page content is ${overflow.toFixed(1)}mm taller than the board — the bottom is being cut off`,
          );
        }

        for (const qr of pageEl.querySelectorAll(".qr-frame img, .qr-small img")) {
          const r = qr.getBoundingClientRect();
          const width = r.width / perMm;
          if (width + 0.05 < qrMin) {
            problems.push(
              `${side} QR is ${width.toFixed(1)}mm — under the ${qrMin}mm minimum, phones will struggle with it`,
            );
          }
          const closest = Math.min(
            (r.top - box.top) / perMm,
            (box.bottom - r.bottom) / perMm,
            (r.left - box.left) / perMm,
            (box.right - r.right) / perMm,
          );
          if (closest + 0.05 < safe) {
            problems.push(
              `${side} QR sits ${closest.toFixed(1)}mm from the board edge — needs ${safe}mm to clear the trim`,
            );
          }
        }

        const batch = pageEl.querySelector(".batch-code");
        if (batch) {
          const r = batch.getBoundingClientRect();
          const closest = Math.min(
            (box.bottom - r.bottom) / perMm,
            (box.right - r.right) / perMm,
          );
          if (closest + 0.05 < safe) {
            problems.push(
              `${side} batch code sits ${closest.toFixed(1)}mm from the board edge — it would be trimmed off`,
            );
          }
        }
      }

      return problems;
    },
    { qrMin: QR_MIN_MM, safe: SAFE_MM },
  );
}

async function render(
  browser: Browser,
  opts: {
    guides: boolean;
    seasonal: boolean;
    png: boolean;
    cropMarks: boolean;
    proof: boolean;
  },
) {
  const page = await browser.newPage();
  await page.goto(templateUrl(opts), { waitUntil: "networkidle" });
  // Local webfonts still have to finish decoding before the PDF is taken.
  await page.evaluate(() => document.fonts.ready);

  // Measure before writing anything, so a bad layout never reaches flyer/out.
  const geometry = await checkGeometry(page);
  if (geometry.length > 0 && !opts.proof) {
    await page.close();
    throw new Error(
      ["not print ready:", ...geometry.map((p) => `    - ${p}`)].join("\n  "),
    );
  }
  for (const problem of geometry) console.warn(`  ! ${problem}`);

  const pad = opts.cropMarks ? MARK_MARGIN * 2 : 0;
  const suffix = opts.proof ? "-PROOF" : "";
  const pdfPath = path.join(OUT_DIR, `wash-boys-DL${suffix}.pdf`);

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
        path: path.join(OUT_DIR, `wash-boys-DL${suffix}-${side}.png`),
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
  const problems = preflight();

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

  // Hand-editable copy needs no browser at all.
  if (flag("standalone")) {
    const html = buildStandalone(opts);
    const out = path.join(OUT_DIR, "wash-boys-DL-editable.html");
    writeFileSync(out, html, "utf8");
    console.log(
      `  ${path.basename(out)}  ${(html.length / 1024).toFixed(0)} KB` +
        `\n\nSelf-contained — open in a browser and Ctrl+P to print.`,
    );
    return;
  }

  const browser = await chromium.launch({ channel: value("channel") ?? "chrome" });
  let out: string;
  try {
    out = await render(browser, opts);
  } finally {
    await browser.close();
  }

  const size = opts.cropMarks
    ? `${BOARD.w + MARK_MARGIN * 2} x ${BOARD.h + MARK_MARGIN * 2}mm with trim marks`
    : `${BOARD.w} x ${BOARD.h}mm, bleed included, no marks`;

  console.log(`  ${path.basename(out)} — ${size}.`);
  if (!proof) {
    console.log("Print ready. See flyer/README.md for the printer order spec.");
  }
}

await main();
