from __future__ import annotations
"""Core financial analytics service.

Provides income statement generation, variance analysis, and trend aggregation
from raw line item data. All functions operate on data already loaded from the
database; callers are responsible for fetching ORM objects.
"""

from app.financials.models import FinancialPeriod, LineItem, LineItemCategory
from app.financials.schemas import (
    IncomeStatementResponse,
    IncomeStatementSection,
    LineItemResponse,
    TrendDataPoint,
    TrendsResponse,
    VarianceLineItem,
    VarianceResponse,
)


# ---------------------------------------------------------------------------
# Income Statement
# ---------------------------------------------------------------------------

def generate_income_statement(period: FinancialPeriod) -> IncomeStatementResponse:
    """Build a structured income statement from a period's line items.

    The income statement follows a standard waterfall layout::

        Revenue
        – Cost of Goods Sold (COGS)
        = Gross Profit
        – Operating Expenses (OPEX)
        = Operating Income (EBIT)
        +/– Other Income / Other Expense
        = Pre-Tax Income (EBT)
        – Tax
        = Net Income

    Args:
        period: A :class:`FinancialPeriod` ORM object with ``line_items``
            eagerly loaded.

    Returns:
        An :class:`IncomeStatementResponse` with all sections populated and
        subtotals computed.
    """
    def _section(category: LineItemCategory, label: str) -> IncomeStatementSection:
        items = [li for li in period.line_items if li.category == category]
        total = sum(li.amount for li in items)
        return IncomeStatementSection(
            label=label,
            line_items=[LineItemResponse.model_validate(li) for li in items],
            total=total,
        )

    revenue_section = _section(LineItemCategory.REVENUE, "Revenue")
    cogs_section = _section(LineItemCategory.COGS, "Cost of Goods Sold")
    opex_section = _section(LineItemCategory.OPEX, "Operating Expenses")
    other_income_section = _section(LineItemCategory.OTHER_INCOME, "Other Income")
    other_expense_section = _section(LineItemCategory.OTHER_EXPENSE, "Other Expense")
    tax_section = _section(LineItemCategory.TAX, "Income Tax Expense")

    gross_profit = revenue_section.total - cogs_section.total
    operating_income = gross_profit - opex_section.total
    pre_tax_income = (
        operating_income + other_income_section.total - other_expense_section.total
    )
    net_income = pre_tax_income - tax_section.total

    return IncomeStatementResponse(
        period_id=period.id,
        period_date=period.period_date,
        revenue=revenue_section,
        cogs=cogs_section,
        gross_profit=gross_profit,
        operating_expenses=opex_section,
        operating_income=operating_income,
        other_income=other_income_section,
        other_expense=other_expense_section,
        pre_tax_income=pre_tax_income,
        tax=tax_section,
        net_income=net_income,
    )


# ---------------------------------------------------------------------------
# Variance Analysis
# ---------------------------------------------------------------------------

def calculate_variance(period: FinancialPeriod) -> VarianceResponse:
    """Compute actual-vs-budget variance for each line item in a period.

    Variance dollar = actual – budget (positive = favorable for revenue,
    negative = unfavorable; sign interpretation depends on category).
    Variance percent = (variance_dollar / |budget|) × 100.

    Line items with no budget_amount have None for both variance fields.

    Args:
        period: A :class:`FinancialPeriod` ORM object with ``line_items``
            eagerly loaded.

    Returns:
        A :class:`VarianceResponse` with per-line-item variance details.
    """
    items: list[VarianceLineItem] = []

    for li in period.line_items:
        variance_dollar: float | None = None
        variance_pct: float | None = None

        if li.budget_amount is not None:
            variance_dollar = li.amount - li.budget_amount
            if li.budget_amount != 0:
                variance_pct = (variance_dollar / abs(li.budget_amount)) * 100.0
            else:
                variance_pct = None  # Cannot compute % when budget is zero

        items.append(
            VarianceLineItem(
                id=li.id,
                description=li.description,
                category=li.category,
                subcategory=li.subcategory,
                actual=li.amount,
                budget=li.budget_amount,
                variance_dollar=variance_dollar,
                variance_pct=variance_pct,
            )
        )

    return VarianceResponse(
        period_id=period.id,
        period_date=period.period_date,
        items=items,
    )


# ---------------------------------------------------------------------------
# Trend Analysis
# ---------------------------------------------------------------------------

def calculate_trends(company_id: int, periods: list[FinancialPeriod]) -> TrendsResponse:
    """Aggregate key financial metrics across all periods for trend charting.

    Periods are sorted chronologically (ascending period_date) so the
    resulting data points can be plotted directly on a time-series chart.

    Metrics computed per period:
    - Revenue (sum of REVENUE line items)
    - COGS (sum of COGS line items)
    - Gross Profit (Revenue – COGS)
    - OPEX (sum of OPEX line items)
    - Operating Income (Gross Profit – OPEX)
    - Net Income (full P&L waterfall)

    Args:
        company_id: The integer ID of the company being analysed.
        periods: All :class:`FinancialPeriod` objects for the company, with
            ``line_items`` eagerly loaded.

    Returns:
        A :class:`TrendsResponse` with one :class:`TrendDataPoint` per period.
    """
    sorted_periods = sorted(periods, key=lambda p: p.period_date)
    data_points: list[TrendDataPoint] = []

    for period in sorted_periods:
        def _sum(cat: LineItemCategory) -> float:
            return sum(li.amount for li in period.line_items if li.category == cat)

        revenue = _sum(LineItemCategory.REVENUE)
        cogs = _sum(LineItemCategory.COGS)
        gross_profit = revenue - cogs
        opex = _sum(LineItemCategory.OPEX)
        operating_income = gross_profit - opex
        other_income = _sum(LineItemCategory.OTHER_INCOME)
        other_expense = _sum(LineItemCategory.OTHER_EXPENSE)
        tax = _sum(LineItemCategory.TAX)
        net_income = operating_income + other_income - other_expense - tax

        data_points.append(
            TrendDataPoint(
                period_id=period.id,
                period_date=period.period_date,
                period_type=period.period_type,
                revenue=revenue,
                cogs=cogs,
                gross_profit=gross_profit,
                opex=opex,
                operating_income=operating_income,
                net_income=net_income,
            )
        )

    return TrendsResponse(company_id=company_id, data_points=data_points)
