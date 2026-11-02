# Site content

Business name, phone, email and ABN are placeholders: `[BUSINESS NAME]`, `[PHONE]`, `[EMAIL]`, `[ABN]`.

---

## Home

**Hero**

# Your whole exterior, done in one morning.

House wash, driveway, gutters and windows. **$790**, fixed price, single-storey home.

We already deliver to your street, so there's no call-out fee and no quote visit.

[Book your day] [See all prices]

**What's in the Exterior Refresh**

- House soft wash: walls, eaves and frames
- Driveway and paths pressure cleaned, up to 60 m²
- Gutters cleaned, debris bagged and taken away
- Exterior windows cleaned, frames and screens rinsed

Bought separately: $1,070. Together: $790.

**How it works**

1. Pick your day. We book whole streets on set days.
2. Pay a $100 deposit to hold it.
3. Two of us arrive in the morning. One on the gutters and windows, one on the wash and driveway.
4. Done in about three hours. You get before-and-after photos and pay the balance.

**Gutter guard**

Tired of cleaning gutters? Aluminium gutter guard, fitted, from $1,690, gutter clean included. Fixed price by gutter length, no sales visit. [Gutter guard prices]

**Where we work**

Buderim, Little Mountain, Aroona, Mountain Creek, Currimundi, Pelican Waters and nearby. [See your suburb]

**Trust strip**

- Local, two-person team, the same two people every job
- Soft wash on painted surfaces, never blasted
- Wash water kept out of the street drains
- `[PLACEHOLDER: insurance line once cover is in place]`
- `[PLACEHOLDER: reviews once we have them]`

---

## Services

### House soft wash, $450

Mould, salt and grime come off with a low-pressure wash and a cleaning solution that kills mould at the root, so your paint and render aren't damaged and the clean lasts longer. Walls, eaves, frames and entry. We wet your garden beds before and after so plants are protected.

### Driveway and paths, $250

Up to 60 m² of concrete or pavers, cleaned with a rotary surface cleaner for an even finish with no stripes. Extra area $4 per m². Oil stains pre-treated where possible.

### Gutter clean, $190

Gutters cleared by hand, debris bagged and taken away, downpipes flushed. We send you photos of what came out.

### Exterior windows, $180

All outside glass cleaned, frames wiped, screens rinsed. Done after the house wash so no spots are left behind.

### Gutter guard, from $1,690

See the Gutter Guard page.

**Double-storey:** +$200 on washing and windows, +$400 on gutter guard.

---

## Bundles and Pricing

Render from `pricing.json`. Show the two bundles first as large cards, then the single-service list, then surcharges.

**Exterior Refresh: $790** (save $280)
House wash + driveway and paths + gutter clean + exterior windows.

**Full Exterior: $2,990** (save $380)
Medium gutter guard fitted + house wash + driveway and paths + exterior windows.

**Annual Refresh: $750 a year**
The Exterior Refresh again every October, before storm season. Offered after your first job.

Note under the table: All prices include GST and are for single-storey homes. Not sure of your size? Book anyway and we'll confirm by phone before the day.

---

## Gutter Guard

# Never clean your gutters again.

Aluminium mesh gutter guard, fitted to your gutters and valleys, with a gutter clean first. Fixed price by gutter length, no sales visit.

| Package | Gutter length | Price |
| --- | --- | --- |
| Small | up to 40 m | $1,690 |
| Medium | 40 to 70 m | $2,490 |
| Large | 70 to 100 m | $3,290 |

Valleys $90 each. Double-storey +$400. Bigger homes: we'll quote by phone.

Not sure of your gutter length? Most single-storey 3 to 4 bedroom homes are Medium. Book and we'll confirm with a quick phone measure.

What's included: gutter clean, mesh fitted to all gutters and valleys, offcuts removed, before-and-after photos.

`[PLACEHOLDER: product warranty wording from supplier]`

[Book gutter guard]

---

## Service Areas

One page per suburb from `service-areas.json`. Template:

# House washing and gutter cleaning in [Suburb]

[Suburb blurb from service-areas.json]

Exterior Refresh: $790 for a single-storey home. We're booking [Suburb] streets on: `[NEXT DATES]`.

Then the bundle card, the services list, How it works, and the Book button.

---

## How It Works

1. **Book a day.** Choose your service and a day we're in your suburb. Pay a $100 deposit ($300 for gutter guard).
2. **We confirm.** We call if we need to check size, storeys or access.
3. **On the day.** Two of us arrive in the morning. Leave a gate open and a tap we can use; you don't need to be home.
4. **Done.** Before-and-after photos by text, balance invoiced, and an offer to book next year's Refresh.

---

## FAQ

**Do I need to be home?** No. Leave side gates unlocked and an outside tap available.

**Will soft washing damage my paint or plants?** No. Soft washing uses low pressure, which is gentler on paint than a pressure washer. We wet garden beds before and after.

**Where does the water go?** We cover nearby street drains and keep wash water off the road. Clean rinse water goes onto lawns.

**What if it rains?** We move you to the next available day at no cost.

**Do you do double-storey?** Yes: +$200 on washing and windows, +$400 on gutter guard.

**Do you clean roofs or solar panels?** Not yet.

**How long does gutter guard last?** `[PLACEHOLDER: supplier warranty]`

**Are you insured?** `[PLACEHOLDER: answer once cover is in place]`

---

## Book

Form fields:

- Name (required)
- Mobile (required)
- Email (required)
- Street address (required)
- Suburb (select from service-areas.json, plus "Other")
- Storeys: single / double
- What would you like? Exterior Refresh / Full Exterior / Gutter guard (Small, Medium, Large, not sure) / Single services (checkboxes: house wash, driveway, gutter clean, windows)
- Roof type: tile / metal / not sure (show only for gutter guard)
- Preferred day: show next available dates for their suburb, or a date picker
- Photos of the house (optional upload)
- Anything we should know? (gates, dogs, access)
- Hidden: `source` (from `?src=` URL parameter), `page` (page the form was submitted from)

After submit: deposit step ($100 cleaning, $300 gutter guard), then a confirmation page: "You're booked for [date]. We'll text you the day before."

Footer on every page: `[BUSINESS NAME]` · `[PHONE]` · `[EMAIL]` · ABN `[ABN]` · Sunshine Coast, QLD · Prices include GST.
