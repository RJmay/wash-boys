/**
 * Re-encodes source job photos into web-sized WebP — npm run photos
 *
 * The originals off a phone are 2-5MB PNGs. Shipping those as Worker assets
 * would blow the LCP budget the whole site is built around, and next/image
 * cannot fix a 4.6MB source cheaply. Downscale and re-encode once, commit the
 * small versions, keep the originals out of the repo.
 *
 * Drop new originals in photos-src/ and re-run.
 *
 * Output goes to src/photos/, not public/, so site.ts can import the files
 * rather than reference them by path. That is what makes them cacheable: the
 * Workers image handler only sends Cache-Control when the source URL is under
 * /_next/static/media, which is where a static import lands. A path under
 * public/ gets no cache header at all and is re-fetched on every single visit.
 * Static imports also hash the filename, so re-shooting a job busts the cache
 * by itself, and give next/image the blur placeholder for free.
 */
import { mkdirSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "photos-src");
const OUT = path.join(ROOT, "src", "photos");

/** Wide enough for a full-bleed slider on a 2x desktop display. */
const MAX_WIDTH = 1600;
const QUALITY = 0.82;
/** The slider frame. Both halves are cropped to this so nothing shifts. */
const ASPECT = 4 / 3;

/**
 * Measured misalignment per pair: the transform that puts the BEFORE shot on
 * top of the AFTER, found by matching gradient structure over the building
 * (see the alignment script). `dx`/`dy` are fractions of frame width/height.
 *
 * Rather than correcting this with a CSS zoom - which costs resolution and
 * tightens the crop on both - it is baked in here: each side is cropped to
 * the region the two shots share, so the wipe reveals the same scene and the
 * house never jumps.
 */
const ALIGN: Record<string, { scale: number; dx: number; dy: number }> = {
  // Measured by `npm run align`. Re-run it whenever the source photos change
  // and replace this block wholesale - a stale entry is worse than none, since
  // it crops a new pair against an old shoot and still reports "(aligned)".
  // Pairs already within a few pixels are left out on purpose: correcting them
  // costs resolution and tightens the crop for no visible gain.
  "fence-clean": { scale: 0.9878, dx: -0.0055, dy: -0.0068 },
  "house-side": { scale: 0.9923, dx: -0.0029, dy: -0.0037 },
};

/** Source region of each side that the two shots have in common. */
function commonCrop(pair: string) {
  const a = ALIGN[pair];
  const full = { x0: 0, y0: 0, x1: 1, y1: 1 };
  if (!a) return { before: full, after: full };

  // before source p maps to display q = scale*(p-0.5)+0.5+d
  const toDisplay = (p: number, s: number, d: number) => s * (p - 0.5) + 0.5 + d;
  const toSource = (q: number, s: number, d: number) => (q - 0.5 - d) / s + 0.5;

  const axis = (s: number, d: number) => {
    // Where the before image actually reaches, in display space.
    const lo = Math.max(0, toDisplay(0, s, d));
    const hi = Math.min(1, toDisplay(1, s, d));
    return {
      after: [lo, hi] as const,
      before: [toSource(lo, s, d), toSource(hi, s, d)] as const,
    };
  };

  const x = axis(a.scale, a.dx);
  const y = axis(a.scale, a.dy);

  return {
    after: { x0: x.after[0], y0: y.after[0], x1: x.after[1], y1: y.after[1] },
    before: { x0: x.before[0], y0: y.before[0], x1: x.before[1], y1: y.before[1] },
  };
}

if (!existsSync(SRC)) {
  console.error(`No photos-src/ directory. Put original photos there and re-run.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

/**
 * Accepts what a phone and a human actually produce: "House wash before.png",
 * "driveway-after.jpg", "Fence clean AFTER.png". Renaming eight files by hand
 * after every job is the kind of friction that stops photos being taken at all.
 */
function parseName(file: string): { pairName: string; side: "before" | "after" } | null {
  const stem = path.parse(file).name;
  const m = stem.match(/^(.*?)[\s._-]+(before|after)$/i);
  if (!m) return null;
  return {
    pairName: m[1].trim().toLowerCase().replace(/[\s._]+/g, "-"),
    side: m[2].toLowerCase() as "before" | "after",
  };
}

const sources = readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

for (const file of sources.sort()) {
  const src = path.join(SRC, file);
  // Navigating to the image directly gives the page a file origin, so the
  // canvas stays untainted and toDataURL works.
  await page.goto(pathToFileURL(src).href, { waitUntil: "load" });

  const parsed = parseName(file);
  if (!parsed) {
    console.log(`  ${file.padEnd(30)} SKIPPED - name must end in "before" or "after"`);
    continue;
  }
  const { pairName, side } = parsed;
  const crop = commonCrop(pairName)[side === "before" ? "before" : "after"];

  const encoded = await page.evaluate(
    async ({ maxWidth, quality, crop, aspect }) => {
      const img = document.querySelector("img");
      if (!img) return null;
      await img.decode();

      // Region of the source this side contributes, in pixels.
      let sx = crop.x0 * img.naturalWidth;
      let sy = crop.y0 * img.naturalHeight;
      let sw = (crop.x1 - crop.x0) * img.naturalWidth;
      let sh = (crop.y1 - crop.y0) * img.naturalHeight;

      // Centre-crop that region back to the slider's aspect ratio.
      if (sw / sh > aspect) {
        const want = sh * aspect;
        sx += (sw - want) / 2;
        sw = want;
      } else {
        const want = sw / aspect;
        sy += (sh - want) / 2;
        sh = want;
      }

      const scale = Math.min(1, maxWidth / sw);
      const w = Math.round(sw * scale);
      const h = Math.round(sh * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      return {
        w,
        h,
        srcW: img.naturalWidth,
        srcH: img.naturalHeight,
        cropped: sw < img.naturalWidth - 1 || sh < img.naturalHeight - 1,
        data: canvas.toDataURL("image/webp", quality),
      };
    },
    { maxWidth: MAX_WIDTH, quality: QUALITY, crop, aspect: ASPECT },
  );

  if (!encoded) {
    console.log(`  ${file.padEnd(34)} FAILED to decode`);
    continue;
  }

  const name = `${pairName}-${side}.webp`;
  const bytes = Buffer.from(encoded.data.split(",")[1], "base64");
  writeFileSync(path.join(OUT, name), bytes);

  const before = (statSync(src).size / 1024 / 1024).toFixed(1);
  const after = (bytes.length / 1024).toFixed(0);
  console.log(
    `  ${file.padEnd(30)} ${encoded.srcW}x${encoded.srcH} ${before}MB -> ${encoded.w}x${encoded.h} ${after}KB${encoded.cropped ? " (aligned)" : ""}`,
  );
}

await browser.close();
console.log(`\n${sources.length} photo(s) written to src/photos/`);
