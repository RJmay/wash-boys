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
 * It also checks the second visit, where a missing Cache-Control shows up.
 * That is invisible in a cold-load number, and is what let every asset on this
 * site go uncached for months.
 *
 * Timings vary run to run - it is measuring a real site over a real network,
 * and a cold Worker start alone can move TTFB by half a second. Treat one bad
 * run as noise and look at the trend.
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

type Visit = {
  lcp: number;
  ttfb: number;
  load: number;
  fetched: number;
  cached: number;
  bytes: number;
};

/**
 * One page for both visits, throttled once.
 *
 * Throttling is set per CDP session and outlives the page it was attached to,
 * so opening a fresh page per visit and re-applying it stacks the CPU slowdown
 * and the second load reads as ten times worse than it is. Reusing the page is
 * also what keeps the HTTP cache warm, which is the entire point of the second
 * measurement; a new document resets the navigation timing on its own.
 */
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

async function visit(): Promise<Visit> {
  await page.goto(URL_TO_CHECK, { waitUntil: "load", timeout: 300000 });
  // Let the above-the-fold work settle, then take the timing numbers BEFORE
  // scrolling. LCP keeps updating until a real user interaction, and a
  // scripted scroll is not one - so scrolling first makes every image that
  // paints on the way down the new "largest paint" and reports a load time
  // several seconds worse than anything a visitor experiences.
  await page.waitForTimeout(1500);
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      lcp: (window as unknown as { __lcp: number }).__lcp,
      ttfb: nav.responseStart,
      load: nav.loadEventEnd,
    };
  });

  // Now scroll, so the lazy-loaded images below the fold are fetched and can
  // be counted. This is about coverage, not timing.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2000);

  const assets = await page.evaluate(() => {
    const assets = performance
      .getEntriesByType("resource")
      .filter((r): r is PerformanceResourceTiming => /_next\/(image|static)/.test(r.name));
    // transferSize 0 with a real body is the browser saying it never went out
    // to the network. Response headers cannot tell you this - a cache hit still
    // reports the address it was originally fetched from.
    const fromCache = assets.filter((r) => r.transferSize === 0 && r.decodedBodySize > 0);
    const fromNetwork = assets.filter((r) => r.transferSize > 0);
    return {
      fetched: fromNetwork.length,
      cached: fromCache.length,
      bytes: fromNetwork.reduce((total, r) => total + r.transferSize, 0),
    };
  });

  return { ...timing, ...assets };
}

console.log(`\n  ${URL_TO_CHECK}`);
console.log(`  375px viewport, 4G (9Mbps / ${LATENCY_MS}ms RTT), ${CPU_SLOWDOWN}x CPU slowdown`);

const cold = await visit();
const coldLcp = Math.round(cold.lcp);
const verdict = coldLcp <= LCP_BUDGET_MS ? "within budget" : "OVER BUDGET";

console.log(`\n  First visit - what a new customer gets`);
console.log(`    TTFB              ${Math.round(cold.ttfb)}ms`);
console.log(`    load event        ${Math.round(cold.load)}ms`);
console.log(`    downloaded        ${cold.fetched} assets, ${Math.round(cold.bytes / 1024)}KB`);
console.log(`    LCP               ${coldLcp}ms   (budget ${LCP_BUDGET_MS}ms - ${verdict})`);

/*
 * The second visit is a cache check, not a timing one. Timings from a warm
 * load are not trustworthy here: LCP keeps updating until a real user
 * interaction, and nothing this script does counts as one, so a scripted
 * second load reports a paint time no visitor would ever see. What is solid is
 * where the bytes came from, and that is the thing worth guarding - it is how
 * a missing Cache-Control gets caught.
 */
const warm = await visit();
console.log(`\n  Second visit - cache reuse`);
console.log(`    from cache        ${warm.cached} assets`);
console.log(`    from network      ${warm.fetched} assets, ${Math.round(warm.bytes / 1024)}KB`);

if (warm.fetched > 0) {
  console.log(
    `\n  WARNING: the second visit went to the network for ${warm.fetched} asset(s).` +
      `\n  Everything under /_next/static/ carries a content hash and should come` +
      `\n  back from cache - check public/_headers, and that the job photos are` +
      `\n  static imports rather than paths under public/.`,
  );
}

await browser.close();
process.exit(cold.lcp > LCP_BUDGET_MS ? 1 : 0);
