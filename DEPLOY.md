# DEPLOY.md — pipeline and launch setup

Hosting is **Vercel**, DNS will be **Cloudflare** once the domain is bought.
Repo: <https://github.com/RJmay/wash-boys> (private).

## What is deployable today

Session 1 only: the data layer, database schema and validation, behind a
placeholder page. The point of deploying now is the **pipeline** — every push
to `main` builds and deploys, so sessions 2–7 are visible on a real URL as
they land. This is not the launch. The launch checklist is SPEC §9 and runs in
session 8.

The build succeeds with **no environment variables set**, by design: env
validation is lazy, so a missing key fails the one server action that needs it
with a readable message instead of breaking the build. You can import the repo
before Supabase exists.

---

## 1. Vercel — import the repo (5 minutes, browser)

1. <https://vercel.com/new> → **Import Git Repository** → `RJmay/wash-boys`.
   First time only, this installs the Vercel GitHub app; grant it access to
   that one repo.
2. Framework preset: **Next.js** (auto-detected). Leave root directory, build
   command and output directory at their defaults.
3. Do **not** add environment variables yet — click **Deploy**.
4. You get a URL like `wash-boys.vercel.app`. That is the pipeline working.

From then on: push to `main` → production deploy; any other branch or PR →
its own preview URL.

### Region

[vercel.json](vercel.json) pins serverless functions to **`syd1` (Sydney)**.
Default is US East, which would add a Pacific round trip to every booking
write for a business whose customers are all within an hour of Caloundra.

If the deploy rejects `regions` on your plan, delete that key and set it in
**Project Settings → Functions → Function Region → Sydney** instead.

---

## 2. Supabase — create the project

**Region: `ap-southeast-2` (Sydney).** This one is easy to get wrong and
painful to change — the default is US East, which would put the Pacific
between your Sydney functions and your database on every query.

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

Add these in **Vercel → Project → Settings → Environment Variables**, for
Production, Preview and Development. Mirror them into `.env.local` for local
work (`cp .env.example .env.local`).

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Safe to expose; RLS denies it everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Secret.** Bypasses RLS. Never prefix with `NEXT_PUBLIC_` |
| `RESEND_API_KEY` | Resend → API Keys | Session 3 onward |
| `ADMIN_EMAIL` | Your inbox | Where new-booking alerts land |
| `NEXT_PUBLIC_SITE_URL` | Your domain | Optional — falls back to the Vercel production URL |
| `QUOTE_ENGINE_URL` | — | Leave empty. Phase 2 (SPEC §10) |

> **`NEXT_PUBLIC_*` values are baked into the build.** After adding or changing
> one, redeploy — an existing deployment will not pick it up.

---

## 4. Resend

Create the account, add the domain, verify the DNS records it gives you (these
go in Cloudflare, see below). Send from `bookings@[DOMAIN]`.

---

## 5. Domain + Cloudflare DNS — when the domain is bought

Not done yet. Registration needs the ABN. Candidates: `washboys.com.au`,
`thewashboys.com.au`, `washboys.au`.

Once bought:

1. Add the domain to Cloudflare, point the registrar at Cloudflare's
   nameservers.
2. Vercel → Project → Settings → Domains → add the domain. Vercel gives you a
   CNAME (or A record for the apex).
3. Add those in Cloudflare DNS. Set the record to **DNS only (grey cloud)**,
   not proxied — Vercel terminates TLS and handles its own edge, and double
   proxying causes redirect loops and breaks certificate issuance.
4. Add Resend's verification records (SPF/DKIM/DMARC) in the same place.
5. Set `NEXT_PUBLIC_SITE_URL` to the real origin and redeploy.
6. Fill `[PHONE]`, `[ABN]` and `[DOMAIN]` in
   [src/data/business.ts](src/data/business.ts) — that is the only file they
   appear in.

---

## Still open before anything is printed or launched

These are the session-0 and SPEC §9 items, none of which are code:

- [ ] Domain bought, email on the domain (`bookings@`)
- [ ] Supabase project created in `ap-southeast-2`, schema pushed, signups off
- [ ] Resend account, domain verified
- [ ] Phone number live
- [ ] Public liability insurance active — the site claims it, so it must be true
- [ ] ABN in the footer
- [ ] Sessions 2–7 built (landing, booking, QR, admin, SEO, flyer)
- [ ] Session 8 launch checklist passed end to end, including a real-phone
      test booking through a printed QR code
