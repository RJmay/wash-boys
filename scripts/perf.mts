/**
 * Checks the page against the performance budget — npm run perf [url]
 *
 * CLAUDE.md sets the budget: LCP under 2.0s on simulated 4G, on a phone. That
 * number is the whole point of the site - a stranger at a letterbox, on 4G,
 * deciding whether to wait. It was written down but nothing measured it, so it
 * could drift for months without anyone noticing.
 *
 * Throttles to regular 4G (9Mbps, 170ms RTT) with a 4x CPU slowdown, which is
 * roughly a mid-range Android. Defaults to the live site; pass a URL to check
 * a local build instead.
 *
 * It also reports the second visit. Repeat loads are where a missing
 * Cache-Control shows up, and that is invisible in a cold-load number.
 */
import { chromium } from "playwright-core";

const URL_TO_CHECK = process.argv[2] ?? "https://washboys.com.au/";

/** CLAUDE.md, Conventions. */
const LCP_BUDGET_MS = 2000;
/** Regular 4G. */
const THROUGHPUT_BPS = (9 * 1024 * 1024) / 8;
const LATENCY_MS = 170;
const CPU_SLOWDOWN = 4;

const browser = await chromium.launch({ channel: "chrome" });
// The 375px viewport the definition of done names.
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
});
/**
 * LCP is only delivered through a PerformanceObserver, and the last entry wins
 * - reading getEntriesByType afterwards returns nothing. Register before any
 * script on the page runs, so the entry is never missed.
 */
await context.addInitScript(() => {
  (window as unknown as { __lcp: number }).__lcp = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      (window as unknown as { __lcp: number }).__lcp = entry.startTime;
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
});

type Visit = { lcp: number; ttfb: number; load: number; fetched: number; bytes: number };

/**
 * Each visit gets a fresh page so the navigation timing starts clean, but the
 * same context - which is what keeps the HTTP cache between the two, and makes
 * the second visit mean anything.
 */
async function visit(): Promise<Visit> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: THROUGHPUT_BPS,
    uploadThroughput: THROUGHPUT_BPS,
    latency: LATENCY_MS,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  let fetched = 0;
  let bytes = 0;
  page.on("response", async (response) => {
    if (!/_next\/(image|static)|\.(webp|png|jpg|woff2?|js|css)/.test(response.url())) return;
    // A response with no server address was served from the browser cache.
    const fromNetwork = (await response.serverAddr().catch(() => null)) !== null;
    if (!fromNetwork) return;
    fetched += 1;
    const headers: Record<string, string> = await response
      .allHeaders()
      .catch(() => ({}) as Record<string, string>);
    bytes += Number(headers["content-length"] ?? 0);
  });

  await page.goto(URL_TO_CHECK, { waitUntil: "load", timeout: 300000 });
  // Scroll the page so lazy images below the fold are counted too.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);

  const measured = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      lcp: (window as unknown as { __lcp: number }).__lcp,
      ttfb: nav.responseStart,
      load: nav.loadEventEnd,
    };
  });

  await page.close();
  return { ...measured, fetched, bytes };
}

function report(label: string, v: Visit) {
  console.log(`\n  ${label}`);
  console.log(`    TTFB              ${Math.round(v.ttfb)}ms`);
  console.log(`    load event        ${Math.round(v.load)}ms`);
  console.log(`    assets from net   ${v.fetched} requests, ${Math.round(v.bytes / 1024)}KB`);
  const lcp = Math.round(v.lcp);
  const verdict = lcp <= LCP_BUDGET_MS ? "within budget" : "OVER BUDGET";
  console.log(`    LCP               ${lcp}ms   (budget ${LCP_BUDGET_MS}ms - ${verdict})`);
}

console.log(`\n  ${URL_TO_CHECK}`);
console.log(`  375px viewport, 4G (9Mbps / ${LATENCY_MS}ms RTT), ${CPU_SLOWDOWN}x CPU slowdown`);

const cold = await visit();
report("First visit (cold cache)", cold);
const warm = await visit();
report("Second visit (warm cache)", warm);

if (warm.fetched >= cold.fetched && cold.fetched > 0) {
  console.log(
    `\n  WARNING: the second visit re-fetched ${warm.fetched} assets. Anything with` +
      `\n  a content hash in its name should be served immutable and reused - check` +
      `\n  public/_headers and that job photos are static imports, not public/ paths.`,
  );
}

await browser.close();
process.exit(cold.lcp > LCP_BUDGET_MS ? 1 : 0);
