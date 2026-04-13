from __future__ import annotations
"""SQLAlchemy ORM model for client companies."""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IndustrySegment(str, enum.Enum):
    """Energy industry segments supported by Vectis Analytics."""

    OIL_GAS = "OIL_GAS"
    MIDSTREAM = "MIDSTREAM"
    REFINING = "REFINING"
    TRADING = "TRADING"
    LOGISTICS = "LOGISTICS"
    OTHER = "OTHER"


class Company(Base):
    """A client entity owned by a Vectis Analytics user.

    Each user can track multiple companies. All financial data
    (periods, line items) is scoped to a company.
    """

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[IndustrySegment] = mapped_column(
        Enum(IndustrySegment), nullable=False, default=IndustrySegment.OTHER
    )
    revenue_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    financial_periods: Mapped[list] = relationship(
        "FinancialPeriod", back_populates="company", cascade="all, delete-orphan"
    )
