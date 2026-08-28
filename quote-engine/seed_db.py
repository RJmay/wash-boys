"""
seed_db.py — Create tables and populate initial data.

Run once after setting up your database:
  python seed_db.py

Safe to re-run — uses upsert logic so it won't duplicate data.
"""

import asyncio
import os
import sys

# The status lines below use non-ASCII glyphs. On a Windows console (cp1252)
# printing them raises UnicodeEncodeError, which crashes the seed — and because
# main._seed_if_empty() runs this via subprocess with check=True and swallows
# failures, the app would come up with an empty job catalogue and no clear cause.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from database import engine, Base, JobRate, SuburbProfile, AsyncSessionLocal
from jobs_config import WASHING_JOBS, LEGACY_JOBS


# ---------------------------------------------------------------------------
# Job rates — derived from the catalogue in jobs_config.py so the DB seed and
# the in-process fallback can never drift apart. Edit the rates THERE, then
# re-run this script to push them to the database.
#
# Washing services are seeded active. The legacy landscaping services are
# seeded INACTIVE: they disappear from GET /jobs (so customers are only offered
# washing work) while still resolving for historical quotes and bookings, since
# get_job_rates_by_ids() does not filter on `active`.
# ---------------------------------------------------------------------------

# Hidden from GET /jobs, but still resolvable for historical quotes/bookings.
HIDDEN_JOB_IDS = {
    # Landscaping work, retired from a pressure-washing menu.
    "lawn_mowing", "hedge_trimming", "garden_tidy",
    # Superseded by driveway_wash / roof_wash. Leaving these active would show
    # the customer two near-identical entries for the same job.
    "pressure_washing_driveway", "roof_cleaning",
    # NOTE: gutter_cleaning stays ACTIVE — clearing debris from inside the
    # gutter is a genuinely different service from gutter_face_wash, which
    # whitens the outside face.
}


def _to_rate_row(job_id: str, job: dict, active: bool) -> dict:
    mult_min, mult_max = job["condition_multiplier_range"]
    per_m = job.get("base_rate_per_m")
    per_sqm = job.get("base_rate_per_sqm")
    return {
        "job_id": job_id,
        "name": job["name"],
        "description": job["description"],
        "unit": job["unit"],
        # Column is NOT NULL — fall back to the per-metre rate for linear jobs.
        "base_rate_per_sqm": float(per_sqm if per_sqm is not None else (per_m or 0.0)),
        "base_rate_per_m": float(per_m) if per_m is not None else None,
        "min_charge": float(job["min_charge"]),
        "condition_mult_min": float(mult_min),
        "condition_mult_max": float(mult_max),
        "notes": job["notes"],
        "active": active,
    }


INITIAL_JOB_RATES = (
    [_to_rate_row(jid, job, True) for jid, job in WASHING_JOBS.items()]
    + [
        _to_rate_row(jid, job, jid not in HIDDEN_JOB_IDS)
        for jid, job in LEGACY_JOBS.items()
    ]
)


# ---------------------------------------------------------------------------
# Brisbane/SEQ suburb profiles
# Add suburbs relevant to your service area
# maintenance_tier: 1=prestige/easy, 3=average, 5=outer/large/neglected
# ---------------------------------------------------------------------------

INITIAL_SUBURB_PROFILES = [
    # Inner Brisbane — prestige, small blocks, well maintained
    {"suburb": "Paddington", "state": "QLD", "postcode": "4064", "avg_block_sqm": 400, "maintenance_tier": 1, "dominant_property_type": "house", "tree_density": "medium", "notes": "Character homes, well maintained gardens."},
    {"suburb": "New Farm", "state": "QLD", "postcode": "4005", "avg_block_sqm": 350, "maintenance_tier": 1, "dominant_property_type": "house", "tree_density": "medium", "notes": "High-income suburb, regularly serviced properties."},
    {"suburb": "Ascot", "state": "QLD", "postcode": "4007", "avg_block_sqm": 700, "maintenance_tier": 1, "dominant_property_type": "house", "tree_density": "high", "notes": "Large prestige blocks, high tree coverage, frequent gutter jobs."},
    {"suburb": "Bulimba", "state": "QLD", "postcode": "4171", "avg_block_sqm": 500, "maintenance_tier": 2, "dominant_property_type": "house", "tree_density": "medium", "notes": "Mix of character and new homes."},

    # Middle ring — average suburban
    {"suburb": "Calamvale", "state": "QLD", "postcode": "4116", "avg_block_sqm": 600, "maintenance_tier": 3, "dominant_property_type": "house", "tree_density": "medium", "notes": "Standard suburban blocks, mix of maintenance levels."},
    {"suburb": "Sunnybank Hills", "state": "QLD", "postcode": "4109", "avg_block_sqm": 650, "maintenance_tier": 3, "dominant_property_type": "house", "tree_density": "medium", "notes": "Large multicultural community, varied property upkeep."},
    {"suburb": "Chermside", "state": "QLD", "postcode": "4032", "avg_block_sqm": 550, "maintenance_tier": 3, "dominant_property_type": "house", "tree_density": "low", "notes": "Mixed residential, some rental properties."},
    {"suburb": "Mount Gravatt", "state": "QLD", "postcode": "4122", "avg_block_sqm": 600, "maintenance_tier": 3, "dominant_property_type": "house", "tree_density": "medium", "notes": "Hilly terrain common — flag as sloped for mowing jobs."},

    # Outer ring — larger blocks, more variation
    {"suburb": "Springwood", "state": "QLD", "postcode": "4127", "avg_block_sqm": 700, "maintenance_tier": 4, "dominant_property_type": "house", "tree_density": "high", "notes": "Large blocks, near bushland, high leaf/gutter demand."},
    {"suburb": "Ormeau", "state": "QLD", "postcode": "4208", "avg_block_sqm": 800, "maintenance_tier": 4, "dominant_property_type": "house", "tree_density": "medium", "notes": "New estates and established homes, growing area."},
    {"suburb": "Narangba", "state": "QLD", "postcode": "4504", "avg_block_sqm": 750, "maintenance_tier": 4, "dominant_property_type": "house", "tree_density": "medium", "notes": "Outer northern suburbs, families, larger lawns."},

    # Acreage / rural fringe
    {"suburb": "Samford Valley", "state": "QLD", "postcode": "4520", "avg_block_sqm": 8000, "maintenance_tier": 5, "dominant_property_type": "acreage", "tree_density": "high", "notes": "Large rural blocks, significant travel, high difficulty multiplier."},
    {"suburb": "Dayboro", "state": "QLD", "postcode": "4521", "avg_block_sqm": 10000, "maintenance_tier": 5, "dominant_property_type": "acreage", "tree_density": "high", "notes": "Remote rural, long travel times, quote individually."},
]


async def create_tables():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Tables created (or already exist)")


async def seed_job_rates():
    """Upsert job rates — updates existing records, inserts new ones."""
    async with AsyncSessionLocal() as session:
        for rate_data in INITIAL_JOB_RATES:
            # Dialect-aware upsert. This previously used the Postgres-only
            # insert unconditionally, so on the SQLite fallback (which is what
            # you get whenever DATABASE_URL is unset) seeding raised, the
            # exception was swallowed by main._seed_if_empty(), and the app came
            # up with an EMPTY job catalogue — /jobs returned nothing and every
            # /quote failed with "Unknown job type(s)".
            insert = sqlite_insert if engine.dialect.name == "sqlite" else pg_insert
            stmt = insert(JobRate).values(**rate_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=["job_id"],
                set_={
                    "name": stmt.excluded.name,
                    # description/unit/base_rate_per_m were previously left out of
                    # the update, so re-seeding silently kept stale billing units
                    # (e.g. gutter cleaning stuck on "m² of roof").
                    "description": stmt.excluded.description,
                    "unit": stmt.excluded.unit,
                    "base_rate_per_sqm": stmt.excluded.base_rate_per_sqm,
                    "base_rate_per_m": stmt.excluded.base_rate_per_m,
                    "min_charge": stmt.excluded.min_charge,
                    "condition_mult_min": stmt.excluded.condition_mult_min,
                    "condition_mult_max": stmt.excluded.condition_mult_max,
                    "notes": stmt.excluded.notes,
                    "active": stmt.excluded.active,
                }
            )
            await session.execute(stmt)
        await session.commit()
    print(f"✓ Seeded {len(INITIAL_JOB_RATES)} job rates")


async def seed_suburb_profiles():
    """Upsert suburb profiles — safe to re-run."""
    async with AsyncSessionLocal() as session:
        for profile_data in INITIAL_SUBURB_PROFILES:
            # Check if exists first (no unique constraint on suburb+state combination by default)
            result = await session.execute(
                text("SELECT id FROM suburb_profiles WHERE suburb = :suburb AND state = :state"),
                {"suburb": profile_data["suburb"], "state": profile_data["state"]}
            )
            existing = result.fetchone()
            if existing:
                await session.execute(
                    text("""
                        UPDATE suburb_profiles
                        SET avg_block_sqm = :avg_block_sqm,
                            maintenance_tier = :maintenance_tier,
                            tree_density = :tree_density,
                            notes = :notes
                        WHERE suburb = :suburb AND state = :state
                    """),
                    profile_data
                )
            else:
                obj = SuburbProfile(**profile_data)
                session.add(obj)
        await session.commit()
    print(f"✓ Seeded {len(INITIAL_SUBURB_PROFILES)} suburb profiles")


async def main():
    print("\nSetting up landscaping quote database...\n")
    await create_tables()
    await seed_job_rates()
    await seed_suburb_profiles()
    print("\n✓ Database setup complete. You're ready to run the API.\n")


if __name__ == "__main__":
    asyncio.run(main())
