from __future__ import annotations
"""SQLAlchemy ORM models for the financials module."""

import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PeriodType(str, enum.Enum):
    """Granularity of a financial reporting period."""

    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"


class LineItemCategory(str, enum.Enum):
    """High-level P&L category for a line item."""

    REVENUE = "REVENUE"
    COGS = "COGS"
    OPEX = "OPEX"
    OTHER_INCOME = "OTHER_INCOME"
    OTHER_EXPENSE = "OTHER_EXPENSE"
    TAX = "TAX"


class FinancialPeriod(Base):
    """A discrete reporting period (e.g. January 2024, Q1 2024) for a company.

    All line items belong to a single period. Multiple periods per company
    enable trend analysis over time.
    """

    __tablename__ = "financial_periods"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_type: Mapped[PeriodType] = mapped_column(Enum(PeriodType), nullable=False)
    period_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="financial_periods")  # type: ignore[name-defined]
    line_items: Mapped[list["LineItem"]] = relationship(
        "LineItem", back_populates="financial_period", cascade="all, delete-orphan"
    )


class LineItem(Base):
    """A single P&L line item within a financial period.

    Stores both actual amount and optional budget amount, enabling variance
    analysis without a separate budget table.
    """

    __tablename__ = "line_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    financial_period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("financial_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[LineItemCategory] = mapped_column(Enum(LineItemCategory), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    budget_amount: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    financial_period: Mapped[FinancialPeriod] = relationship(
        "FinancialPeriod", back_populates="line_items"
    )
