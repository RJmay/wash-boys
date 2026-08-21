import { z } from "zod";

/**
 * Validated environment access. Every variable here is mirrored in
 * .env.example and must also be set in Vercel.
 *
 * Validation is lazy on purpose: a missing RESEND_API_KEY should fail the one
 * server action that sends email with a readable message, not the whole build.
 *
 * NEXT_PUBLIC_* values are read as literal member expressions so Next can
 * inline them into the client bundle - do not refactor these into a loop or a
 * destructure of process.env.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.url({
    message: "NEXT_PUBLIC_SITE_URL must be an absolute URL",
  }),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for server writes"),
});

const emailSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required to send email"),
  ADMIN_EMAIL: z.email({
    message: "ADMIN_EMAIL must be the owner's email for booking alerts",
  }),
});

function parse<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid ${label} environment. Check .env.local against .env.example:\n${detail}`,
    );
  }
  return result.data;
}

let publicCache: z.infer<typeof publicSchema> | undefined;

export function publicEnv() {
  publicCache ??= parse(
    publicSchema,
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl(),
    },
    "public",
  );
  return publicCache;
}

let serverCache: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  serverCache ??= parse(
    serverSchema,
    { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY },
    "server",
  );
  return serverCache;
}

let emailCache: z.infer<typeof emailSchema> | undefined;

export function emailEnv() {
  emailCache ??= parse(
    emailSchema,
    {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    },
    "email",
  );
  return emailCache;
}

/**
 * Phase 2 only. Empty until the FastAPI quote engine is wired in (SPEC §10),
 * so callers must treat "not configured" as the normal case and fall back to
 * the range-based flow.
 */
export function quoteEngineUrl(): string | null {
  const raw = process.env.QUOTE_ENGINE_URL?.trim();
  return raw ? raw : null;
}

/** Absolute site origin for emails, sitemap and OG tags. */
export function siteUrl(): string {
  return publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

function defaultSiteUrl(): string | undefined {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return undefined;
}
