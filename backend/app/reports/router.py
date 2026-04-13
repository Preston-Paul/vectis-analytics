"""Reports router — PDF and Excel income statement generation."""

import os
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.companies.models import Company
from app.database import get_db
from app.financials.models import FinancialPeriod
from app.financials.service import generate_income_statement
from app.reports.service import generate_excel_income_statement, generate_pdf_income_statement

router = APIRouter()


async def _get_period_and_company(
    period_id: int,
    db: AsyncSession,
    current_user: User,
) -> tuple[FinancialPeriod, Company]:
    """Fetch a period (with line items) and verify the owning company belongs to the user.

    Args:
        period_id: The financial period to fetch.
        db: An async database session.
        current_user: The authenticated user.

    Returns:
        A tuple of (period, company).

    Raises:
        HTTPException 404: If the period or company is not found / not owned by the user.
    """
    period_result = await db.execute(
        select(FinancialPeriod)
        .where(FinancialPeriod.id == period_id)
        .options(selectinload(FinancialPeriod.line_items))
    )
    period = period_result.scalar_one_or_none()
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial period {period_id} not found.",
        )

    company_result = await db.execute(
        select(Company).where(Company.id == period.company_id)
    )
    company = company_result.scalar_one_or_none()
    if company is None or company.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial period {period_id} not found.",
        )

    return period, company


def _cleanup(path: Path) -> None:
    """Delete a temporary file after the response has been sent."""
    try:
        os.unlink(path)
    except OSError:
        pass


@router.post(
    "/income-statement/{period_id}/pdf",
    summary="Generate a PDF income statement for a financial period",
    response_class=FileResponse,
)
async def download_pdf_income_statement(
    period_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Generate and return a PDF income statement.

    The PDF is created synchronously in the request handler (acceptable for
    v1 volumes). For high-throughput scenarios, consider offloading to a
    background worker (e.g., Celery) and returning a presigned download URL.

    The temporary file is deleted after the response is delivered.
    """
    period, company = await _get_period_and_company(period_id, db, current_user)
    statement = generate_income_statement(period)

    pdf_path = generate_pdf_income_statement(statement, company.name)
    background_tasks.add_task(_cleanup, pdf_path)

    filename = f"vectis_income_statement_{company.name.replace(' ', '_')}_{period.period_date}.pdf"

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.post(
    "/income-statement/{period_id}/excel",
    summary="Generate an Excel income statement for a financial period",
    response_class=FileResponse,
)
async def download_excel_income_statement(
    period_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Generate and return an Excel (.xlsx) income statement.

    The workbook includes a branded header and formatted currency columns.
    The temporary file is deleted after the response is delivered.
    """
    period, company = await _get_period_and_company(period_id, db, current_user)
    statement = generate_income_statement(period)

    excel_path = generate_excel_income_statement(statement, company.name)
    background_tasks.add_task(_cleanup, excel_path)

    filename = f"vectis_income_statement_{company.name.replace(' ', '_')}_{period.period_date}.xlsx"

    return FileResponse(
        path=str(excel_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
