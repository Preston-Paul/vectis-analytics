"""Commodity price service.

Fetches live energy commodity prices from the EIA (U.S. Energy Information
Administration) Open Data API v2.  Falls back to cached/stale values if the
API is unreachable so the app never returns a hard error for price data.

EIA API v2 reference:  https://api.eia.gov/v2/
Required env variable:  EIA_API_KEY
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.commodity.schemas import CommodityPriceResponse

logger = logging.getLogger(__name__)

EIA_API_KEY = os.getenv("EIA_API_KEY", "")
EIA_BASE_URL = "https://api.eia.gov/v2"

# ---------------------------------------------------------------------------
# Commodity definitions
# Each entry maps our internal symbol to the EIA endpoint + series ID +
# human-readable metadata.  `endpoint` is relative to EIA_BASE_URL.
# ---------------------------------------------------------------------------

_COMMODITY_CONFIG: list[dict] = [
    {
        "symbol": "WTI",
        "name": "WTI Crude Oil",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "RWTC",
        "frequency": "weekly",
    },
    {
        "symbol": "BRT",
        "name": "Brent Crude Oil",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "RBRTE",
        "frequency": "weekly",
    },
    {
        "symbol": "NG",
        "name": "Natural Gas (Henry Hub)",
        "endpoint": "/natural-gas/pri/fut/data/",
        "series": "RNGWHHD",
        "frequency": "monthly",
    },
    {
        "symbol": "RBOB",
        "name": "RBOB Gasoline",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "EER_EPMRR_PF4_Y05LA_DPG",
        "frequency": "weekly",
    },
    {
        "symbol": "HO",
        "name": "Heating Oil",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "RHF",
        "frequency": "weekly",
    },
    {
        "symbol": "SUL",
        "name": "Ultra-Low Sulfur Diesel",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "RHARD",
        "frequency": "weekly",
    },
    {
        "symbol": "ETH",
        "name": "Ethanol",
        "endpoint": "/petroleum/pri/spt/data/",
        "series": "RSEMT",
        "frequency": "weekly",
    },
    {
        "symbol": "LNG",
        "name": "Liquefied Natural Gas",
        "endpoint": "/natural-gas/pri/fut/data/",
        "series": "RNGC1",
        "frequency": "monthly",
    },
]


# ---------------------------------------------------------------------------
# In-memory cache so we don't hammer the EIA API on every page refresh.
# Prices are refreshed at most once every 15 minutes.
# ---------------------------------------------------------------------------

_cache: dict[str, CommodityPriceResponse] = {}
_cache_ts: Optional[datetime] = None
_CACHE_TTL_SECONDS = 900  # 15 minutes

# Fallback mock prices used when EIA is unreachable.
_FALLBACK: dict[str, dict] = {
    "WTI":  {"price": 78.42, "change_pct": -0.63},
    "BRT":  {"price": 82.15, "change_pct": -0.48},
    "NG":   {"price": 2.34, "change_pct": 1.20},
    "RBOB": {"price": 2.47, "change_pct": -0.82},
    "HO":   {"price": 2.73, "change_pct": 0.45},
    "SUL":  {"price": 2.85, "change_pct": 0.19},
    "ETH":  {"price": 1.72, "change_pct": -0.88},
    "LNG":  {"price": 9.35, "change_pct": 3.11},
}


async def _fetch_single(
    client: httpx.AsyncClient,
    cfg: dict,
) -> Optional[CommodityPriceResponse]:
    """Fetch the two most recent data points for one commodity.

    Returns a :class:`CommodityPriceResponse` with the latest price and
    the percent change from the prior period, or ``None`` on failure.
    """
    url = f"{EIA_BASE_URL}{cfg['endpoint']}"
    params = {
        "api_key": EIA_API_KEY,
        "frequency": cfg["frequency"],
        "data[0]": "value",
        "facets[series][]": cfg["series"],
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": "2",
    }
    try:
        resp = await client.get(url, params=params, timeout=10.0)
        resp.raise_for_status()
        rows = resp.json()["response"]["data"]
        if not rows:
            logger.warning("EIA returned no data for series %s", cfg["series"])
            return None

        latest_price = float(rows[0]["value"])
        prior_price = float(rows[1]["value"]) if len(rows) > 1 else latest_price
        change_pct = (
            ((latest_price - prior_price) / prior_price * 100)
            if prior_price != 0
            else 0.0
        )

        return CommodityPriceResponse(
            symbol=cfg["symbol"],
            name=cfg["name"],
            price=round(latest_price, 4),
            change_pct=round(change_pct, 2),
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("EIA fetch failed for %s: %s", cfg["symbol"], exc)
        return None


def _is_cache_fresh() -> bool:
    if _cache_ts is None:
        return False
    elapsed = (datetime.now(timezone.utc) - _cache_ts).total_seconds()
    return elapsed < _CACHE_TTL_SECONDS


async def get_live_prices() -> list[CommodityPriceResponse]:
    """Return current commodity prices, using EIA live data.

    Results are cached for 15 minutes.  If the EIA API is unavailable, the
    last known prices (or hardcoded fallbacks) are returned so the UI never
    breaks due to a network hiccup.
    """
    global _cache, _cache_ts  # noqa: PLW0603

    if _is_cache_fresh():
        return list(_cache.values())

    if not EIA_API_KEY:
        logger.warning("EIA_API_KEY not set — returning fallback prices")
        return _build_fallback()

    results: list[CommodityPriceResponse] = []
    async with httpx.AsyncClient() as client:
        for cfg in _COMMODITY_CONFIG:
            result = await _fetch_single(client, cfg)
            if result is not None:
                results.append(result)
            else:
                # Use stale cache entry or hardcoded fallback for this symbol
                fallback = _cache.get(cfg["symbol"]) or _build_fallback_for(cfg)
                results.append(fallback)

    # Update cache
    _cache = {r.symbol: r for r in results}
    _cache_ts = datetime.now(timezone.utc)
    return results


def _build_fallback_for(cfg: dict) -> CommodityPriceResponse:
    fb = _FALLBACK.get(cfg["symbol"], {"price": 0.0, "change_pct": 0.0})
    return CommodityPriceResponse(
        symbol=cfg["symbol"],
        name=cfg["name"],
        price=fb["price"],
        change_pct=fb["change_pct"],
        timestamp=datetime.now(timezone.utc),
    )


def _build_fallback() -> list[CommodityPriceResponse]:
    return [_build_fallback_for(cfg) for cfg in _COMMODITY_CONFIG]


# ---------------------------------------------------------------------------
# Legacy sync helpers kept for backward-compat (router still calls these
# during the transition period).  They return fallback data only.
# ---------------------------------------------------------------------------

def get_mock_prices() -> list[CommodityPriceResponse]:
    """Synchronous shim — returns cached live data if available, else fallback.

    Prefer calling ``get_live_prices()`` (async) from async endpoints.
    """
    if _cache:
        return list(_cache.values())
    return _build_fallback()


def get_price_for_symbol(symbol: str) -> Optional[CommodityPriceResponse]:
    """Return cached price for a specific symbol, or None if unknown."""
    if _cache:
        return _cache.get(symbol.upper())
    cfg = next((c for c in _COMMODITY_CONFIG if c["symbol"] == symbol.upper()), None)
    if cfg is None:
        return None
    return _build_fallback_for(cfg)
