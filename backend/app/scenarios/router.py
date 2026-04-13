from __future__ import annotations
"""Scenarios router — CRUD and P&L projection."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.companies.models import Company
from app.database import get_db
from app.financials.models import FinancialPeriod
from app.scenarios.models import Scenario
from app.scenarios.schemas import (
    ScenarioCreateRequest,
    ScenarioPnL,
    ScenarioResponse,
    ScenarioUpdateRequest,
)
from app.scenarios.service import project_scenario

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_company_for_user(company_id: int, user: User, db: AsyncSession) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None or company.user_id != user.id:
        raise HTTPException(status_code=404, detail=f"Company {company_id} not found.")
    return company


async def _get_period(period_id: int, company_id: int, db: AsyncSession) -> FinancialPeriod:
    result = await db.execute(
        select(FinancialPeriod)
        .where(FinancialPeriod.id == period_id, FinancialPeriod.company_id == company_id)
        .options(selectinload(FinancialPeriod.line_items))
    )
    period = result.scalar_one_or_none()
    if period is None:
        raise HTTPException(status_code=404, detail=f"Period {period_id} not found.")
    return period


async def _get_scenario(scenario_id: int, company_id: int, db: AsyncSession) -> Scenario:
    result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id, Scenario.company_id == company_id)
    )
    scenario = result.scalar_one_or_none()
    if scenario is None:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found.")
    return scenario


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.post(
    "/{company_id}/scenarios",
    response_model=ScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a scenario for a company period",
)
async def create_scenario(
    company_id: int,
    body: ScenarioCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    await _get_company_for_user(company_id, current_user, db)
    # Verify period belongs to this company
    await _get_period(body.period_id, company_id, db)

    scenario = Scenario(
        company_id=company_id,
        period_id=body.period_id,
        name=body.name,
        description=body.description,
        revenue_change_pct=body.revenue_change_pct,
        cogs_change_pct=body.cogs_change_pct,
        opex_change_pct=body.opex_change_pct,
        other_income_change_pct=body.other_income_change_pct,
        other_expense_change_pct=body.other_expense_change_pct,
        commodity_price_change_pct=body.commodity_price_change_pct,
    )
    db.add(scenario)
    await db.flush()
    await db.refresh(scenario)
    return ScenarioResponse.model_validate(scenario)


@router.get(
    "/{company_id}/scenarios",
    response_model=list[ScenarioResponse],
    summary="List all scenarios for a company",
)
async def list_scenarios(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScenarioResponse]:
    await _get_company_for_user(company_id, current_user, db)
    result = await db.execute(
        select(Scenario)
        .where(Scenario.company_id == company_id)
        .order_by(Scenario.created_at.desc())
    )
    scenarios = result.scalars().all()
    return [ScenarioResponse.model_validate(s) for s in scenarios]


@router.get(
    "/{company_id}/scenarios/{scenario_id}",
    response_model=ScenarioResponse,
    summary="Get a single scenario",
)
async def get_scenario(
    company_id: int,
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    await _get_company_for_user(company_id, current_user, db)
    scenario = await _get_scenario(scenario_id, company_id, db)
    return ScenarioResponse.model_validate(scenario)


@router.patch(
    "/{company_id}/scenarios/{scenario_id}",
    response_model=ScenarioResponse,
    summary="Update scenario assumptions",
)
async def update_scenario(
    company_id: int,
    scenario_id: int,
    body: ScenarioUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    await _get_company_for_user(company_id, current_user, db)
    scenario = await _get_scenario(scenario_id, company_id, db)

    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(scenario, field, value)

    await db.flush()
    await db.refresh(scenario)
    return ScenarioResponse.model_validate(scenario)


@router.delete(
    "/{company_id}/scenarios/{scenario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a scenario",
)
async def delete_scenario(
    company_id: int,
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await _get_company_for_user(company_id, current_user, db)
    scenario = await _get_scenario(scenario_id, company_id, db)
    await db.delete(scenario)
    await db.flush()


# ---------------------------------------------------------------------------
# Projection
# ---------------------------------------------------------------------------

@router.get(
    "/{company_id}/scenarios/{scenario_id}/projection",
    response_model=ScenarioPnL,
    summary="Run what-if P&L projection for a scenario",
)
async def get_projection(
    company_id: int,
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioPnL:
    await _get_company_for_user(company_id, current_user, db)
    scenario = await _get_scenario(scenario_id, company_id, db)
    period = await _get_period(scenario.period_id, company_id, db)
    return project_scenario(scenario, period)
