/**
 * Measures how far each BEFORE shot sits from its AFTER — npm run align
 *
 * A wipe slider only reads as one scene if the two frames line up. Shot a few
 * minutes apart, handheld, they rarely do: a step back, a slight tilt, and the
 * window jumps as you drag. This prints the transform that puts BEFORE on top
 * of AFTER; paste anything significant into `ALIGN` in photos.mts and re-run
 * `npm run photos` to bake the correction into the crop.
 *
 * It matches gradient structure — window frames, fence palings, rooflines —
 * not raw pixels. The surfaces we clean change brightness completely, so a
 * pixel match would try to align the dirt with the clean concrete.
 *
 * Re-run this whenever the source photos change. A stale offset is worse than
 * no offset: it crops a new pair against an old shoot and still says
 * "(aligned)".
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "photos-src");

/** Working width. Big enough to hold the structure, small enough to search. */
const W = 360;
/** Frame width the reported pixel figures are scaled to, for a sense of size. */
const FULL = 1448;
/** Below this the correction costs more resolution than the jump is worth. */
const WORTH_FIXING_PX = 8;

type Grad = { w: number; h: number; g: number[] };

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

async function gradient(file: string): Promise<Grad> {
  // A file origin keeps the canvas untainted, same as photos.mts.
  await page.goto(pathToFileURL(path.join(SRC, file)).href, { waitUntil: "load" });
  return page.evaluate(async (w) => {
    const img = document.querySelector("img");
    if (!img) throw new Error("no image");
    await img.decode();
    const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;

    const grey = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      grey[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }
    const g = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const o = y * w + x;
        const gx =
          -grey[o - w - 1] - 2 * grey[o - 1] - grey[o + w - 1] +
          grey[o - w + 1] + 2 * grey[o + 1] + grey[o + w + 1];
        const gy =
          -grey[o - w - 1] - 2 * grey[o - w] - grey[o - w + 1] +
          grey[o + w - 1] + 2 * grey[o + w] + grey[o + w + 1];
        g[o] = Math.hypot(gx, gy);
      }
    }
    return { w, h, g: Array.from(g) };
  }, W);
}

/**
 * Zero-mean normalised cross-correlation over the region the two shots share,
 * for the mapping display q = s*(p-0.5)+0.5+d that photos.mts inverts.
 */
function ncc(before: Grad, after: Grad, s: number, dx: number, dy: number): number {
  const { w, h } = after;
  const a: number[] = [];
  const b: number[] = [];
  let sa = 0;
  let sb = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const bx = (x / w - 0.5 - dx) / s + 0.5;
      const by = (y / h - 0.5 - dy) / s + 0.5;
      if (bx < 0 || bx >= 1 || by < 0 || by >= 1) continue;
      const av = after.g[y * w + x];
      const bv = before.g[Math.round(by * (h - 1)) * w + Math.round(bx * (w - 1))];
      a.push(av);
      b.push(bv);
      sa += av;
      sb += bv;
    }
  }
  // Too little overlap left to trust the number.
  if (a.length < 2000) return -1;
  const ma = sa / a.length;
  const mb = sb / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma;
    const v = b[i] - mb;
    num += u * v;
    da += u * u;
    db += v * v;
  }
  return num / Math.sqrt(da * db || 1);
}

/** Coarse-to-fine hill climb. Four passes, each a quarter of the last range. */
function search(before: Grad, after: Grad) {
  const identity = ncc(before, after, 1, 0, 0);
  let best = { s: 1, dx: 0, dy: 0, score: identity };
  let span = { s: 0.12, d: 0.1 };
  const steps = 8;
  for (let pass = 0; pass < 4; pass++) {
    const c = { ...best };
    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        for (let k = -steps; k <= steps; k++) {
          const s = c.s + (i / steps) * span.s;
          if (s < 0.8 || s > 1.25) continue;
          const dx = c.dx + (j / steps) * span.d;
          const dy = c.dy + (k / steps) * span.d;
          const score = ncc(before, after, s, dx, dy);
          if (score > best.score) best = { s, dx, dy, score };
        }
      }
    }
    span = { s: span.s / 4, d: span.d / 4 };
  }
  return { ...best, identity };
}

/**
 * Same filename rules as photos.mts, so the keys printed here are the keys
 * ALIGN wants. Grouping by the parsed name rather than matching the pair name
 * back into a regex also survives what a phone actually writes - a pair called
 * "Driveway (2)" is a valid filename and an invalid regex.
 */
function parseName(file: string): { key: string; side: "before" | "after" } | null {
  const m = path.parse(file).name.match(/^(.*?)[\s._-]+(before|after)$/i);
  if (!m) return null;
  return {
    key: m[1].trim().toLowerCase().replace(/[\s._]+/g, "-"),
    side: m[2].toLowerCase() as "before" | "after",
  };
}

const grouped = new Map<string, { before?: string; after?: string }>();
for (const file of readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const parsed = parseName(file);
  if (!parsed) {
    console.log(`  ${file.padEnd(30)} SKIPPED - name must end in "before" or "after"`);
    continue;
  }
  const entry = grouped.get(parsed.key) ?? {};
  entry[parsed.side] = file;
  grouped.set(parsed.key, entry);
}

const fix: string[] = [];

for (const [key, { before: bf, after: af }] of [...grouped].sort()) {
  if (!bf || !af) {
    console.log(`  ${key.padEnd(14)} SKIPPED - needs both a before and an after`);
    continue;
  }

  const r = search(await gradient(bf), await gradient(af));
  const shift = Math.hypot(r.dx, r.dy) * FULL;
  const stretch = Math.abs(r.s - 1) * FULL;
  const worst = Math.max(shift, stretch);

  console.log(
    `  ${key.padEnd(14)} scale ${r.s.toFixed(4)} dx ${r.dx.toFixed(4)} dy ${r.dy.toFixed(4)}` +
      `  ~${Math.round(worst)}px off  ncc ${r.identity.toFixed(3)} -> ${r.score.toFixed(3)}` +
      (worst < WORTH_FIXING_PX ? "  (already aligned)" : ""),
  );

  if (worst >= WORTH_FIXING_PX) {
    fix.push(`  "${key}": { scale: ${r.s.toFixed(4)}, dx: ${r.dx.toFixed(4)}, dy: ${r.dy.toFixed(4)} },`);
  }
}

await browser.close();

if (fix.length) {
  console.log(`\nPaste into ALIGN in scripts/photos.mts, then re-run npm run photos:\n`);
  console.log(fix.join("\n"));
} else {
  console.log(`\nEvery pair is within ${WORTH_FIXING_PX}px. Leave ALIGN empty.`);
}
