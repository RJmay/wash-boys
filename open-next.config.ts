import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare adapter config.
 *
 * No incremental cache is configured: every page we build is either fully
 * static (landing, service and suburb pages, generated at build time) or fully
 * dynamic (the booking flow and admin). Nothing uses ISR, so there is nothing
 * to cache between requests.
 *
 * When ISR does turn up, add the R2 incremental cache - create the bucket,
 * add the NEXT_INC_CACHE_R2_BUCKET binding and the WORKER_SELF_REFERENCE
 * service binding in wrangler.jsonc, then:
 *
 *   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 */
export default defineCloudflareConfig({});
