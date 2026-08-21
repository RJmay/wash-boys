# Flyer — production

The DL flyer is built and printed independently of the website deploy. Same
palette and type as the site (SPEC §2), so the jump from letterbox to landing
page feels like one thing.

- Artwork: [dl-flyer.html](dl-flyer.html) — one template, every batch variant
- Content spec: [../FLYER_BRIEF.md](../FLYER_BRIEF.md)
- Mechanics: SPEC §11

## Producing print files

```bash
npm run qr        # QR images, one per batch code
npm run flyer     # PDFs into flyer/out/
```

Prices come from `src/data/services.ts` and the phone/ABN/domain from
`src/data/business.ts`, injected at render time. **The flyer cannot print a
price the website does not show** — that is the whole reason the template
takes a config rather than hardcoding numbers.

| Command | Purpose |
|---|---|
| `npm run flyer` | Print-ready PDFs. Preflight enforced |
| `npm run flyer -- --proof` | Look at the design with placeholders. Files are named `-PROOF` |
| `npm run flyer -- --code PW1` | One batch |
| `npm run flyer -- --crop-marks` | 117×228mm with trim marks, for a trade printer |
| `npm run flyer -- --png` | PNG previews alongside the PDFs |
| `npm run flyer -- --proof --guides` | Draw trim and safe-area guides |
| `npm run flyer -- --standalone` | Self-contained editable HTML, one file per batch |
| `npm run flyer:fonts` | Re-mirror the webfonts |

## The editable copy

```bash
npm run flyer -- --standalone
```

Writes `flyer/out/wash-boys-DL-<CODE>-editable.html` — around 220 KB, with
the fonts, the QR and every value baked in. No server, no build, no query
string: double-click it, edit it in any text editor, Ctrl+P to print.

It carries its own instructions in a comment at the top of the file: where the
copy and prices live (`__FLYER__`), where the colours are, what the QR
actually encodes, and the print dialog settings (105 × 216mm, margins none,
background graphics on).

**It is a snapshot, not the source.** `npm run flyer` regenerates from
`dl-flyer.html` plus `src/data` and will not see your hand edits, so fold
anything worth keeping back into the template.

`flyer/out/` and `flyer/qr/` are both gitignored — they are generated, and QR
images are domain-specific.

## Preflight

`npm run flyer` refuses to write artwork while any of these is true:

- the domain, phone or ABN is still a `[PLACEHOLDER]`
- a batch has no QR image
- the QR images encode a different domain than the one being printed beside
  them

That last one matters more than it sounds: a QR looks identical whatever URL
is inside it, so a set generated against a test domain would print silently.
`flyer/qr/manifest.json` records what they actually encode and the preflight
compares it.

**None of this replaces a physical scan test.** Print one at home, scan it at
arm's length in poor light, and confirm it lands on the site before you order
1,000 of anything (FLYER_BRIEF).

## What to send the printer

| Spec | Value |
|---|---|
| Format | DL, 99 × 210mm trim |
| Supplied artwork | 105 × 216mm — 3mm bleed all round, no crop marks |
| Sides | Double-sided, 2-page PDF (front then back) |
| Stock | 250gsm gloss art — the "card flyer" tier |
| Colour | Supplied RGB; ask them to convert to CMYK |
| Quantity | See the batch table below |

Most online digital printers (Easy Signs, Vistaprint et al.) want bleed with
no marks — that is the default output. Use `--crop-marks` only if your printer
asks for them.

### Colour

Chrome exports RGB. Most digital printers convert happily, but if yours wants
CMYK values, these are the four brand colours:

| Colour | Hex | CMYK (approx) |
|---|---|---|
| Washed concrete | `#EEF1F1` | C3 M1 Y2 K0 |
| Charcoal | `#1B2328` | C74 M60 Y52 K68 |
| Harbour blue | `#123C52` | C93 M68 Y44 K34 |
| Hi-vis yellow | `#FFC900` | C0 M22 Y100 K0 |

Hi-vis yellow is reserved for the CTA and the QR frame. Nothing else on the
piece uses it, which is what makes it read as "press here".

### QR

28 × 28mm printed minimum, error correction level H, full quiet zone, dark
modules on light ground. Generated at 330px (28mm at 300dpi) plus SVG.

The QR encodes `https://<domain>/go/<CODE>` — never a raw destination. That
redirect is what keeps the destination re-pointable after printing, so BUD1
can be aimed at the gutter page in September without reprinting anything.

### Wave 1 batches

Quantities and tiers from FLYER_BRIEF. Minyama is the benchmark suburb — keep
it at the same quantity every wave so results stay comparable.

| Code | Suburb | Qty |
|---|---|---|
| PW1 | Pelican Waters | 1,000 |
| MIN1 | Minyama | 1,000 |
| BUD1 | Buderim | 1,000 |
| ARO1 | Aroona | 1,000 |
| CUR1 | Currimundi | 1,000 |
| AURA1 | Baringa | 500 |

5,500 pieces total. Get one quote for "6 kinds × 1,000, DL double-sided,
250gsm gloss" — unit price drops hard at 1,000 and digital printers charge
little extra per version.

Edit the plan in [../src/data/batches.ts](../src/data/batches.ts).

## Before you order

- [ ] Domain bought, live, and set in `src/data/business.ts`
- [ ] Phone number live and answering
- [ ] ABN correct — the trust bar claims one
- [ ] Public liability insurance active — the flyer claims "fully insured"
- [ ] `npm run qr` re-run against the real domain
- [ ] `npm run flyer` passes preflight with no `-PROOF` suffix
- [ ] Home-printed QR scanned at arm's length in bad light
- [ ] Codes registered in the `qr_codes` table, and `/go/[code]` live
      (session 4) — otherwise every scan hits a redirect with nothing to
      look up
- [ ] Seasonal gutter line correct for the drop month (Aug–Oct batches carry
      it; `--no-seasonal` turns it off)
