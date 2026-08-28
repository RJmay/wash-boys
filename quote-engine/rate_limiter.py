"""
rate_limiter.py — Step 6: Simple IP-based rate limiting.

Prevents abuse of the quote endpoint (which calls Claude API per request).
Uses in-memory tracking — good enough for a single-server deployment.
For multi-server, swap to Redis (same pattern as quote_cache.py).

Limits:
  - /quote: 10 requests per IP per hour
  - /analyse-property: 5 requests per IP per hour (Maps API costs money)
  - /condition: 20 requests per IP per hour (cheap — Open-Meteo only)
"""

import os
import time
import logging
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    """Read a positive int from env, falling back to the default if unusable."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("%s=%r is not an integer — using default %s", name, raw, default)
        return default
    if value < 1:
        logger.warning("%s=%s must be >= 1 — using default %s", name, value, default)
        return default
    return value


class RateLimiter:
    """
    Sliding window rate limiter. Tracks request timestamps per IP per endpoint.
    Thread-safe for single-process uvicorn (not safe for multi-process without Redis).
    """

    def __init__(self):
        # {endpoint: {ip: [timestamp, ...]}}
        self._windows: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

        # Limits per endpoint: (max_requests, window_seconds).
        #
        # Overridable via env so a staging/test deployment can generate a batch
        # of test quotes without tripping the production ceiling. Defaults are
        # unchanged, so leaving these unset keeps the original behaviour.
        #   RATE_LIMIT_QUOTE, RATE_LIMIT_ANALYSE, RATE_LIMIT_CONDITION,
        #   RATE_LIMIT_DEFAULT, RATE_LIMIT_WINDOW_SEC
        window = _env_int("RATE_LIMIT_WINDOW_SEC", 3600)
        self._limits: dict[str, tuple[int, int]] = {
            "quote":            (_env_int("RATE_LIMIT_QUOTE", 10),     window),
            "analyse_property": (_env_int("RATE_LIMIT_ANALYSE", 5),    window),
            "condition":        (_env_int("RATE_LIMIT_CONDITION", 20), window),
            "default":          (_env_int("RATE_LIMIT_DEFAULT", 30),   window),
        }
        if self._limits["quote"][0] != 10:
            logger.warning(
                "Quote rate limit overridden to %s per %ss — intended for testing, "
                "not production.", self._limits["quote"][0], window,
            )

    def check(self, request: Request, endpoint: str = "default") -> None:
        """
        Check rate limit for the given IP + endpoint.
        Raises HTTP 429 if limit exceeded.
        Call this at the start of any endpoint you want to protect.
        """
        ip = self._get_ip(request)
        max_req, window_sec = self._limits.get(endpoint, self._limits["default"])

        now = time.time()
        cutoff = now - window_sec

        # Clean old entries
        timestamps = self._windows[endpoint][ip]
        timestamps[:] = [t for t in timestamps if t > cutoff]

        if len(timestamps) >= max_req:
            oldest = timestamps[0]
            retry_after = int(oldest + window_sec - now) + 1
            logger.warning(f"Rate limit hit: {ip} on {endpoint} ({len(timestamps)} reqs)")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Too many requests",
                    "message": f"You have exceeded {max_req} requests per hour for this endpoint.",
                    "retry_after_seconds": retry_after,
                }
            )

        timestamps.append(now)

    def remaining(self, request: Request, endpoint: str = "default") -> dict:
        """Return rate limit status for an IP without consuming a request."""
        ip = self._get_ip(request)
        max_req, window_sec = self._limits.get(endpoint, self._limits["default"])
        now = time.time()
        cutoff = now - window_sec
        timestamps = self._windows[endpoint][ip]
        recent = [t for t in timestamps if t > cutoff]
        return {
            "limit": max_req,
            "used": len(recent),
            "remaining": max(0, max_req - len(recent)),
            "window_seconds": window_sec,
        }

    def _get_ip(self, request: Request) -> str:
        """Extract client IP, respecting reverse proxy headers."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def cleanup(self):
        """Remove all expired entries. Call periodically to free memory."""
        now = time.time()
        for endpoint in list(self._windows.keys()):
            _, window_sec = self._limits.get(endpoint, self._limits["default"])
            cutoff = now - window_sec
            for ip in list(self._windows[endpoint].keys()):
                self._windows[endpoint][ip] = [
                    t for t in self._windows[endpoint][ip] if t > cutoff
                ]
                if not self._windows[endpoint][ip]:
                    del self._windows[endpoint][ip]


rate_limiter = RateLimiter()
