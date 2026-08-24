/**
 * Generates placeholder imagery so the site can be judged with its photo slots
 * filled — npm run placeholders
 *
 * These exist to visualise layout, nothing else. Every one is stamped
 * PLACEHOLDER so it cannot be mistaken for a job we did, and the real rule
 * still stands: only real photos of our own work ever ship (CLAUDE.md).
 * Replace them from soft-launch week and set USE_PLACEHOLDER_MEDIA to false.
 *
 * Written as PNG rather than SVG so the real next/image pipeline is exercised
 * and the LCP numbers mean something.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const OUT = path.resolve(import.meta.dirname, "..", "public", "placeholder");

const INK = "#1b2328";
const CONCRETE = "#eef1f1";
const HARBOUR = "#123c52";
const HIVIS = "#ffc900";

type Shot = {
  file: string;
  /** Grimy or clean treatment. */
  state: "before" | "after";
  caption: string;
};

const SHOTS: Shot[] = [
  { file: "driveway-before.png", state: "before", caption: "Driveway" },
  { file: "driveway-after.png", state: "after", caption: "Driveway" },
  { file: "house-before.png", state: "before", caption: "House wall" },
  { file: "house-after.png", state: "after", caption: "House wall" },
  { file: "patio-before.png", state: "before", caption: "Patio" },
  { file: "patio-after.png", state: "after", caption: "Patio" },
];

/**
 * A flat, abstract stand-in: concrete-ish speckle, dirty or clean, with the
 * word PLACEHOLDER set large enough that nobody ships it by accident.
 */
function svg({ state, caption }: Shot): string {
  const dirty = state === "before";
  const base = dirty ? "#5c6357" : CONCRETE;
  const speck = dirty ? "#464d42" : "#dfe5e5";
  const ink = dirty ? "#ffffff" : INK;

  // Deterministic speckle - no Math.random, so re-running gives the same file.
  let dots = "";
  let seed = 7;
  for (let i = 0; i < 900; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const x = (seed / 2147483648) * 1200;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const y = (seed / 2147483648) * 900;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const r = 1 + (seed / 2147483648) * 3.5;
    const o = dirty ? 0.5 : 0.35;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${speck}" opacity="${o}"/>`;
  }

  // Blotches only on the dirty side - suggests mould without depicting a job.
  let blotches = "";
  if (dirty) {
    for (const [cx, cy, rx, ry] of [
      [220, 180, 190, 110],
      [860, 300, 240, 150],
      [520, 700, 300, 130],
      [1050, 760, 170, 100],
    ]) {
      blotches += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#3f4a3a" opacity="0.45"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="${base}"/>
  ${blotches}
  ${dots}
  <g opacity="0.10">
    ${Array.from({ length: 13 }, (_, i) => `<rect x="${i * 100}" y="0" width="2" height="900" fill="${ink}"/>`).join("")}
  </g>
  <rect x="40" y="40" width="1120" height="820" fill="none" stroke="${ink}" stroke-width="4" stroke-dasharray="18 14" opacity="0.5"/>
  <g transform="translate(600 400)" text-anchor="middle" font-family="Arial Black, Impact, sans-serif">
    <text y="0" font-size="112" fill="${ink}" opacity="0.85" letter-spacing="4">PLACEHOLDER</text>
    <text y="80" font-size="46" fill="${ink}" opacity="0.7" letter-spacing="8">${caption.toUpperCase()} · ${state.toUpperCase()}</text>
  </g>
  <g transform="translate(600 620)" text-anchor="middle" font-family="Arial, sans-serif">
    <text font-size="30" fill="${ink}" opacity="0.55">Replace with a real photo of our own work</text>
  </g>
  <rect x="0" y="860" width="1200" height="40" fill="${dirty ? HARBOUR : HIVIS}"/>
  <text x="600" y="888" text-anchor="middle" font-family="Arial, sans-serif" font-size="22"
        fill="${dirty ? "#ffffff" : INK}" letter-spacing="3">NOT A REAL JOB — LAYOUT PLACEHOLDER</text>
</svg>`;
}

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
mkdirSync(OUT, { recursive: true });

for (const shot of SHOTS) {
  await page.setContent(
    `<body style="margin:0">${svg(shot)}</body>`,
    { waitUntil: "load" },
  );
  await page.locator("svg").screenshot({ path: path.join(OUT, shot.file) });
  console.log(`  ${shot.file}`);
}

await browser.close();
console.log(`\n${SHOTS.length} placeholders in public/placeholder/`);
console.log("Set USE_PLACEHOLDER_MEDIA to false in src/data/site.ts to hide them.");
