"""Commodity router — price feeds and per-user watchlists."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.commodity.models import Watchlist
from app.commodity.schemas import (
    CommodityPriceResponse,
    WatchlistAddRequest,
    WatchlistItemResponse,
)
from app.commodity.service import get_live_prices
from app.database import get_db

router = APIRouter()


@router.get(
    "/prices",
    response_model=list[CommodityPriceResponse],
    summary="Get current commodity prices",
)
async def get_prices(
    current_user: User = Depends(get_current_user),
) -> list[CommodityPriceResponse]:
    """Return current prices for all tracked energy commodities.

    Prices are sourced live from the EIA Open Data API v2 (cached 15 min).
    Covers WTI, Brent, Henry Hub, and RBOB Gasoline.
    """
    return await get_live_prices()


@router.get(
    "/watchlist",
    response_model=list[WatchlistItemResponse],
    summary="Get the authenticated user's commodity watchlist",
)
async def get_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WatchlistItemResponse]:
    """Return all watchlist entries belonging to the current user."""
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.symbol)
    )
    items = result.scalars().all()
    return [WatchlistItemResponse.model_validate(item) for item in items]


@router.post(
    "/watchlist",
    response_model=WatchlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a commodity symbol to the watchlist",
)
async def add_to_watchlist(
    body: WatchlistAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WatchlistItemResponse:
    """Add a commodity symbol to the current user's watchlist.

    Raises:
        HTTPException 409: If the symbol is already on the user's watchlist.
    """
    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.symbol == body.symbol.upper(),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Symbol '{body.symbol}' is already on your watchlist.",
        )

    item = Watchlist(
        user_id=current_user.id,
        symbol=body.symbol.upper(),
        name=body.name,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return WatchlistItemResponse.model_validate(item)


@router.delete(
    "/watchlist/{watchlist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a symbol from the watchlist",
)
async def remove_from_watchlist(
    watchlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove a watchlist entry owned by the current user."""
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist entry {watchlist_id} not found.",
        )
    await db.delete(item)
