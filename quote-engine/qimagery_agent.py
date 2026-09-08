"""
Queensland Government aerial imagery — the primary image source.

Why this rather than Google Static Maps:

  * Sunshine Coast LGA is flown ANNUALLY under the State Imagery Program. The
    footprint register shows 2022, 2023, 2024 and 2025-06-06 captures over
    Caloundra, Buderim and Pelican Waters. Google's refresh over the same area
    is irregular and often years behind.
  * 10cm ground sample distance, against Google's typical 15-30cm here. At
    10cm a driveway edge, a paver joint and a solar panel are all resolvable,
    which is the difference between measuring a surface and guessing at it.
  * No API key, no per-request cost, no quota.

Staleness is the thing that actually breaks a quote: a slab poured last
spring is invisible in three-year-old imagery, and the customer is standing
in front of it. Annual capture does not eliminate that, but it shrinks the
window a lot.

Endpoints (public, "AllUsers", no token):
  imagery   spatial-img.information.qld.gov.au/.../LatestStateProgram_AllUsers
  footprint spatial-gis.information.qld.gov.au/.../ImageryFootprint

Coverage is Queensland only. Outside it, callers fall back to Google.
"""

from __future__ import annotations

import asyncio
import logging
import math
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

IMAGE_SERVER = (
    "https://spatial-img.information.qld.gov.au/arcgis/rest/services"
    "/Basemaps/LatestStateProgram_AllUsers/ImageServer"
)
FOOTPRINT_LAYER = (
    "https://spatial-gis.information.qld.gov.au/arcgis/rest/services"
    "/Imagery/ImageryFootprint/MapServer/3"
)

USER_AGENT = "WashBoysQuoteEngine/1.0 (+https://washboys.com.au)"

# Rough Queensland bounding box in WGS84. Cheap pre-check so we do not make a
# pointless request for a NSW address.
QLD_BOUNDS = {"min_lat": -29.5, "max_lat": -9.0, "min_lon": 137.9, "max_lon": 154.8}


@dataclass
class ImageryCapture:
    """What the register says about the newest imagery over a point."""

    project_name: str
    captured: Optional[date]
    resolution_m: Optional[float]

    @property
    def age_days(self) -> Optional[int]:
        if not self.captured:
            return None
        return (date.today() - self.captured).days

    def describe(self) -> str:
        if not self.captured:
            return f"{self.project_name} (capture date unknown)"
        age = self.age_days or 0
        res = f"{self.resolution_m * 100:.0f}cm" if self.resolution_m else "unknown"
        return (
            f"{self.captured.isoformat()} ({age // 30} months old), "
            f"{res} resolution, {self.project_name}"
        )


def in_queensland(lat: float, lon: float) -> bool:
    return (
        QLD_BOUNDS["min_lat"] <= lat <= QLD_BOUNDS["max_lat"]
        and QLD_BOUNDS["min_lon"] <= lon <= QLD_BOUNDS["max_lon"]
    )


def _to_web_mercator(lon: float, lat: float) -> tuple[float, float]:
    """WGS84 -> EPSG:3857, which is what the ImageServer expects."""
    x = lon * 20037508.34 / 180.0
    y = math.log(math.tan((90.0 + lat) * math.pi / 360.0)) / (math.pi / 180.0)
    return x, y * 20037508.34 / 180.0


def _bbox_for(lat: float, lon: float, half_metres: float) -> str:
    x, y = _to_web_mercator(lon, lat)
    # Web Mercator exaggerates distance away from the equator; correcting keeps
    # the requested box the size it claims to be on the ground.
    scale = 1.0 / math.cos(math.radians(lat))
    h = half_metres * scale
    return f"{x - h},{y - h},{x + h},{y + h}"


def _draw_boundary(
    image: bytes,
    polygon: list[tuple[float, float]],
    extent: tuple[float, float, float, float],
    size: int,
) -> bytes:
    """
    Outlines the parcel on the tile, in Web Mercator pixel space.

    Drawn rather than described, because a boundary in words is exactly the
    kind of instruction a vision model will apply loosely. A line on the image
    is not ambiguous.

    Returns the image untouched if Pillow is unavailable or the geometry is
    unusable - a tile with no outline still measures better than no tile.
    """
    if len(polygon) < 3:
        return image

    try:
        import io

        from PIL import Image, ImageDraw
    except ImportError:
        logger.warning("QImagery: Pillow not installed, boundary not drawn")
        return image

    x0, y0, x1, y1 = extent
    span_x, span_y = x1 - x0, y1 - y0
    if span_x <= 0 or span_y <= 0:
        return image

    points = []
    for lat, lon in polygon:
        mx, my = _to_web_mercator(lon, lat)
        # Mercator y grows north, image y grows down.
        points.append(
            ((mx - x0) / span_x * size, (y1 - my) / span_y * size)
        )

    try:
        img = Image.open(io.BytesIO(image)).convert("RGB")
        draw = ImageDraw.Draw(img)
        # Dark casing under a bright line, so the boundary reads over both pale
        # concrete and dark roofs.
        draw.line(points + [points[0]], fill=(0, 0, 0), width=7, joint="curve")
        draw.line(points + [points[0]], fill=(255, 40, 40), width=3, joint="curve")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=88)
        return out.getvalue()
    except Exception as exc:  # noqa: BLE001 - never lose the tile over an overlay
        logger.warning("QImagery: could not draw boundary: %s", exc)
        return image


class QImageryAgent:
    """Fetches aerial imagery and its capture date from Queensland's service."""

    def __init__(self, timeout: float = 25.0) -> None:
        self.timeout = timeout

    async def fetch_image(
        self,
        lat: float,
        lon: float,
        *,
        half_metres: float = 35.0,
        size: int = 900,
    ) -> Optional[bytes]:
        """
        A square of imagery centred on the property.

        `half_metres` is half the box width on the ground: 35 gives a ~70m view
        (one house and its driveway), 90 gives the block and its neighbours.
        """
        if not in_queensland(lat, lon):
            logger.info("QImagery: %.4f,%.4f is outside Queensland", lat, lon)
            return None

        params = {
            "bbox": _bbox_for(lat, lon, half_metres),
            "bboxSR": "3857",
            "imageSR": "3857",
            "size": f"{size},{size}",
            "format": "jpg",
            "f": "image",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{IMAGE_SERVER}/exportImage",
                    params=params,
                    headers={"User-Agent": USER_AGENT},
                )
            if resp.status_code != 200 or len(resp.content) < 2000:
                logger.warning(
                    "QImagery: export returned %s, %s bytes",
                    resp.status_code,
                    len(resp.content),
                )
                return None
            if not resp.headers.get("content-type", "").startswith("image/"):
                # ArcGIS reports errors as JSON with a 200.
                logger.warning("QImagery: expected an image, got %s", resp.text[:200])
                return None
            return resp.content
        except Exception as exc:  # noqa: BLE001 - imagery must never be fatal
            logger.warning("QImagery: image fetch failed: %s", exc)
            return None

    async def latest_capture(self, lat: float, lon: float) -> Optional[ImageryCapture]:
        """
        When the newest imagery over this point was flown.

        Worth knowing on every quote: it is what tells the reconciliation step
        how much to trust a measurement that disagrees with the customer.
        """
        if not in_queensland(lat, lon):
            return None

        # Deliberately no orderByFields/resultRecordCount. Combined with the
        # spatial filter the service returns them inconsistently - the same
        # query for Aroona gave two rows one minute and none the next. Pull the
        # candidates and pick the newest here, where the answer is stable.
        params = {
            "geometry": f"{lon},{lat}",
            "geometryType": "esriGeometryPoint",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "project_name,capture_start,resolution",
            "returnGeometry": "false",
            "f": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{FOOTPRINT_LAYER}/query",
                    params=params,
                    headers={"User-Agent": USER_AGENT},
                )
            features = resp.json().get("features") or []
            if not features:
                return None

            captures: list[ImageryCapture] = []
            for feature in features:
                attrs = feature.get("attributes") or {}
                raw = attrs.get("capture_start")
                captured: Optional[date] = None
                try:
                    if isinstance(raw, str) and raw:
                        captured = datetime.fromisoformat(raw[:10]).date()
                    elif isinstance(raw, (int, float)):
                        # ArcGIS also serves dates as epoch milliseconds.
                        captured = datetime.fromtimestamp(
                            raw / 1000, tz=timezone.utc
                        ).date()
                except (ValueError, OSError, OverflowError):
                    continue
                if captured:
                    captures.append(
                        ImageryCapture(
                            project_name=attrs.get("project_name") or "unknown",
                            captured=captured,
                            resolution_m=attrs.get("resolution"),
                        )
                    )

            if not captures:
                return None
            # Newest first; ties broken by the finer resolution.
            captures.sort(
                key=lambda c: (c.captured or date.min, -(c.resolution_m or 99)),
                reverse=True,
            )
            return captures[0]
        except Exception as exc:  # noqa: BLE001
            logger.warning("QImagery: footprint query failed: %s", exc)
            return None

    async def fetch_boundary_view(
        self,
        polygon: list[tuple[float, float]],
        bbox: tuple[float, float, float, float],
        *,
        size: int = 900,
        margin: float = 0.18,
    ) -> Optional[bytes]:
        """
        The lot, framed to its own boundary, with that boundary drawn on.

        Without this the vision model gets a fixed square of suburb and no way
        to tell which roof belongs to the customer - it measured a 392m2 roof on
        a 753m2 block by counting the neighbours. Framing to the cadastre bbox
        and outlining the parcel is what makes the measurement about one
        property.

        Previously this came from Google Static Maps, which put a second API
        key in the path of every quote. The parcel geometry is already ours
        from the DCDB and the imagery is already Queensland's, so the overlay
        can be drawn locally and neither needs a key.
        """
        min_lat, min_lon, max_lat, max_lon = bbox

        # Pad so the boundary is not flush against the frame, and square the
        # extent up - the ImageServer honours the aspect we ask for, and a
        # stretched image would corrupt every measurement taken from it.
        pad_lat = (max_lat - min_lat) * margin
        pad_lon = (max_lon - min_lon) * margin
        min_lat, max_lat = min_lat - pad_lat, max_lat + pad_lat
        min_lon, max_lon = min_lon - pad_lon, max_lon + pad_lon

        x0, y0 = _to_web_mercator(min_lon, min_lat)
        x1, y1 = _to_web_mercator(max_lon, max_lat)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        half = max(x1 - x0, y1 - y0) / 2
        x0, x1, y0, y1 = cx - half, cx + half, cy - half, cy + half

        params = {
            "bbox": f"{x0},{y0},{x1},{y1}",
            "bboxSR": "3857",
            "imageSR": "3857",
            "size": f"{size},{size}",
            "format": "jpg",
            "f": "image",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{IMAGE_SERVER}/exportImage",
                    params=params,
                    headers={"User-Agent": USER_AGENT},
                )
            if resp.status_code != 200 or not resp.headers.get(
                "content-type", ""
            ).startswith("image/"):
                logger.warning(
                    "QImagery: boundary view returned %s", resp.status_code
                )
                return None
            return _draw_boundary(resp.content, polygon, (x0, y0, x1, y1), size)
        except Exception as exc:  # noqa: BLE001 - imagery must never be fatal
            logger.warning("QImagery: boundary view failed: %s", exc)
            return None

    async def fetch_pair(
        self, lat: float, lon: float
    ) -> tuple[Optional[bytes], Optional[bytes], Optional[ImageryCapture]]:
        """
        Detail and context views plus the capture date, in one round trip -
        the same two-image shape the vision prompt already expects.
        """
        detail, wide, capture = await asyncio.gather(
            self.fetch_image(lat, lon, half_metres=35.0),
            self.fetch_image(lat, lon, half_metres=90.0),
            self.latest_capture(lat, lon),
        )
        return detail, wide, capture


qimagery_agent = QImageryAgent()
