# DEPLOY.md — pipeline and launch setup

Hosting is **Cloudflare Workers** via the OpenNext adapter
(`@opennextjs/cloudflare`), with **Cloudflare DNS** once the domain is bought.
Repo: <https://github.com/RJmay/wash-boys> (private).

## What is deployable today

Session 1 only: the data layer, database schema and validation, behind a
placeholder page. The point of deploying now is the **pipeline** — every push
to `main` builds and deploys, so sessions 2–7 are visible on a real URL as
they land. This is not the launch. The launch checklist is SPEC §9 and runs in
session 8.

The build succeeds with **no environment variables set**, by design: env
validation is lazy, so a missing key fails the one server action that needs it
with a readable message instead of breaking the build. You can deploy before
Supabase exists.

Verified locally: `npm run cf:build` produces a Worker, and the app boots and
serves in the real Workers runtime (`wrangler dev`) — HTTP 200 on `/`, correct
404 handling. Bundle is ~951 KB gzipped, well inside the 3 MB Worker limit.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server, with Cloudflare bindings attached |
| `npm run cf:build` | Build + adapt for Cloudflare (`.open-next/worker.js`) |
| `npm run cf:preview` | Build, then serve the real Worker locally on 8787 |
| `npm run cf:deploy` | Build and deploy to Cloudflare |
| `npm run cf:typegen` | Regenerate binding types after editing `wrangler.jsonc` |

---

## 1. Cloudflare — get it deploying

Two ways in. **Git integration is the one you want** — it matches the
push-to-deploy loop and needs no local auth.

### Option A — Workers Builds (recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a
   repository** → connect GitHub, authorise the `wash-boys` repo.
2. **Deploy command: `npm run cf:deploy`**
   **Build command: leave empty.**
3. Add the build variables from section 3 **before** the first build (the
   `NEXT_PUBLIC_*` ones are baked in at build time).
4. Deploy. You get `wash-boys.<your-subdomain>.workers.dev`.

Every push to `main` then builds and deploys automatically.

> **Why one command, not two.** Workers Builds will happily run a deploy
> command with an empty build command, and `npx wrangler deploy` on its own
> fails with *"Could not find compiled Open Next config, did you run the build
> command?"* — there is no Worker to ship yet. `npm run cf:deploy` builds and
> deploys in the one step, so there is no second field to forget.
>
> Two fields also works if you prefer it: build `npm run cf:build`, deploy
> `npx wrangler deploy`. Just do not set one without the other.

### Option B — from this machine

```bash
npx wrangler login     # opens a browser
npm run cf:deploy
```

### Plan note

Worker CPU time per request is capped on the free plan, and server-rendering
React can push against that once the booking flow is real. Static pages are
served straight from the assets binding and barely touch it, so this may never
bite — but if you start seeing CPU-limit errors under load, Workers Paid is
$5/month and raises the ceiling substantially. Not something to pre-buy.

---

## 2. Supabase — create the project

**Region: `ap-southeast-2` (Sydney).** Easy to get wrong, painful to change —
the default is US East, which would put the Pacific between your database and
every booking write.

Then apply the schema:

```bash
npx supabase db push
```

or paste [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
into the SQL editor.

After creating the owner account: **Authentication → Providers → Email →
Enable signup: OFF**. The admin RLS policies trust any authenticated user, and
there is meant to be exactly one.

---

## 3. Environment variables

Cloudflare splits these in a way Vercel does not, and getting it wrong is the
most likely reason a deploy misbehaves:

**Build variables** — `NEXT_PUBLIC_*` values are inlined into the JavaScript
at build time. They must exist when the build runs (Workers Builds → Settings
→ Variables → *Build* variables). Changing one requires a rebuild, not just a
restart.

**Runtime secrets** — everything else is read by the Worker at request time.
Add via dashboard (Settings → Variables and Secrets → *Secret*) or
`npx wrangler secret put NAME`. Never commit them.

| Variable | Kind | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build | Supabase → Settings → API. Safe to expose; RLS denies it everything |
| `NEXT_PUBLIC_SITE_URL` | build | The workers.dev URL for now, the real domain later. No trailing slash |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Supabase → Settings → API. **Bypasses RLS.** Never prefix with `NEXT_PUBLIC_` |
| `RESEND_API_KEY` | secret | Resend → API Keys. Session 3 onward |
| `ADMIN_EMAIL` | secret | Your inbox — where new-booking alerts land |
| `QUOTE_ENGINE_URL` | secret | Leave empty. Phase 2 (SPEC §10) |

Locally, all of them go in `.env.local` (`cp .env.example .env.local`).

Unlike Vercel, Workers has no automatic deployment URL, so `NEXT_PUBLIC_SITE_URL`
has to be set explicitly or emails and sitemap links have nothing to point at.

---

## 4. Resend

Create the account, add the domain, verify the DNS records it gives you — they
go in Cloudflare DNS alongside everything else. Send from `bookings@[DOMAIN]`.

---

## 5. Domain — when it is bought

Not done yet. Registration needs the ABN. Candidates: `washboys.com.au`,
`thewashboys.com.au`, `washboys.au`.

Because DNS is already Cloudflare, attaching it is short:

1. Add the domain to Cloudflare, point the registrar at Cloudflare's
   nameservers.
2. Worker → **Settings → Domains & Routes → Add → Custom Domain**. Cloudflare
   creates the DNS record and issues the certificate itself — no manual CNAME.
3. Add Resend's SPF/DKIM/DMARC records in the same DNS zone.
4. Update `NEXT_PUBLIC_SITE_URL` to the real origin and **rebuild** (build
   variable, so a redeploy alone will not pick it up).
5. Fill `[PHONE]`, `[ABN]` and `[DOMAIN]` in
   [src/data/business.ts](src/data/business.ts) — the only file they appear in.

---

## Configuration reference

- [wrangler.jsonc](wrangler.jsonc) — Worker name, `nodejs_compat`, the assets
  binding, the native `IMAGES` binding (this is what keeps `next/image`
  working, so the before/after photos stay optimised), and observability logs.
- [open-next.config.ts](open-next.config.ts) — no incremental cache, because
  nothing in the site uses ISR. Instructions for adding the R2 cache are in
  the file for when that changes.
- `compatibility_date` is pinned to `2026-08-20` to match the bundled workerd.
  Do not set it ahead of the runtime or the deploy is rejected.

---

## Still open before anything is printed or launched

Session-0 and SPEC §9 items, none of which are code:

- [ ] Domain bought, email on the domain (`bookings@`)
- [ ] Supabase project created in `ap-southeast-2`, schema pushed, signups off
- [ ] Resend account, domain verified
- [ ] Phone number live
- [ ] Public liability insurance active — the site claims it, so it must be true
- [ ] ABN in the footer
- [ ] Sessions 2–7 built (landing, booking, QR, admin, SEO, flyer)
- [ ] Session 8 launch checklist passed end to end, including a real-phone
      test booking through a printed QR code
