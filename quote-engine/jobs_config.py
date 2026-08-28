"""
jobs_config.py — Job definitions and pricing-prompt builder, tuned for a
pressure-washing business.

What changed and why
────────────────────
* The catalogue leads with washing work (driveway, house, roof, patio, deck,
  fence, gutter face, solar, sealing). The old landscaping jobs are retained
  under LEGACY_JOBS so existing quotes, bookings and DB rows keep resolving.
* Billing is per-surface. Each washing job names the surface key it prices, so
  a house wash bills wall area and a roof wash bills roof area — instead of
  every job being derived from lawn_sqm.
* Substrate drives cost. Exposed aggregate takes ~35% longer than plain
  concrete and sandstone can't take pressure at all, so the material multiplier
  is applied to the computed estimate and stated in the prompt.
* Site constraints are priced, not buried in free text. No tap on site, no
  power, two-storey height work, a narrow gate or a nearby waterway each carry
  an explicit surcharge line.

How the rates were set
──────────────────────
Rather than picking per-m² figures in isolation, each rate is derived from the
work actually involved:

    base_rate_per_sqm  =  TARGET_HOURLY[job]  /  THROUGHPUT[job]

THROUGHPUT is a realistic *quality-job* rate for an operator with professional
gear — a rotary surface cleaner for flatwork, a soft-wash setup for render and
roofs. It is deliberately lower than a surface cleaner's raw coverage, because a
quality job is not just the cleaner passing over the middle: it includes
pre-treatment, wand-detailing every edge and corner the cleaner cannot reach,
and a final rinse-down. Those steps are most of the difference between a job
that looks done and one that looks striped.

TARGET_HOURLY is the effective hourly the business needs from the job, covering
labour, chemicals, plant, travel amortisation and insurance. Height and chemical
load push it up: roof work carries fall risk, anchors and far more product than
a driveway does.

Because both tables live here, the price and the customer-facing on-site time
estimate stay consistent — they are computed from the same throughput figures.
(The frontend mirror is SURFACES[].throughput in src/lib/pressureWashing.ts.)

Large areas taper — see VOLUME_TIERS. Setup, hose runs and pack-down are fixed
costs, and a surface cleaner's per-m² cost genuinely falls once it is moving, so
charging a flat rate across a 300 m² job overprices it against the market.

⚠ RATES ARE A BUSINESS DECISION. These are typical South-East Queensland market
  rates for professional-quality work, cross-checked against the effective
  hourly each one implies — but they are not a quote from your books. Review
  them (and re-run seed_db.py) before going live. For reference, the old
  landscaping rates of ~$0.055/m² would have collapsed every washing job onto
  its minimum charge.
"""

from models import QuoteRequest


# ── Rate derivation inputs ────────────────────────────────────────────────────
# Quality-job throughput: surface-cleaner pass PLUS pre-treatment, wand edging
# and rinse-down. Keep in step with SURFACES[].throughput in the frontend.

THROUGHPUT = {          # m² per crew hour (lin m for gutter, panels for solar)
    "driveway_wash": 35,
    "patio_wash": 30,
    "pool_surround_wash": 26,
    "house_wash": 70,
    "roof_wash": 32,
    "deck_wash": 26,
    "fence_wash": 15,   # linear metres of fence per hour, not m2
    "gutter_face_wash": 30,
    "solar_panel_clean": 10,
    "concrete_sealing": 60,
}

TARGET_HOURLY = {       # effective AUD/hr the job must return
    "driveway_wash": 130,
    "patio_wash": 130,
    "pool_surround_wash": 130,
    "house_wash": 150,      # ladder work + mould treatment
    "roof_wash": 200,       # fall risk, anchors, heavy chemical load
    "deck_wash": 125,
    "fence_wash": 120,
    "gutter_face_wash": 140,  # worked at height
    "solar_panel_clean": 115,
    "concrete_sealing": 170,  # sealer material is the bulk of this one
}

# Volume tapering for area-based jobs: (upper bound in m², rate multiplier).
# Fixed setup is amortised and the surface cleaner is already moving, so the
# marginal m² genuinely costs less.
VOLUME_TIERS = [(75, 1.00), (150, 0.88), (float("inf"), 0.78)]


def tapered_quantity(qty: float) -> float:
    """Effective billable m² after volume tapering."""
    effective = 0.0
    remaining = qty
    lower = 0.0
    for upper, mult in VOLUME_TIERS:
        if remaining <= 0:
            break
        band = min(remaining, upper - lower)
        effective += band * mult
        remaining -= band
        lower = upper
    return effective


# ── Substrate multipliers ─────────────────────────────────────────────────────
# Mirrors MATERIALS in src/lib/pressureWashing.ts. Keep the two in step.

MATERIAL_EFFORT = {
    # Flatwork
    "concrete": (1.00, "high pressure"),
    "exposed_aggregate": (1.35, "medium pressure"),
    "pavers": (1.40, "medium pressure"),
    "stencil": (1.20, "low pressure"),
    "sandstone": (1.50, "low pressure"),
    "tile": (1.20, "medium pressure"),
    "asphalt": (1.30, "low pressure"),
    # Walls
    "render": (1.00, "soft wash"),
    "face_brick": (1.10, "medium pressure"),
    "weatherboard": (1.20, "soft wash"),
    "fibre_cement": (1.05, "soft wash"),
    "colorbond_wall": (0.90, "low pressure"),
    "vinyl": (1.00, "soft wash"),
    # Roofs
    "concrete_tile": (1.00, "soft wash"),
    "terracotta": (1.20, "soft wash"),
    "colorbond_roof": (0.85, "low pressure"),
    "asbestos": (1.60, "PROHIBITED - licensed low-pressure treatment only"),
    # Decks
    "hardwood": (1.00, "low pressure"),
    "softwood": (1.15, "low pressure"),
    "composite": (0.85, "low pressure"),
    # Fences
    "colorbond_fence": (0.85, "low pressure"),
    "timber_fence": (1.15, "low pressure"),
    "masonry_fence": (1.10, "medium pressure"),
    "glass_fence": (1.30, "low pressure"),
}

# Substrates that must never see high pressure — surfaced as a caveat.
RESTRICTED_MATERIALS = {"asbestos", "asphalt", "sandstone", "stencil"}


# ── Which surface each job bills ──────────────────────────────────────────────
# basis: "sqm" | "lin_m" | "count"

JOB_SURFACE_MAP = {
    "driveway_wash":     {"surface": "driveway_exposed_sqm", "basis": "sqm"},
    "patio_wash":        {"surface": "patio_sqm",            "basis": "sqm"},
    "pool_surround_wash":{"surface": "pool_surround_sqm",    "basis": "sqm"},
    "path_wash":         {"surface": "path_sqm",             "basis": "sqm"},
    "house_wash":        {"surface": "house_wall_sqm",       "basis": "sqm"},
    "roof_wash":         {"surface": "roof_sqm",             "basis": "sqm"},
    "deck_wash":         {"surface": "deck_sqm",             "basis": "sqm"},
    "fence_wash":        {"surface": "fence_lin_m",          "basis": "lin_m"},
    "gutter_face_wash":  {"surface": "gutter_face_m",        "basis": "lin_m"},
    "solar_panel_clean": {"surface": "solar_panels",         "basis": "count"},
    "concrete_sealing":  {"surface": "driveway_exposed_sqm", "basis": "sqm"},
    # Legacy ids kept pointing at sensible surfaces.
    "pressure_washing_driveway": {"surface": "driveway_exposed_sqm", "basis": "sqm"},
    "roof_cleaning":     {"surface": "roof_sqm",             "basis": "sqm"},
    "gutter_cleaning":   {"surface": "gutter_face_m",        "basis": "lin_m"},
}


# ── Pressure-washing catalogue ────────────────────────────────────────────────

WASHING_JOBS = {
    "driveway_wash": {
        "name": "Driveway & path washing",
        "description": "Rotary surface clean of driveway, paths and entry.",
        "unit": "m² of exposed sealed surface",
        "base_rate_per_sqm": 3.70,  # tracks driveway_wash  # $115/hr / 10 panels/hr  # $130/hr / 35 m²/hr
        "min_charge": 150,  # matches the "from" price printed on the Wash Boys flyer
        "condition_multiplier_range": (1.0, 1.9),
        "notes": "Priced on open-air area. Covered areas assessed separately.",
    },
    "patio_wash": {
        "name": "Patio & alfresco washing",
        "description": "Entertaining areas, courtyards and verandahs.",
        "unit": "m² of paved surface",
        "base_rate_per_sqm": 4.35,  # $130/hr / 30 m²/hr
        "min_charge": 99,  # matches the "from" price printed on the Wash Boys flyer
        "condition_multiplier_range": (1.0, 1.9),
        "notes": "Furniture moved and replaced. Paver joints may need re-sanding.",
    },
    "pool_surround_wash": {
        "name": "Pool surround washing",
        "description": "Coping, pavers and pool deck.",
        "unit": "m² of pool surround",
        "base_rate_per_sqm": 5.00,  # $130/hr / 26 m²/hr
        "min_charge": 180,
        "condition_multiplier_range": (1.0, 1.8),
        "notes": "Edge masked so detergent stays out of the pool.",
    },
    "house_wash": {
        "name": "House exterior soft wash",
        "description": "Low-pressure wash of walls, eaves and soffits with mould treatment.",
        "unit": "m² of wall area",
        "base_rate_per_sqm": 2.15,  # $150/hr / 70 m²/hr
        "min_charge": 250,  # matches the "from" price printed on the Wash Boys flyer
        "condition_multiplier_range": (1.0, 1.8),
        "notes": "Soft wash only — pressure would drive water behind cladding and render.",
    },
    "roof_wash": {
        "name": "Roof cleaning (soft wash)",
        "description": "Chemical soft wash that kills lichen at the root.",
        "unit": "m² of roof",
        "base_rate_per_sqm": 6.30,  # $200/hr / 32 m²/hr
        "min_charge": 450,
        "condition_multiplier_range": (1.0, 2.2),
        "notes": "Includes moss and lichen inhibitor. Keeps lightening for 2-3 weeks after.",
    },
    "deck_wash": {
        "name": "Timber deck wash",
        "description": "Low-pressure clean along the grain, brightener optional.",
        "unit": "m² of decking",
        "base_rate_per_sqm": 4.80,  # $125/hr / 26 m²/hr
        "min_charge": 160,
        "condition_multiplier_range": (1.0, 1.7),
        "notes": "Low pressure only — high pressure furs timber.",
    },
    "fence_wash": {
        "name": "Fence & retaining wall wash",
        "description": "Colorbond, timber or rendered boundary surfaces.",
        "unit": "linear metres of fence",
        "base_rate_per_sqm": 8.00,  # $120/hr / 15 lin m/hr
        "min_charge": 120,  # matches the "from" price printed on the Wash Boys flyer
        "condition_multiplier_range": (1.0, 1.7),
        "notes": "Priced by the metre, per side. Both sides doubles the length.",
    },
    "gutter_face_wash": {
        "name": "Gutter face whitening",
        "description": "Removes tiger-striping from gutter fronts and fascia.",
        "unit": "linear metres of gutter",
        "base_rate_per_sqm": 4.70,  # $140/hr / 30 lin m/hr
        "base_rate_per_m": 4.70,
        "min_charge": 120,
        "condition_multiplier_range": (1.0, 1.8),
        "notes": "Exterior only. Does not include clearing debris from inside the gutter.",
    },
    "solar_panel_clean": {
        "name": "Solar panel clean",
        "description": "Deionised rinse to restore output.",
        "unit": "panels",
        "base_rate_per_sqm": 11.50,  # $115/hr / 10 panels/hr
        "min_charge": 130,
        "condition_multiplier_range": (1.0, 1.5),
        "notes": "Deionised water only — no detergent, no abrasives.",
    },
    "concrete_sealing": {
        "name": "Concrete & paver sealing",
        "description": "Applied after washing — keeps the finish twice as long.",
        "unit": "m² of sealed surface",
        "base_rate_per_sqm": 9.00,  # $170/hr / 60 m²/hr + ~$6.20/m² sealer
        "min_charge": 280,
        "condition_multiplier_range": (1.0, 1.2),
        "notes": "Surface must be washed and fully dry first. Usually a second visit.",
    },
}

# Retained so historical quotes, bookings and DB rows still resolve.
LEGACY_JOBS = {
    "pressure_washing_driveway": {
        "name": "Pressure washing (driveway/patio)",
        "description": "High-pressure clean of exposed driveway and paths",
        "unit": "m² of exposed sealed surface",
        "base_rate_per_sqm": 3.70,  # tracks driveway_wash
        "min_charge": 180,
        "condition_multiplier_range": (1.0, 1.9),
        "notes": "Legacy id — superseded by driveway_wash.",
    },
    "roof_cleaning": {
        "name": "Roof cleaning",
        "description": "Soft-wash moss, lichen, and dirt from roof tiles",
        "unit": "m² of roof",
        "base_rate_per_sqm": 6.30,  # tracks roof_wash
        "min_charge": 450,
        "condition_multiplier_range": (1.0, 2.2),
        "notes": "Legacy id — superseded by roof_wash.",
    },
    "gutter_cleaning": {
        "name": "Gutter cleaning (debris clearing)",
        "description": "Clear and flush all gutters",
        "unit": "linear metres of gutter",
        "base_rate_per_m": 3.20,
        "base_rate_per_sqm": None,
        "min_charge": 120,
        "condition_multiplier_range": (1.0, 2.2),
        "notes": "Interior debris clearing — distinct from gutter face whitening.",
    },
    "lawn_mowing": {
        "name": "Lawn mowing",
        "description": "Standard ride-on or push mower service",
        "unit": "m² of lawn",
        "base_rate_per_sqm": 0.045,
        "min_charge": 80,
        "condition_multiplier_range": (1.0, 1.6),
        "notes": "Includes edging and blowing clippings off paths.",
    },
    "hedge_trimming": {
        "name": "Hedge trimming",
        "description": "Trim and shape hedges and shrubs",
        "unit": "m² of garden beds",
        "base_rate_per_sqm": 0.12,
        "min_charge": 90,
        "condition_multiplier_range": (1.0, 1.8),
        "notes": "Includes removal of clippings from site.",
    },
    "garden_tidy": {
        "name": "Garden tidy",
        "description": "Weed, mulch, and general garden bed cleanup",
        "unit": "m² of garden beds",
        "base_rate_per_sqm": 0.15,
        "min_charge": 100,
        "condition_multiplier_range": (1.0, 2.0),
        "notes": "Includes weed removal and light mulching.",
    },
}

JOBS_FALLBACK = {**WASHING_JOBS, **LEGACY_JOBS}


# ── Site surcharges ───────────────────────────────────────────────────────────
# Flat AUD adders described to the pricer. Tune to your cost base.

SITE_SURCHARGES = {
    "no_water": (
        90,
        "No tap on site — tanked water supply, limits run time between refills.",
    ),
    "no_power": (
        35,
        "No 240V outlet — petrol plant, extra fuel and noise management.",
    ),
    "narrow_access": (
        45,
        "Narrow gate — equipment hand-carried to the work area.",
    ),
    "no_access": (
        90,
        "No side access — hoses run through or around the dwelling.",
    ),
    "height_2": (
        120,
        "Two-storey height work — roof anchors or elevated platform.",
    ),
    "height_3": (
        260,
        "Three-storey or higher — EWP hire and a second operator.",
    ),
    "waterway_containment": (
        110,
        "Work near stormwater or a waterway — detergent capture and containment.",
    ),
    "pool_masking": (
        45,
        "Pool adjacent to the work area — edge masking and chemistry control.",
    ),
}


def _surface_qty(request: QuoteRequest, job_id: str) -> tuple[float, str]:
    """Billing quantity for a job, preferring the per-surface split."""
    mapping = JOB_SURFACE_MAP.get(job_id)
    if not mapping:
        return _get_relevant_area(job_id, request), "m²"

    key = mapping["surface"]
    basis = mapping["basis"]
    qty = float(request.surfaces.get(key, 0) or 0)

    # Fall back to the flat legacy fields when no per-surface data was sent.
    if qty <= 0:
        legacy = {
            "driveway_exposed_sqm": request.driveway_exposed_sqm,
            "roof_sqm": request.roof_sqm,
            "gutter_face_m": request.gutter_length_m,
        }
        qty = float(legacy.get(key, 0) or 0)

    unit = {"sqm": "m²", "lin_m": "lin m", "count": "panels"}[basis]
    return qty, unit


def _material_for(request: QuoteRequest, job_id: str) -> tuple[float, str, str]:
    """(effort multiplier, material id, safe technique) for a job's surface."""
    mapping = JOB_SURFACE_MAP.get(job_id)
    if not mapping:
        return 1.0, "", ""
    material_id = request.surface_materials.get(mapping["surface"], "")
    effort, technique = MATERIAL_EFFORT.get(material_id, (1.0, ""))
    return effort, material_id, technique


def _site_surcharges(request: QuoteRequest) -> list[tuple[str, int, str]]:
    """Applicable site surcharges as (key, amount, reason)."""
    out = []
    if request.water_access == "none":
        out.append(("no_water", *SITE_SURCHARGES["no_water"]))
    if request.power_access == "no":
        out.append(("no_power", *SITE_SURCHARGES["no_power"]))
    if request.side_access == "narrow":
        out.append(("narrow_access", *SITE_SURCHARGES["narrow_access"]))
    elif request.side_access == "none":
        out.append(("no_access", *SITE_SURCHARGES["no_access"]))
    if request.height_work_required:
        key = "height_3" if request.storeys >= 3 else "height_2"
        out.append((key, *SITE_SURCHARGES[key]))
    if "waterway" in request.runoff_sensitivity:
        out.append(("waterway_containment", *SITE_SURCHARGES["waterway_containment"]))
    if "pool" in request.runoff_sensitivity:
        out.append(("pool_masking", *SITE_SURCHARGES["pool_masking"]))
    return out


def build_pricing_prompt(request: QuoteRequest, job_rates: dict = None) -> str:
    """
    Builds the structured pricing prompt for Claude.

    Each washing job is priced on its own surface area, adjusted by substrate
    effort and condition, then site surcharges are listed separately so the
    model can see exactly what it is being asked to add.
    """
    use_db = job_rates is not None
    job_lines = []
    restricted_hits = []

    for job_id in request.job_ids:
        if use_db and job_id in job_rates:
            rate = job_rates[job_id]
            name, unit, min_charge = rate.name, rate.unit, rate.min_charge
            mult_min, mult_max = rate.condition_mult_min, rate.condition_mult_max
            notes = rate.notes
            base_rate_sqm = rate.base_rate_per_sqm
            base_rate_m = getattr(rate, "base_rate_per_m", None) or rate.base_rate_per_sqm
        else:
            job = JOBS_FALLBACK.get(job_id)
            if job is None:
                continue
            name, unit, min_charge = job["name"], job["unit"], job["min_charge"]
            mult_min, mult_max = job["condition_multiplier_range"]
            notes = job["notes"]
            base_rate_sqm = job.get("base_rate_per_sqm")
            base_rate_m = job.get("base_rate_per_m")

        condition_mult = mult_min + (mult_max - mult_min) * request.condition_score
        qty, qty_unit = _surface_qty(request, job_id)
        effort, material_id, technique = _material_for(request, job_id)

        basis = JOB_SURFACE_MAP.get(job_id, {}).get("basis", "sqm")
        rate = (base_rate_m or base_rate_sqm or 5.0) if basis == "lin_m" else (base_rate_sqm or 5.0)

        # Area jobs taper: fixed setup is amortised and the surface cleaner is
        # already running, so the marginal m² costs less than the first.
        if basis == "sqm":
            billable = tapered_quantity(qty)
            taper_line = (
                f"\n    Volume taper: {qty:.0f} m² bills as {billable:.0f} effective m²"
                if billable < qty - 0.5 else ""
            )
        else:
            billable = qty
            taper_line = ""

        base_cost = billable * rate
        estimated = max(base_cost * condition_mult * effort, min_charge)

        material_line = ""
        if material_id:
            material_line = (
                f"\n    Surface type: {material_id} "
                f"(effort x{effort:.2f}, safe technique: {technique or 'standard'})"
            )
            if material_id in RESTRICTED_MATERIALS:
                restricted_hits.append(f"{name}: {material_id} ({technique})")

        covered_note = ""
        if basis == "sqm" and job_id in ("driveway_wash", "pressure_washing_driveway"):
            covered = request.driveway_covered_sqm
            if covered > 0:
                covered_note = (
                    f"\n    Covered/sheltered hardstand: {covered:.0f} m² "
                    f"({request.overhang_description})"
                    f"\n    Sheltered areas stay cleaner but collect dust and cobwebs. "
                    f"If the customer wants them done, add roughly 60% of the open-air rate."
                )
            split = {k: v for k, v in request.surfaces.items()
                     if k in ("driveway_exposed_sqm", "path_sqm", "patio_sqm", "pool_surround_sqm")
                     and v}
            if split:
                pretty = ", ".join(f"{k.replace('_sqm', '')} {v:.0f} m²" for k, v in split.items())
                covered_note += f"\n    Open-air flatwork breakdown: {pretty}"

        job_lines.append(f"""
  Job: {name}
    Billing unit: {unit}
    Quantity: {qty:.0f} {qty_unit}
    Base rate: ${rate:.2f} per {qty_unit}
    Min charge: ${min_charge}
    Condition multiplier: {condition_mult:.2f}x (score: {request.condition_score}){material_line}{taper_line}
    Computed estimate: ${estimated:.0f}
    Notes: {notes}{covered_note}""")

    jobs_block = "\n".join(job_lines) if job_lines else "  (no recognised jobs)"

    # ── Condition detail ──────────────────────────────────────────────────────
    condition_lines = [f"Condition score: {request.condition_score}/1.0 (0=pristine, 1=severely neglected)"]
    if request.soiling_level:
        condition_lines.append(f"Customer-reported soiling: {request.soiling_level}")
    if request.contaminants:
        condition_lines.append(f"Contamination present: {', '.join(request.contaminants)}")
    if request.last_cleaned:
        condition_lines.append(f"Last cleaned: {request.last_cleaned}")
    if request.aspect:
        condition_lines.append(f"Sun/shade aspect: {request.aspect}")
    condition_lines.append(f"Condition context: {request.condition_context}")
    condition_block = "\n  ".join(condition_lines)

    # ── Site & modifiers ──────────────────────────────────────────────────────
    modifiers = []
    travel = {"A": "Travel zone A: within 10km (+$0)",
              "B": "Travel zone B: 10-25km (+$15 flat fee)",
              "C": "Travel zone C: 25km+ (+$30 flat fee)"}
    modifiers.append(travel.get(request.travel_zone, travel["A"]))
    modifiers.append(
        "Terrain: sloped — increases labour ~20%" if request.terrain == "sloped"
        else f"Terrain: {request.terrain}"
    )
    modifiers.append(f"Building height: {request.storeys} storey")
    modifiers.append(f"Water on site: {request.water_access}")
    modifiers.append(f"Power on site: {request.power_access}")
    modifiers.append(f"Side access: {request.side_access}")
    if request.runoff_sensitivity:
        modifiers.append(f"Runoff sensitivity: {', '.join(request.runoff_sensitivity)}")
    if request.estimated_minutes:
        modifiers.append(
            f"Client-side scope estimate: ~{request.estimated_minutes:.0f} minutes on site, "
            f"~{(request.estimated_water_litres or 0):.0f} L water (context only, not a price input)"
        )
    if request.access_notes:
        modifiers.append(f"Access notes: {request.access_notes}")
    modifiers_block = "\n  ".join(modifiers)

    surcharges = _site_surcharges(request)
    if surcharges:
        surcharge_block = "\n  ".join(f"+${amt} — {reason}" for _, amt, reason in surcharges)
        surcharge_total = sum(amt for _, amt, _ in surcharges)
        surcharge_block += f"\n  Total site surcharges: +${surcharge_total}"
    else:
        surcharge_block = "None — standard site with water, power and clear access."

    extras_block = ", ".join(request.extras) if request.extras else "None requested."

    frequency_note = {
        "once": "One-off visit — price at standard rate.",
        "annual": "Annual maintenance plan — apply a modest loyalty reduction (~5%).",
        "biannual": "Six-monthly maintenance plan — far less regrowth per visit, reduce ~12%.",
        "quarterly": "Quarterly maintenance plan — minimal soiling per visit, reduce ~18%.",
    }[request.service_frequency]

    restricted_block = (
        "\n".join(f"  - {r}" for r in restricted_hits)
        if restricted_hits else "  None."
    )

    prompt = f"""You are a pricing engine for a professional PRESSURE WASHING company in {request.suburb}, {request.state}, Australia.

Review the computed estimates below and return a realistic final price range.
Use your knowledge of Australian pressure-washing market rates to sanity-check each figure.

PROPERTY:
  Address: {request.address}, {request.suburb} {request.state}
  Exposed flatwork (open to sky, total): {request.driveway_exposed_sqm:.0f} m²
  Covered hardstand: {request.driveway_covered_sqm:.0f} m²
  Roof: {request.roof_sqm:.0f} m²
  Gutter run: {request.gutter_length_m:.1f} linear metres
  Per-surface detail: {request.surfaces or "not supplied"}
  Substrates: {request.surface_materials or "not supplied"}

SURFACE CONDITION:
  {condition_block}

SELECTED JOBS + ESTIMATES:
{jobs_block}

SITE MODIFIERS:
  {modifiers_block}

SITE SURCHARGES TO APPLY:
  {surcharge_block}

RESTRICTED SUBSTRATES (must not be high-pressure washed):
{restricted_block}

EXTRAS REQUESTED: {extras_block}
SERVICE FREQUENCY: {frequency_note}

INSTRUCTIONS:
1. Review each estimate. Adjust if your market knowledge suggests a different figure.
   These rates assume a professional operator with a rotary surface cleaner for
   flatwork and a soft-wash setup for render and roofs, and they already include
   pre-treatment, wand-detailing the edges a surface cleaner cannot reach, and a
   rinse-down. Do not price this as a budget hose-and-wand job.
   Typical SEQ rates: driveway/flatwork $3-6/m², house soft wash $2-4/m² of wall,
   roof soft wash $5-9/m², decking $4-7/m², gutter face $4-7/lin m.
   Where a "volume taper" line appears, large areas have already been discounted —
   do not discount them a second time.
2. Condition drives washing prices more than area. A severe lichen mat can take
   two passes and a chemical dwell — reflect that in the upper bound.
3. Apply the site surcharges listed above. They are real costs, not padding.
4. Apply a 5-10% multi-surface discount if 2+ jobs are selected (one setup, one visit).
5. Apply the service-frequency adjustment described above.
6. Widen the range when confidence is low (condition > 0.7, no substrate supplied,
   or measurements flagged as manual).
7. If a restricted substrate is listed, say plainly in `caveats` that it will be
   treated at low pressure or chemically, and that results differ from a
   high-pressure clean. For asbestos, state that a licensed treatment is required
   and that the job will be inspected before any work proceeds.
8. In `caveats`, set honest expectations: washing removes growth and grime, not
   age. Deep-set oil, tyre marks and etching from long-standing lichen may
   lighten rather than disappear.

Respond ONLY with valid JSON. No preamble, no markdown.

{{
  "total_min": <number>,
  "total_max": <number>,
  "currency": "AUD",
  "confidence": "high" | "medium" | "low",
  "multi_job_discount_applied": <boolean>,
  "line_items": [
    {{
      "job_id": "<id>",
      "job_name": "<name>",
      "min": <number>,
      "max": <number>,
      "notes": "<one sentence on what drives this price>"
    }}
  ],
  "summary": "<2-3 sentences for the customer>",
  "caveats": "<restricted substrates, access constraints, realistic expectations>"
}}"""

    return prompt


def _get_relevant_area(job_id: str, request: QuoteRequest) -> float:
    """
    Maps a job to its billing area. Prefers the per-surface breakdown and falls
    back to the flat legacy fields for older clients.
    """
    mapping = JOB_SURFACE_MAP.get(job_id)
    if mapping:
        qty = float(request.surfaces.get(mapping["surface"], 0) or 0)
        if qty > 0:
            return qty

    area_map = {
        "lawn_mowing": request.lawn_sqm,
        "hedge_trimming": request.garden_sqm,
        "garden_tidy": request.garden_sqm,
        "roof_cleaning": request.roof_sqm,
        "roof_wash": request.roof_sqm,
        "gutter_cleaning": request.gutter_length_m,
        "gutter_face_wash": request.gutter_length_m,
        "pressure_washing_driveway": request.driveway_exposed_sqm,
        "driveway_wash": request.driveway_exposed_sqm,
    }
    return area_map.get(job_id, request.driveway_exposed_sqm)
