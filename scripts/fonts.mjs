/**
 * Mirrors the two brand webfonts into flyer/fonts/ — npm run flyer:fonts
 *
 * The flyer is the one artefact where a font fallback is unrecoverable: by the
 * time you notice Arial on the proof, you have paid for it. Rendering must not
 * depend on Google being reachable at the moment the PDF is taken, so the
 * woff2 files and a rewritten stylesheet live in the repo.
 *
 * The site itself does not use these — next/font self-hosts its own copies.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Figtree:wght@400;600;800&display=swap";

const OUT = path.resolve(import.meta.dirname, "..", "flyer", "fonts");

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

const urls = [
  ...new Set(
    [...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g)].map(
      (m) => m[0],
    ),
  ),
];

if (urls.length === 0) {
  console.error("No woff2 URLs found — Google may have changed the CSS format.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

let rewritten = css;
for (const url of urls) {
  const name = url.split("/s/")[1].replaceAll("/", "_");
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(path.join(OUT, name), bytes);
  rewritten = rewritten.split(url).join(`./${name}`);
  console.log(`  ${name}  ${(bytes.length / 1024).toFixed(1)} KB`);
}

writeFileSync(
  path.join(OUT, "fonts.css"),
  `/* Mirrored from Google Fonts so print rendering never depends on the\n   network. Regenerate with: npm run flyer:fonts */\n${rewritten}`,
  "utf8",
);

console.log(`\nWrote ${urls.length} font files + fonts.css to flyer/fonts/`);
