"""
maps_agent.py — Satellite property analysis (Option 5: cadastre + satellite).

Pipeline:
  1. Geocode address → coordinates
  2. QLD DCDB → exact property boundary + legal block area (free, no key)
  3. Satellite image framed to exact cadastral boundary (red outline overlay)
  4. Claude classifies surface percentages — block area already known exactly
  
Result: measurements derived from legal survey data + visual classification,
not pixel-counting guesses.
"""

import os, base64, json, math, logging, asyncio
from dataclasses import dataclass, field
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import httpx, anthropic

from qimagery_agent import qimagery_agent, ImageryCapture
from cadastre_agent import cadastre_agent, CadastreResult, bbox_to_map_params

logger = logging.getLogger(__name__)


@dataclass
class SourceImage:
    """Image bytes plus where they came from, so the media type is never guessed."""

    data: bytes
    media_type: str
    provider: str


@dataclass
class Coordinates:
    lat: float
    lng: float
    formatted_address: str


@dataclass
class AreaAnalysis:
    lawn_sqm: float
    roof_sqm: float
    garden_sqm: float
    gutter_length_m: float
    gutter_length_confidence: float
    driveway_exposed_sqm: float
    driveway_covered_sqm: float
    overhang_detected: bool
    overhang_description: str
    lawn_confidence: float
    driveway_confidence: float
    roof_confidence: float
    garden_confidence: float
    overall_confidence: str
    image_quality: str
    analysis_notes: str
    terrain_detected: str
    zoom_level: int
    image_size: str
    cadastre_area_sqm: Optional[float] = None
    cadastre_lotplan: Optional[str] = None

    @property
    def driveway_sqm(self) -> float:
        return self.driveway_exposed_sqm + self.driveway_covered_sqm


@dataclass
class AgentResult:
    success: bool
    analysis: Optional[AreaAnalysis] = None
    error: Optional[str] = None
    fallback_used: bool = False


class MapsVisionAgent:

    IMAGE_SIZE = "640x640"
    IMAGE_FORMAT = "png"

    def __init__(self):
        self.claude = anthropic.Anthropic()

    @property
    def google_key(self):
        return os.environ.get("GOOGLE_MAPS_API_KEY")

    async def analyse(self, address: str) -> AgentResult:
        key = self.google_key
        if not key:
            logger.error("GOOGLE_MAPS_API_KEY not set")
            return AgentResult(success=False, error="GOOGLE_MAPS_API_KEY missing",
                               fallback_used=True, analysis=self._fallback_analysis())
        logger.info(f"Analysing: {address[:50]}")

        try:
            coords = await self._geocode(address)
            if not coords:
                return AgentResult(success=False, error=f"Cannot geocode: {address}",
                                   fallback_used=True, analysis=self._fallback_analysis())

            # Run cadastre lookup + default images concurrently
            cadastre_task = cadastre_agent.get_boundary(coords.lat, coords.lng)
            images_task   = self._fetch_images(coords.lat, coords.lng)
            cadastre_result, (tight_img, wide_img, capture) = await asyncio.gather(
                cadastre_task, images_task
            )

            # Re-frame the context view to the lot itself, with its boundary
            # drawn on. Without this the model measures a fixed square of
            # suburb and cannot tell which roof is the customer's.
            if cadastre_result:
                logger.info(f"Cadastre: {cadastre_result.lotplan} = {cadastre_result.area_sqm:.0f}m²")
                boundary_img = await qimagery_agent.fetch_boundary_view(
                    cadastre_result.polygon, cadastre_result.bbox
                )
                if boundary_img:
                    wide_img = SourceImage(boundary_img, "image/jpeg", "qimagery")
                else:
                    # Google draws the same overlay, on coarser imagery and
                    # behind a second API key. Only reached if QLD is down.
                    mp = bbox_to_map_params(cadastre_result.bbox)
                    fallback = await self._fetch_boundary_image(
                        mp["center_lat"], mp["center_lng"], mp["zoom"], cadastre_result
                    )
                    if fallback:
                        wide_img = SourceImage(fallback, "image/png", "google")

            if not tight_img:
                return AgentResult(success=False, error="Satellite fetch failed",
                                   fallback_used=True, analysis=self._fallback_analysis())

            analysis = await self._analyse_images(
                tight_img, wide_img, coords, cadastre_result, capture
            )
            logger.info(f"lawn={analysis.lawn_sqm:.0f}m² roof={analysis.roof_sqm:.0f}m² "
                        f"gutter={analysis.gutter_length_m:.1f}m conf={analysis.overall_confidence}")
            return AgentResult(success=True, analysis=analysis)

        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            return AgentResult(success=False, error=str(e),
                               fallback_used=True, analysis=self._fallback_analysis())

    async def _geocode(self, address: str) -> Optional[Coordinates]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": address, "region": "au",
                        "components": "country:AU", "key": self.google_key}
            )
            resp.raise_for_status()
            data = resp.json()
        if data.get("status") != "OK" or not data.get("results"):
            return None
        r = data["results"][0]
        loc = r["geometry"]["location"]
        return Coordinates(loc["lat"], loc["lng"], r.get("formatted_address", address))

    async def _fetch_images(self, lat, lng):
        """
        Queensland Government imagery first, Google as the fallback.

        QLD flies the Sunshine Coast annually at 10cm; Google's refresh here is
        irregular and coarser. Staleness is what actually breaks a quote - a
        slab poured last spring is invisible in three-year-old imagery - so the
        fresher source leads and its capture date is carried through to the
        prompt.

        Outside Queensland, or if the service is down, this falls through to
        Google unchanged.
        """
        detail, wide, capture = await qimagery_agent.fetch_pair(lat, lng)
        if detail:
            logger.info(
                "Imagery: QImagery %s",
                capture.describe() if capture else "(no capture record)",
            )
            return (
                SourceImage(detail, "image/jpeg", "qimagery"),
                SourceImage(wide, "image/jpeg", "qimagery") if wide else None,
                capture,
            )

        logger.info("Imagery: QImagery unavailable, falling back to Google")
        tight_bytes, wide_bytes = await self._fetch_google_images(lat, lng)
        return (
            SourceImage(tight_bytes, "image/png", "google") if tight_bytes else None,
            SourceImage(wide_bytes, "image/png", "google") if wide_bytes else None,
            None,
        )

    async def _fetch_google_images(self, lat, lng):
        async with httpx.AsyncClient(timeout=20.0) as client:
            t, w = await asyncio.gather(
                client.get("https://maps.googleapis.com/maps/api/staticmap", params={
                    "center": f"{lat},{lng}", "zoom": 19, "size": self.IMAGE_SIZE,
                    "maptype": "hybrid", "markers": f"color:red|size:small|{lat},{lng}",
                    "format": self.IMAGE_FORMAT, "key": self.google_key}),
                client.get("https://maps.googleapis.com/maps/api/staticmap", params={
                    "center": f"{lat},{lng}", "zoom": 17, "size": self.IMAGE_SIZE,
                    "maptype": "hybrid", "markers": f"color:red|size:small|{lat},{lng}",
                    "format": self.IMAGE_FORMAT, "key": self.google_key}),
            )
        return (
            t.content if t.status_code == 200 and len(t.content) > 1000 else None,
            w.content if w.status_code == 200 and len(w.content) > 1000 else None,
        )

    async def _fetch_boundary_image(self, clat, clng, zoom, cadastre: CadastreResult):
        poly = cadastre.polygon
        if len(poly) > 80:
            poly = poly[::len(poly)//80]
        path = "color:0xFF0000FF|weight:2|" + "|".join(f"{la:.6f},{ln:.6f}" for la, ln in poly)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://maps.googleapis.com/maps/api/staticmap",
                    params={"center": f"{clat},{clng}", "zoom": zoom,
                            "size": self.IMAGE_SIZE, "maptype": "hybrid",
                            "path": path,
                            "markers": f"color:red|size:small|{clat},{clng}",
                            "format": self.IMAGE_FORMAT, "key": self.google_key}
                )
            return resp.content if resp.status_code == 200 and len(resp.content) > 1000 else None
        except Exception as e:
            logger.warning(f"Boundary image failed: {e}")
            return None

    @staticmethod
    def _image_label(image: "SourceImage", capture: "ImageryCapture | None") -> str:
        """
        Tell the model what it is looking at and how old it is.

        Age matters to the reading: at 14 months a missing slab or extension is
        plausible, and the model should say so rather than measure confidently
        around something that may no longer be there.
        """
        if image.provider == "qimagery" and capture and capture.captured:
            months = (capture.age_days or 0) // 30
            res = f"{capture.resolution_m * 100:.0f}cm" if capture.resolution_m else "high"
            return (
                f"IMAGE 1 — DETAIL VIEW (~70x70m, {res} Queensland Government "
                f"aerial imagery, flown {capture.captured.isoformat()}, about "
                f"{months} months old). If anything looks like recent building "
                f"work, say so in your confidence notes: the ground may have "
                f"changed since this was captured."
            )
        if image.provider == "qimagery":
            return "IMAGE 1 — DETAIL VIEW (~70x70m, Queensland Government aerial imagery):"
        return "IMAGE 1 — DETAIL VIEW (zoom 19, ~40x40m, roof/driveway detail):"

    async def _analyse_images(self, tight, wide, coords, cadastre, capture=None):
        content = [
            {"type": "text", "text": self._image_label(tight, capture)},
            {"type": "image", "source": {"type": "base64", "media_type": tight.media_type,
                                          "data": base64.standard_b64encode(tight.data).decode()}},
        ]
        if wide:
            label = (f"IMAGE 2 — BOUNDARY VIEW (red outline = exact legal boundary, "
                     f"total block = {cadastre.area_sqm:.0f}m²):"
                     if cadastre
                     else ("IMAGE 2 — WIDE VIEW (~180x180m, same source as image 1):"
                           if wide.provider == "qimagery"
                           else "IMAGE 2 — WIDE VIEW (zoom 17, ~160x160m):"))
            content += [
                {"type": "text", "text": label},
                {"type": "image", "source": {"type": "base64", "media_type": wide.media_type,
                                              "data": base64.standard_b64encode(wide.data).decode()}},
            ]
        content.append({"type": "text",
                         "text": self._prompt(coords.lat, coords.lng, cadastre, wide is not None)})

        msg = self.claude.messages.create(
            model="claude-opus-4-5", max_tokens=1500,
            messages=[{"role": "user", "content": content}]
        )
        raw = msg.content[0].text
        logger.info(f"Vision response: {raw[:300]}")
        return self._parse(raw, cadastre)

    def _prompt(self, lat, lng, cadastre, has_wide):
        if cadastre:
            block = cadastre.area_sqm
            cadastre_block = f"""
CADASTRAL DATA (QLD Government land title — legally exact):
  Block area: {block:.0f} m²   Lot/Plan: {cadastre.lotplan}

YOUR TASK: Estimate the PERCENTAGE of the {block:.0f}m² block that is each surface type.
The system multiplies your percentages by {block:.0f} to get m².
This is far more accurate than guessing raw m² from pixels.
{"Image 2 shows a RED OUTLINE of the exact legal boundary — use it." if has_wide else ""}

Return these percentage fields: lawn_pct, roof_pct, driveway_exposed_pct, driveway_covered_pct, garden_pct
All should sum to ~100. Remaining % is paths/pool/other.
"""
            json_fields = (
                '"lawn_pct": <0-100>, "roof_pct": <0-100>, '
                '"driveway_exposed_pct": <0-100>, "driveway_covered_pct": <0-100>, "garden_pct": <0-100>,'
            )
        else:
            cadastre_block = "No cadastral data — estimate all areas from satellite images."
            json_fields = (
                '"lawn_sqm": <n>, "roof_sqm": <n>, '
                '"driveway_exposed_sqm": <n>, "driveway_covered_sqm": <n>, "garden_sqm": <n>,'
            )

        return f"""Property measurement expert. Coordinates: {lat:.5f}, {lng:.5f}
{cadastre_block}
Scale: zoom-19 image ≈ 40x40m | sedan = 4.5x1.8m | single carport = 6x3m | brick home width = 10-14m

Also measure:
  gutter_length_m — LINEAR METRES of main roof perimeter (trace every eave edge, sum all sides)
  overhang_detected — true/false: sealed surface under any roof structure?
  overhang_description — one sentence
  terrain_detected — flat/sloped/unknown

Confidence: 1.0=clear | 0.7=partial | 0.4=mostly hidden | 0.1=guess

Respond ONLY valid JSON:
{{
  {json_fields}
  "gutter_length_m": <n>,
  "gutter_length_confidence": <0-1>,
  "overhang_detected": <bool>,
  "overhang_description": "<str>",
  "lawn_confidence": <0-1>,
  "driveway_confidence": <0-1>,
  "roof_confidence": <0-1>,
  "garden_confidence": <0-1>,
  "overall_confidence": "high"|"medium"|"low",
  "image_quality": "clear"|"partial"|"obscured",
  "terrain_detected": "flat"|"sloped"|"unknown",
  "analysis_notes": "<2-3 sentences>"
}}"""

    def _parse(self, raw, cadastre):
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"): clean = clean[4:]
        clean = clean.strip()
        d = json.loads(clean)

        block = cadastre.area_sqm if cadastre else None

        if block and "lawn_pct" in d:
            lawn   = block * d.get("lawn_pct", 40) / 100
            roof   = block * d.get("roof_pct", 25) / 100
            dexp   = block * d.get("driveway_exposed_pct", 7) / 100
            dcov   = block * d.get("driveway_covered_pct", 0) / 100
            garden = block * d.get("garden_pct", 6) / 100
        else:
            lawn   = float(d.get("lawn_sqm", 200))
            roof   = float(d.get("roof_sqm", 150))
            dexp   = float(d.get("driveway_exposed_sqm", 40))
            dcov   = float(d.get("driveway_covered_sqm", 0))
            garden = float(d.get("garden_sqm", 30))

        gutter = float(d.get("gutter_length_m", round(4.5 * math.sqrt(max(roof, 1)), 1)))

        return AreaAnalysis(
            lawn_sqm=round(lawn, 1), roof_sqm=round(roof, 1), garden_sqm=round(garden, 1),
            gutter_length_m=gutter, gutter_length_confidence=float(d.get("gutter_length_confidence", 0.6)),
            driveway_exposed_sqm=round(dexp, 1), driveway_covered_sqm=round(dcov, 1),
            overhang_detected=bool(d.get("overhang_detected", False)),
            overhang_description=str(d.get("overhang_description", "No overhang detected.")),
            lawn_confidence=float(d.get("lawn_confidence", 0.6)),
            driveway_confidence=float(d.get("driveway_confidence", 0.6)),
            roof_confidence=float(d.get("roof_confidence", 0.6)),
            garden_confidence=float(d.get("garden_confidence", 0.6)),
            overall_confidence=d.get("overall_confidence", "medium"),
            image_quality=d.get("image_quality", "partial"),
            analysis_notes=d.get("analysis_notes", ""),
            terrain_detected=d.get("terrain_detected", "unknown"),
            zoom_level=19, image_size=self.IMAGE_SIZE,
            cadastre_area_sqm=block,
            cadastre_lotplan=cadastre.lotplan if cadastre else None,
        )

    def _fallback_analysis(self, suburb_profile=None):
        avg = 550.0
        if suburb_profile and getattr(suburb_profile, "avg_block_sqm", None):
            avg = suburb_profile.avg_block_sqm
        s = avg / 550.0
        roof = round(min(avg * 0.28, 220), 1)
        name = getattr(suburb_profile, "suburb", "this suburb") if suburb_profile else "this suburb"
        return AreaAnalysis(
            lawn_sqm=round(avg*0.45*s, 1), roof_sqm=roof, garden_sqm=round(avg*0.06*s, 1),
            gutter_length_m=round(4.2*math.sqrt(max(roof,1)),1), gutter_length_confidence=0.2,
            driveway_exposed_sqm=round(avg*0.08,1), driveway_covered_sqm=0.0,
            overhang_detected=False, overhang_description="Satellite unavailable.",
            lawn_confidence=0.2, driveway_confidence=0.2, roof_confidence=0.2, garden_confidence=0.2,
            overall_confidence="low", image_quality="obscured",
            analysis_notes=f"Using estimates for {name} (avg block ~{int(avg)}m²). Verify on-site.",
            terrain_detected="unknown", zoom_level=19, image_size=self.IMAGE_SIZE,
            cadastre_area_sqm=None, cadastre_lotplan=None,
        )


maps_agent = MapsVisionAgent()
