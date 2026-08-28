"""
generate_test_quotes.py — fire randomised, realistic pressure-washing jobs at a
live /quote endpoint and report what comes back.

The point is to shake out the pricing model across the whole space of real jobs:
a townhouse courtyard, a shaded acreage driveway under five years of lichen, a
two-storey render wash with no tap on site. Anything that produces an absurd
price, a 500, or a suspiciously flat $/m² curve shows up here rather than in
front of a customer.

Usage
─────
  # against a local backend
  python generate_test_quotes.py --api http://localhost:8000 --count 20

  # against the deployed Railway backend
  python generate_test_quotes.py --api https://your-app.up.railway.app --count 50

  # reproducible run, saved to CSV
  python generate_test_quotes.py --count 30 --seed 42 --out quotes.csv

Notes
─────
* Every quote is a real Claude call on the server, so this costs money. Start small.
* The server rate-limits /quote to 10/hour per IP by default. For bulk runs set
  RATE_LIMIT_QUOTE (and optionally RATE_LIMIT_WINDOW_SEC) on the backend.
* Addresses are randomised so the server-side quote cache doesn't mask results.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import statistics
import sys
import time
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass


# ── Sample space ──────────────────────────────────────────────────────────────

SUBURBS = [
    ("Ashgrove", "QLD", 4060), ("Chermside", "QLD", 4032), ("Carindale", "QLD", 4152),
    ("Sunnybank", "QLD", 4109), ("Wynnum", "QLD", 4178), ("Kenmore", "QLD", 4069),
    ("Redcliffe", "QLD", 4020), ("Springfield", "QLD", 4300), ("Cleveland", "QLD", 4163),
    ("Samford", "QLD", 4520), ("Ipswich", "QLD", 4305), ("Manly", "QLD", 4179),
]

STREETS = [
    "Eucalyptus Dr", "Wattle St", "Jacaranda Ave", "Banksia Cr", "Poinciana Pde",
    "Melaleuca Way", "Bottlebrush Ct", "Grevillea Rd", "Ironbark Tce", "Lilly Pilly Cl",
]

# Property archetypes: (label, weight, surface ranges)
ARCHETYPES = [
    ("townhouse", 3, {
        "driveway_exposed_sqm": (15, 30), "driveway_covered_sqm": (0, 10),
        "path_sqm": (6, 16), "patio_sqm": (8, 20), "pool_surround_sqm": (0, 0),
        "house_wall_sqm": (70, 120), "roof_sqm": (60, 110), "gutter_face_m": (24, 40),
        "deck_sqm": (0, 12), "fence_lin_m": (6, 16), "solar_panels": (0, 12),
    }),
    ("suburban", 5, {
        "driveway_exposed_sqm": (32, 70), "driveway_covered_sqm": (0, 20),
        "path_sqm": (12, 30), "patio_sqm": (16, 40), "pool_surround_sqm": (0, 40),
        "house_wall_sqm": (130, 230), "roof_sqm": (120, 210), "gutter_face_m": (40, 65),
        "deck_sqm": (0, 30), "fence_lin_m": (12, 32), "solar_panels": (0, 24),
    }),
    ("large", 2, {
        "driveway_exposed_sqm": (80, 160), "driveway_covered_sqm": (10, 30),
        "path_sqm": (25, 55), "patio_sqm": (30, 70), "pool_surround_sqm": (25, 80),
        "house_wall_sqm": (240, 400), "roof_sqm": (200, 320), "gutter_face_m": (60, 95),
        "deck_sqm": (15, 50), "fence_lin_m": (28, 60), "solar_panels": (10, 36),
    }),
]

# Realistic service bundles rather than uniform-random picks — a customer books
# "driveway + paths", not one random service out of eleven.
BUNDLES = [
    (["driveway_wash"], 4),
    (["driveway_wash", "patio_wash"], 3),
    (["house_wash"], 3),
    (["house_wash", "driveway_wash"], 3),
    (["roof_wash"], 2),
    (["roof_wash", "house_wash", "gutter_face_wash"], 2),
    (["driveway_wash", "house_wash", "roof_wash", "patio_wash"], 1),
    (["deck_wash"], 1),
    (["fence_wash", "driveway_wash"], 1),
    (["solar_panel_clean"], 1),
    (["driveway_wash", "concrete_sealing"], 1),
    (["pool_surround_wash", "patio_wash"], 1),
]

# Which surfaces each service needs a measurement for.
SERVICE_SURFACES = {
    "driveway_wash": ["driveway_exposed_sqm", "driveway_covered_sqm"],
    "patio_wash": ["patio_sqm"],
    "pool_surround_wash": ["pool_surround_sqm"],
    "house_wash": ["house_wall_sqm"],
    "roof_wash": ["roof_sqm"],
    "deck_wash": ["deck_sqm"],
    "fence_wash": ["fence_lin_m"],
    "gutter_face_wash": ["gutter_face_m"],
    "gutter_cleaning": ["gutter_face_m"],
    "solar_panel_clean": ["solar_panels"],
    "concrete_sealing": ["driveway_exposed_sqm"],
}

MATERIALS = {
    "driveway_exposed_sqm": ["concrete", "exposed_aggregate", "pavers", "stencil", "asphalt"],
    "driveway_covered_sqm": ["concrete", "pavers"],
    "path_sqm": ["concrete", "pavers"],
    "patio_sqm": ["pavers", "concrete", "tile", "sandstone"],
    "pool_surround_sqm": ["pavers", "sandstone", "tile"],
    "house_wall_sqm": ["render", "face_brick", "weatherboard", "fibre_cement", "colorbond_wall"],
    "roof_sqm": ["concrete_tile", "terracotta", "colorbond_roof", "asbestos"],
    "deck_sqm": ["hardwood", "softwood", "composite"],
    "fence_lin_m": ["colorbond_fence", "timber_fence", "masonry_fence"],
}

# Weighted so the rare-but-important cases (asbestos, no water) still appear.
SOILING = [("light", 2), ("moderate", 5), ("heavy", 3), ("severe", 1)]
CONTAMINANTS = ["algae", "lichen", "moss", "oil", "rust", "efflorescence", "cobwebs", "bird", "paint"]
LAST_CLEANED = ["never", "over5", "two_to_five", "about1", "recent"]
ASPECTS = ["open", "partial", "shaded"]
WATER = [("tap", 8), ("none", 1), ("unknown", 1)]
POWER = [("yes", 8), ("no", 1), ("unknown", 1)]
SIDE = [("wide", 6), ("narrow", 3), ("none", 1)]
EXTRAS = ["seal", "resand", "oil_removal", "windows", "gutter_out", "bins"]
FREQUENCY = [("once", 6), ("annual", 2), ("biannual", 1), ("quarterly", 1)]

EXPOSED_FLATWORK = ["driveway_exposed_sqm", "path_sqm", "patio_sqm", "pool_surround_sqm"]


def _weighted(rng: random.Random, pairs):
    population = [p[0] for p in pairs]
    weights = [p[1] for p in pairs]
    return rng.choices(population, weights=weights, k=1)[0]


def build_case(rng: random.Random, index: int) -> dict:
    """One randomised but internally consistent pressure-washing job."""
    label, _, ranges = rng.choices(
        ARCHETYPES, weights=[w for _, w, _ in ARCHETYPES], k=1
    )[0]

    suburb, state, postcode = rng.choice(SUBURBS)
    address = f"{rng.randint(1, 240)} {rng.choice(STREETS)}, {suburb} {state} {postcode}"

    job_ids = list(_weighted(rng, [(tuple(b), w) for b, w in BUNDLES]))

    # Measure only the surfaces the chosen services need — same rule the UI uses.
    needed = {s for j in job_ids for s in SERVICE_SURFACES.get(j, [])}
    surfaces = {}
    for key in needed:
        lo, hi = ranges.get(key, (0, 0))
        if hi <= 0:
            continue
        value = rng.randint(int(lo), int(hi))
        if value > 0:
            surfaces[key] = float(value)

    # A job with nothing to wash isn't a job; give it a driveway.
    if not surfaces:
        surfaces["driveway_exposed_sqm"] = float(rng.randint(30, 60))

    materials = {
        key: rng.choice(MATERIALS[key]) for key in surfaces if key in MATERIALS
    }

    soiling = _weighted(rng, SOILING)
    contaminants = rng.sample(CONTAMINANTS, k=rng.randint(0, 3))
    storeys = rng.choices([1, 2, 3], weights=[6, 3, 1], k=1)[0]

    runoff = [r for r in ("garden", "pool", "waterway") if rng.random() < 0.18]
    extras = rng.sample(EXTRAS, k=rng.randint(0, 2))
    frequency = _weighted(rng, FREQUENCY)

    exposed_total = sum(surfaces.get(k, 0) for k in EXPOSED_FLATWORK)
    covered = surfaces.get("driveway_covered_sqm", 0.0)

    return {
        "_meta": {"index": index, "archetype": label, "bundle": "+".join(job_ids)},
        "address": address,
        "suburb": suburb,
        "state": state,
        "job_ids": job_ids,
        # Legacy contract fields
        "lawn_sqm": float(rng.randint(80, 400)),
        "roof_sqm": surfaces.get("roof_sqm", float(rng.randint(100, 220))),
        "garden_sqm": float(rng.randint(10, 70)),
        "gutter_length_m": surfaces.get("gutter_face_m", float(rng.randint(35, 70))),
        "driveway_exposed_sqm": exposed_total or 40.0,
        "driveway_covered_sqm": covered,
        "overhang_detected": covered > 0,
        "overhang_description": (
            f"Carport/porch covering ~{covered:.0f}m²." if covered > 0 else "No overhang detected."
        ),
        "condition_score": round(rng.uniform(0.15, 0.95), 2),
        "condition_context": (
            f"Randomised test case #{index}: {label} property in {suburb}, {state}. "
            f"Soiling {soiling}."
        ),
        "travel_zone": rng.choices(["A", "B", "C"], weights=[6, 3, 1], k=1)[0],
        "terrain": rng.choices(["flat", "sloped", "unknown"], weights=[7, 2, 1], k=1)[0],
        "access_notes": "Automated test case.",
        "area_source": rng.choice(["manual", "maps_vision"]),
        # Pressure-washing detail
        "surfaces": surfaces,
        "surface_materials": materials,
        "soiling_level": soiling,
        "contaminants": contaminants,
        "last_cleaned": rng.choice(LAST_CLEANED),
        "aspect": rng.choice(ASPECTS),
        "storeys": storeys,
        "water_access": _weighted(rng, WATER),
        "power_access": _weighted(rng, POWER),
        "side_access": _weighted(rng, SIDE),
        "runoff_sensitivity": runoff,
        "extras": extras,
        "service_frequency": frequency,
    }


# ── HTTP ──────────────────────────────────────────────────────────────────────

def post_quote(api: str, payload: dict, timeout: int) -> tuple[int, dict | str]:
    body = json.dumps({k: v for k, v in payload.items() if not k.startswith("_")}).encode()
    req = urllib.request.Request(
        f"{api.rstrip('/')}/quote",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw[:300]
    except Exception as e:  # noqa: BLE001 — surface any transport failure as a row
        return 0, f"{type(e).__name__}: {e}"


# ── Reporting ─────────────────────────────────────────────────────────────────

def summarise(results: list[dict]) -> None:
    good = [r for r in results if r["ok"]]
    bad = [r for r in results if not r["ok"]]

    print("\n" + "=" * 78)
    print(f"{len(good)}/{len(results)} quotes succeeded")

    if bad:
        print("\nFailures:")
        codes = {}
        for r in bad:
            codes.setdefault(f"{r['status']}: {str(r['error'])[:90]}", 0)
            codes[f"{r['status']}: {str(r['error'])[:90]}"] += 1
        for msg, n in sorted(codes.items(), key=lambda x: -x[1]):
            print(f"  {n:>3}x  {msg}")

    if not good:
        print("\nNo successful quotes to analyse.")
        return

    mids = [r["mid"] for r in good]
    per_sqm = [r["per_sqm"] for r in good if r["per_sqm"]]

    print(f"\nPrice range   min ${min(mids):,.0f}   median ${statistics.median(mids):,.0f}"
          f"   max ${max(mids):,.0f}")
    if per_sqm:
        print(f"$/m² (washable)   min ${min(per_sqm):.2f}   median ${statistics.median(per_sqm):.2f}"
              f"   max ${max(per_sqm):.2f}")

    conf = {}
    for r in good:
        conf[r["confidence"]] = conf.get(r["confidence"], 0) + 1
    print("Confidence   " + "   ".join(f"{k}: {v}" for k, v in sorted(conf.items())))

    print("\nBy service bundle:")
    by_bundle: dict[str, list[float]] = {}
    for r in good:
        by_bundle.setdefault(r["bundle"], []).append(r["mid"])
    for bundle, vals in sorted(by_bundle.items(), key=lambda x: -statistics.median(x[1])):
        print(f"  {bundle:<52} n={len(vals):<3} median ${statistics.median(vals):>7,.0f}")

    # Cheap sanity checks — these are the ones worth eyeballing.
    print("\nSanity checks:")
    below_min = [r for r in good if r["mid"] < 100]
    print(f"  quotes under $100 (suspicious):        {len(below_min)}")
    above_5k = [r for r in good if r["mid"] > 5000]
    print(f"  quotes over $5,000 (verify by hand):   {len(above_5k)}")
    inverted = [r for r in good if r["max"] < r["min"]]
    print(f"  inverted ranges (max < min) [BUG]:     {len(inverted)}")
    no_items = [r for r in good if r["line_items"] == 0]
    print(f"  quotes with no line items [BUG]:       {len(no_items)}")
    for r in below_min + above_5k + inverted + no_items:
        print(f"    -> #{r['index']} {r['bundle']} ${r['mid']:,.0f} ({r['washable']:.0f} m²)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--api", default="http://localhost:8000", help="Backend base URL")
    ap.add_argument("--count", type=int, default=10, help="How many quotes to generate")
    ap.add_argument("--seed", type=int, default=None, help="Seed for reproducible runs")
    ap.add_argument("--delay", type=float, default=1.0, help="Seconds between requests")
    ap.add_argument("--timeout", type=int, default=90, help="Per-request timeout")
    ap.add_argument("--out", default=None, help="Write results to this CSV")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print generated payloads without calling the API")
    args = ap.parse_args()

    rng = random.Random(args.seed)

    if args.dry_run:
        for i in range(args.count):
            case = build_case(rng, i + 1)
            meta = case.pop("_meta")
            print(f"\n--- #{meta['index']}  {meta['archetype']}  {meta['bundle']} ---")
            print(json.dumps(case, indent=2))
        return 0

    print(f"Generating {args.count} test quotes against {args.api}")
    print(f"Seed: {args.seed if args.seed is not None else '(random)'}\n")

    results = []
    for i in range(args.count):
        case = build_case(rng, i + 1)
        meta = case["_meta"]
        started = time.time()
        status, body = post_quote(args.api, case, args.timeout)
        elapsed = time.time() - started

        washable = sum(
            v for k, v in case["surfaces"].items() if k != "solar_panels"
        )
        row = {
            "index": meta["index"], "archetype": meta["archetype"], "bundle": meta["bundle"],
            "suburb": case["suburb"], "washable": washable,
            "soiling": case["soiling_level"], "storeys": case["storeys"],
            "water": case["water_access"], "status": status,
            "ok": False, "min": 0.0, "max": 0.0, "mid": 0.0, "per_sqm": 0.0,
            "confidence": "", "line_items": 0, "cached": False, "secs": round(elapsed, 1),
            "error": "",
        }

        if status == 200 and isinstance(body, dict) and "total_min" in body:
            row.update(
                ok=True,
                min=float(body["total_min"]),
                max=float(body["total_max"]),
                mid=(float(body["total_min"]) + float(body["total_max"])) / 2,
                confidence=body.get("confidence", ""),
                line_items=len(body.get("line_items", [])),
                cached=bool(body.get("from_cache")),
            )
            row["per_sqm"] = round(row["mid"] / washable, 2) if washable else 0.0
            flag = " (cached)" if row["cached"] else ""
            print(f"  #{row['index']:>3}  {row['archetype']:<10} {row['bundle'][:38]:<38} "
                  f"{washable:>6.0f}m²  ${row['mid']:>7,.0f}  {row['confidence']:<6} "
                  f"{row['secs']:>5.1f}s{flag}")
        else:
            detail = body.get("detail", body) if isinstance(body, dict) else body
            row["error"] = str(detail)[:200]
            print(f"  #{row['index']:>3}  {row['archetype']:<10} {row['bundle'][:38]:<38} "
                  f"FAILED {status}: {row['error'][:60]}")

        results.append(row)
        if args.delay and i < args.count - 1:
            time.sleep(args.delay)

    summarise(results)

    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(results[0].keys()))
            writer.writeheader()
            writer.writerows(results)
        print(f"\nWrote {len(results)} rows to {args.out}")

    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
