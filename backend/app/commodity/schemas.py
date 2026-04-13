"""Pydantic schemas for the commodity module."""

from datetime import datetime

from pydantic import BaseModel, Field


class CommodityPriceResponse(BaseModel):
    """Current price data for a single commodity."""

    symbol: str
    name: str
    price: float
    change_pct: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class WatchlistAddRequest(BaseModel):
    """Payload for adding a symbol to the user's watchlist."""

    symbol: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)


class WatchlistItemResponse(BaseModel):
    """A single watchlist entry."""

    id: int
    user_id: int
    symbol: str
    name: str

    model_config = {"from_attributes": True}
