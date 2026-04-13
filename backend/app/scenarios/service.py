from __future__ import annotations
"""Scenario P&L projection service."""

from app.financials.models import FinancialPeriod, LineItemCategory
from app.scenarios.models import Scenario
from app.scenarios.schemas import ScenarioLineItem, ScenarioPnL


def _sum_category(period: FinancialPeriod, cat: LineItemCategory) -> float:
    return sum(li.amount for li in period.line_items if li.category == cat)


def project_scenario(scenario: Scenario, period: FinancialPeriod) -> ScenarioPnL:
    """Apply scenario assumptions to a period's line items and return a full
    base vs. projected P&L comparison.

    Each category is multiplied by (1 + change_pct / 100). Tax is kept flat
    (not adjusted) since tax modeling is out of scope for MVP.
    """
    base_revenue = _sum_category(period, LineItemCategory.REVENUE)
    base_cogs = _sum_category(period, LineItemCategory.COGS)
    base_opex = _sum_category(period, LineItemCategory.OPEX)
    base_other_income = _sum_category(period, LineItemCategory.OTHER_INCOME)
    base_other_expense = _sum_category(period, LineItemCategory.OTHER_EXPENSE)
    base_tax = _sum_category(period, LineItemCategory.TAX)

    base_gross_profit = base_revenue - base_cogs
    base_operating_income = base_gross_profit - base_opex
    base_pre_tax_income = base_operating_income + base_other_income - base_other_expense
    base_net_income = base_pre_tax_income - base_tax

    def _apply(base: float, pct: float) -> float:
        return base * (1 + pct / 100.0)

    scen_revenue = _apply(base_revenue, scenario.revenue_change_pct)
    scen_cogs = _apply(base_cogs, scenario.cogs_change_pct)
    scen_opex = _apply(base_opex, scenario.opex_change_pct)
    scen_other_income = _apply(base_other_income, scenario.other_income_change_pct)
    scen_other_expense = _apply(base_other_expense, scenario.other_expense_change_pct)
    scen_tax = base_tax  # tax held flat

    scen_gross_profit = scen_revenue - scen_cogs
    scen_operating_income = scen_gross_profit - scen_opex
    scen_pre_tax_income = scen_operating_income + scen_other_income - scen_other_expense
    scen_net_income = scen_pre_tax_income - scen_tax

    ni_change = scen_net_income - base_net_income
    ni_change_pct = (ni_change / abs(base_net_income) * 100.0) if base_net_income != 0 else None

    def _line(desc: str, cat: str, base: float, scen: float) -> ScenarioLineItem:
        change = scen - base
        change_pct = (change / abs(base) * 100.0) if base != 0 else None
        return ScenarioLineItem(
            description=desc,
            category=cat,
            base_amount=base,
            scenario_amount=scen,
            change=change,
            change_pct=change_pct,
        )

    line_items = [
        _line("Revenue", "REVENUE", base_revenue, scen_revenue),
        _line("Cost of Goods Sold", "COGS", base_cogs, scen_cogs),
        _line("Gross Profit", "SUBTOTAL", base_gross_profit, scen_gross_profit),
        _line("Operating Expenses", "OPEX", base_opex, scen_opex),
        _line("Operating Income", "SUBTOTAL", base_operating_income, scen_operating_income),
        _line("Other Income", "OTHER_INCOME", base_other_income, scen_other_income),
        _line("Other Expense", "OTHER_EXPENSE", base_other_expense, scen_other_expense),
        _line("Pre-Tax Income", "SUBTOTAL", base_pre_tax_income, scen_pre_tax_income),
        _line("Income Tax", "TAX", base_tax, scen_tax),
        _line("Net Income", "SUBTOTAL", base_net_income, scen_net_income),
    ]

    return ScenarioPnL(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        period_id=period.id,
        base_revenue=base_revenue,
        base_cogs=base_cogs,
        base_gross_profit=base_gross_profit,
        base_opex=base_opex,
        base_operating_income=base_operating_income,
        base_other_income=base_other_income,
        base_other_expense=base_other_expense,
        base_pre_tax_income=base_pre_tax_income,
        base_tax=base_tax,
        base_net_income=base_net_income,
        scenario_revenue=scen_revenue,
        scenario_cogs=scen_cogs,
        scenario_gross_profit=scen_gross_profit,
        scenario_opex=scen_opex,
        scenario_operating_income=scen_operating_income,
        scenario_other_income=scen_other_income,
        scenario_other_expense=scen_other_expense,
        scenario_pre_tax_income=scen_pre_tax_income,
        scenario_tax=scen_tax,
        scenario_net_income=scen_net_income,
        net_income_change=ni_change,
        net_income_change_pct=ni_change_pct,
        line_items=line_items,
    )
