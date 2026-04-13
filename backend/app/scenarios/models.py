from __future__ import annotations
"""SQLAlchemy ORM models for scenario modeling."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Scenario(Base):
    """A named what-if scenario attached to a financial period.

    Users adjust revenue growth, cost change, and commodity price shift
    to see projected P&L impact vs. the base period.
    """

    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("financial_periods.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Assumption adjustments (percentage points, e.g. 10.0 = +10%)
    revenue_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cogs_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    opex_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    other_income_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    other_expense_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Commodity price shift (% change in WTI price assumption)
    commodity_price_change_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company")  # type: ignore[name-defined]
    period: Mapped["FinancialPeriod"] = relationship("FinancialPeriod")  # type: ignore[name-defined]
