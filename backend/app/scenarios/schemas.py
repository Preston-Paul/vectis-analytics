from __future__ import annotations
"""Pydantic schemas for scenario modeling."""

from datetime import datetime

from pydantic import BaseModel, Field


class ScenarioCreateRequest(BaseModel):
    period_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    revenue_change_pct: float = 0.0
    cogs_change_pct: float = 0.0
    opex_change_pct: float = 0.0
    other_income_change_pct: float = 0.0
    other_expense_change_pct: float = 0.0
    commodity_price_change_pct: float = 0.0


class ScenarioUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    revenue_change_pct: float | None = None
    cogs_change_pct: float | None = None
    opex_change_pct: float | None = None
    other_income_change_pct: float | None = None
    other_expense_change_pct: float | None = None
    commodity_price_change_pct: float | None = None


class ScenarioResponse(BaseModel):
    id: int
    company_id: int
    period_id: int
    name: str
    description: str | None
    revenue_change_pct: float
    cogs_change_pct: float
    opex_change_pct: float
    other_income_change_pct: float
    other_expense_change_pct: float
    commodity_price_change_pct: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ScenarioLineItem(BaseModel):
    """A single line in the scenario P&L output."""
    description: str
    category: str
    base_amount: float
    scenario_amount: float
    change: float
    change_pct: float | None


class ScenarioPnL(BaseModel):
    """Full projected P&L comparison: base vs. scenario."""
    scenario_id: int
    scenario_name: str
    period_id: int

    # Base totals
    base_revenue: float
    base_cogs: float
    base_gross_profit: float
    base_opex: float
    base_operating_income: float
    base_other_income: float
    base_other_expense: float
    base_pre_tax_income: float
    base_tax: float
    base_net_income: float

    # Scenario totals
    scenario_revenue: float
    scenario_cogs: float
    scenario_gross_profit: float
    scenario_opex: float
    scenario_operating_income: float
    scenario_other_income: float
    scenario_other_expense: float
    scenario_pre_tax_income: float
    scenario_tax: float
    scenario_net_income: float

    # Net income impact
    net_income_change: float
    net_income_change_pct: float | None

    # Line-level detail
    line_items: list[ScenarioLineItem]
