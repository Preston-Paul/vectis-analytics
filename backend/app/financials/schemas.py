from __future__ import annotations
"""Pydantic schemas for the financials module."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.financials.models import LineItemCategory, PeriodType


# ---------------------------------------------------------------------------
# Line item schemas
# ---------------------------------------------------------------------------

class LineItemCreateRequest(BaseModel):
    """A single line item to be created within a period."""

    category: LineItemCategory
    subcategory: str | None = Field(default=None, max_length=255)
    description: str = Field(..., min_length=1, max_length=500)
    amount: float
    budget_amount: float | None = None


class LineItemResponse(BaseModel):
    """Public representation of a line item."""

    id: int
    financial_period_id: int
    category: LineItemCategory
    subcategory: str | None
    description: str
    amount: float
    budget_amount: float | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Period schemas
# ---------------------------------------------------------------------------

class FinancialPeriodCreateRequest(BaseModel):
    """Payload for creating a period along with its line items."""

    period_type: PeriodType
    period_date: date
    line_items: list[LineItemCreateRequest] = Field(default_factory=list)


class FinancialPeriodResponse(BaseModel):
    """Public representation of a financial period."""

    id: int
    company_id: int
    period_type: PeriodType
    period_date: date
    created_at: datetime
    line_items: list[LineItemResponse] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Computed analytics schemas
# ---------------------------------------------------------------------------

class IncomeStatementSection(BaseModel):
    """A named section of the income statement with constituent line items."""

    label: str
    line_items: list[LineItemResponse]
    total: float


class IncomeStatementResponse(BaseModel):
    """A fully structured income statement derived from a period's line items."""

    period_id: int
    period_date: date
    revenue: IncomeStatementSection
    cogs: IncomeStatementSection
    gross_profit: float
    operating_expenses: IncomeStatementSection
    operating_income: float
    other_income: IncomeStatementSection
    other_expense: IncomeStatementSection
    pre_tax_income: float
    tax: IncomeStatementSection
    net_income: float


class VarianceLineItem(BaseModel):
    """Actual vs. budget variance for a single line item."""

    id: int
    description: str
    category: LineItemCategory
    subcategory: str | None
    actual: float
    budget: float | None
    variance_dollar: float | None
    variance_pct: float | None


class VarianceResponse(BaseModel):
    """Variance analysis for an entire period."""

    period_id: int
    period_date: date
    items: list[VarianceLineItem]


class TrendDataPoint(BaseModel):
    """Aggregated key metrics for a single period — used for trend charts."""

    period_id: int
    period_date: date
    period_type: PeriodType
    revenue: float
    cogs: float
    gross_profit: float
    opex: float
    operating_income: float
    net_income: float


class TrendsResponse(BaseModel):
    """Time-series trend data across all periods for a company."""

    company_id: int
    data_points: list[TrendDataPoint]
