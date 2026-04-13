"""Financials router — periods, income statements, variance, trends, and Excel import."""

import csv
import io
from typing import Any

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.companies.models import Company
from app.database import get_db
from app.financials.models import FinancialPeriod, LineItem, LineItemCategory, PeriodType
from app.financials.schemas import (
    FinancialPeriodCreateRequest,
    FinancialPeriodResponse,
    IncomeStatementResponse,
    TrendsResponse,
    VarianceResponse,
)
from app.financials.service import calculate_trends, calculate_variance, generate_income_statement

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_company_for_user(
    company_id: int,
    user: User,
    db: AsyncSession,
) -> Company:
    """Fetch a company and verify ownership; raise 404 otherwise."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None or company.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found.",
        )
    return company


async def _get_period_with_items(
    period_id: int,
    company_id: int,
    db: AsyncSession,
) -> FinancialPeriod:
    """Fetch a period with eagerly loaded line items; raise 404 if missing."""
    result = await db.execute(
        select(FinancialPeriod)
        .where(
            FinancialPeriod.id == period_id,
            FinancialPeriod.company_id == company_id,
        )
        .options(selectinload(FinancialPeriod.line_items))
    )
    period = result.scalar_one_or_none()
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial period {period_id} not found for company {company_id}.",
        )
    return period


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------

@router.post(
    "/{company_id}/periods",
    response_model=FinancialPeriodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a financial period with line items",
)
async def create_period(
    company_id: int,
    body: FinancialPeriodCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinancialPeriodResponse:
    """Create a new financial period and bulk-insert its line items.

    All line items are created atomically with the period. The endpoint
    accepts an arbitrary number of line items in a single request.
    """
    await _get_company_for_user(company_id, current_user, db)

    period = FinancialPeriod(
        company_id=company_id,
        period_type=body.period_type,
        period_date=body.period_date,
    )
    db.add(period)
    await db.flush()  # assigns period.id

    for item_data in body.line_items:
        db.add(
            LineItem(
                financial_period_id=period.id,
                category=item_data.category,
                subcategory=item_data.subcategory,
                description=item_data.description,
                amount=item_data.amount,
                budget_amount=item_data.budget_amount,
            )
        )

    await db.flush()

    # Reload with relationships for response
    period = await _get_period_with_items(period.id, company_id, db)
    return FinancialPeriodResponse.model_validate(period)


@router.get(
    "/{company_id}/periods",
    response_model=list[FinancialPeriodResponse],
    summary="List all financial periods for a company",
)
async def list_periods(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FinancialPeriodResponse]:
    """Return all periods for a company, ordered by period date ascending."""
    await _get_company_for_user(company_id, current_user, db)

    result = await db.execute(
        select(FinancialPeriod)
        .where(FinancialPeriod.company_id == company_id)
        .options(selectinload(FinancialPeriod.line_items))
        .order_by(FinancialPeriod.period_date)
    )
    periods = result.scalars().all()
    return [FinancialPeriodResponse.model_validate(p) for p in periods]


# ---------------------------------------------------------------------------
# Income Statement
# ---------------------------------------------------------------------------

@router.get(
    "/{company_id}/income-statement/{period_id}",
    response_model=IncomeStatementResponse,
    summary="Generate a structured income statement for a period",
)
async def get_income_statement(
    company_id: int,
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeStatementResponse:
    """Return a full P&L income statement computed from line items.

    Follows the standard waterfall: Revenue → Gross Profit → Operating Income
    → Pre-Tax Income → Net Income.
    """
    await _get_company_for_user(company_id, current_user, db)
    period = await _get_period_with_items(period_id, company_id, db)
    return generate_income_statement(period)


# ---------------------------------------------------------------------------
# Variance Analysis
# ---------------------------------------------------------------------------

@router.get(
    "/{company_id}/variance/{period_id}",
    response_model=VarianceResponse,
    summary="Compute actual vs. budget variance for a period",
)
async def get_variance(
    company_id: int,
    period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VarianceResponse:
    """Return per-line-item variance (dollar and percent) vs. budget.

    Line items without a budget_amount will have null variance fields.
    """
    await _get_company_for_user(company_id, current_user, db)
    period = await _get_period_with_items(period_id, company_id, db)
    return calculate_variance(period)


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------

@router.get(
    "/{company_id}/trends",
    response_model=TrendsResponse,
    summary="Return MoM trend data across all periods",
)
async def get_trends(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrendsResponse:
    """Aggregate key metrics (revenue, COGS, net income) across all periods.

    Results are sorted chronologically and suitable for plotting on a
    time-series chart.
    """
    await _get_company_for_user(company_id, current_user, db)

    result = await db.execute(
        select(FinancialPeriod)
        .where(FinancialPeriod.company_id == company_id)
        .options(selectinload(FinancialPeriod.line_items))
    )
    periods = result.scalars().all()
    return calculate_trends(company_id, list(periods))


# ---------------------------------------------------------------------------
# Excel Import
# ---------------------------------------------------------------------------

# Keyword maps for auto-detecting category from row labels in uploaded Excel
_CATEGORY_KEYWORDS: list[tuple[LineItemCategory, list[str]]] = [
    (LineItemCategory.REVENUE, ["revenue", "sales", "income from", "net sales", "gross revenue"]),
    (LineItemCategory.COGS, ["cost of goods", "cogs", "cost of sales", "cost of revenue"]),
    (LineItemCategory.OPEX, ["operating expense", "opex", "general", "selling", "administrative", "sg&a", "depreciation", "amortization", "rent", "salaries", "wages", "marketing"]),
    (LineItemCategory.OTHER_INCOME, ["other income", "interest income", "gain on", "other revenue"]),
    (LineItemCategory.OTHER_EXPENSE, ["other expense", "interest expense", "loss on", "financing cost"]),
    (LineItemCategory.TAX, ["tax", "income tax", "provision for tax"]),
]


def _detect_category(label: str) -> LineItemCategory:
    """Guess the P&L category from a row label string."""
    lower = label.lower().strip()
    for cat, keywords in _CATEGORY_KEYWORDS:
        for kw in keywords:
            if kw in lower:
                return cat
    return LineItemCategory.OPEX  # default fallback


def _safe_float(val: Any) -> float | None:
    """Convert a cell value to float, returning None if not numeric."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


# Keywords that indicate a row is a subtotal/header and should be skipped
_SKIP_LABELS = {
    "total", "subtotal", "gross total", "net total", "grand total",
    "total revenue", "total expenses", "total costs", "total income",
    "earnings", "ebitda", "ebit", "ebt", "subtotal:", "total:",
}
# Keywords that suggest a column header (not a data row)
_HEADER_KEYWORDS = {
    "actual", "budget", "amount", "value", "ytd", "mtd", "qtd",
    "line item", "description", "account", "category", "item",
    "forecast", "variance", "prior year", "py", "fy",
}


def _is_header_cell(val: Any) -> bool:
    if val is None:
        return False
    s = str(val).strip().lower()
    return any(kw in s for kw in _HEADER_KEYWORDS)


def _parse_rows_smart(rows: list[tuple]) -> list[LineItem]:
    """Flexible parser that handles any spreadsheet layout.

    Strategy:
    1. Find the first row that looks like a header (has at least one
       header-keyword cell AND at least one numeric-looking neighbour).
       If no header found, assume first row is data.
    2. For each data row, find the text label column (leftmost non-empty
       text cell) and the numeric columns.
    3. The first numeric column = actual amount; second numeric column
       (if present) = budget amount.
    4. Skip rows that are blank, pure separators, or whose label matches
       a known subtotal/total keyword.
    5. Category is auto-detected from the label text.
    """
    if not rows:
        return []

    # ------------------------------------------------------------------ #
    # Step 1 — find header row index
    # ------------------------------------------------------------------ #
    header_row_idx = None
    actual_col: int | None = None
    budget_col: int | None = None
    label_col: int | None = None

    for i, row in enumerate(rows):
        if not any(cell is not None for cell in row):
            continue
        header_cells = [(j, str(cell).strip().lower()) for j, cell in enumerate(row) if _is_header_cell(cell)]
        if len(header_cells) >= 1:
            # Found a likely header row — map columns
            header_row_idx = i
            for j, text in header_cells:
                if actual_col is None and any(kw in text for kw in ("actual", "amount", "value", "ytd", "mtd", "qtd", "fy")):
                    actual_col = j
                elif budget_col is None and any(kw in text for kw in ("budget", "forecast", "plan")):
                    budget_col = j
            # Label column: leftmost cell that is text (not a header keyword, not numeric)
            for j, cell in enumerate(row):
                if cell is not None and _safe_float(cell) is None and not _is_header_cell(cell):
                    label_col = j
                    break
            if label_col is None:
                label_col = 0
            break

    start_row = (header_row_idx + 1) if header_row_idx is not None else 0

    # ------------------------------------------------------------------ #
    # Step 2 — if column mapping incomplete, infer from data rows
    # ------------------------------------------------------------------ #
    # Scan first few data rows to find which columns have numeric values
    numeric_cols: list[int] = []
    for row in rows[start_row:start_row + 10]:
        if not row:
            continue
        for j, cell in enumerate(row):
            if _safe_float(cell) is not None and j not in numeric_cols:
                numeric_cols.append(j)
        if len(numeric_cols) >= 2:
            break

    numeric_cols.sort()

    if actual_col is None:
        actual_col = numeric_cols[0] if numeric_cols else 1
    if budget_col is None and len(numeric_cols) >= 2:
        budget_col = numeric_cols[1]

    # Label column: leftmost column that isn't one of the numeric cols
    if label_col is None:
        for j in range(max((actual_col or 0), (budget_col or 0)) + 2):
            if j not in numeric_cols:
                label_col = j
                break
        if label_col is None:
            label_col = 0

    # ------------------------------------------------------------------ #
    # Step 3 — extract line items
    # ------------------------------------------------------------------ #
    line_items: list[LineItem] = []

    for row in rows[start_row:]:
        if not row or not any(cell is not None for cell in row):
            continue

        # Get label
        label_raw = row[label_col] if label_col < len(row) else None
        label = str(label_raw).strip() if label_raw is not None else ""

        # Skip blank labels, numeric-only labels, separator rows
        if not label or label in ("", "None", "-", "—"):
            continue
        if label.lower().rstrip(":") in _SKIP_LABELS:
            continue
        # Skip rows where the label is itself a number (e.g. row numbers)
        if _safe_float(label) is not None:
            continue
        # Skip rows that look like headers repeated mid-sheet
        if _is_header_cell(label):
            continue

        # Get actual amount
        actual_raw = row[actual_col] if actual_col < len(row) else None
        actual = _safe_float(actual_raw)
        if actual is None:
            # Try scanning the whole row for the first numeric value
            for j, cell in enumerate(row):
                if j == label_col:
                    continue
                v = _safe_float(cell)
                if v is not None:
                    actual = v
                    break
        if actual is None:
            continue

        # Get budget amount
        budget: float | None = None
        if budget_col is not None and budget_col < len(row):
            budget = _safe_float(row[budget_col])
        # If no budget column found, try the next numeric column after actual
        if budget is None:
            for j, cell in enumerate(row):
                if j == label_col or j == actual_col:
                    continue
                v = _safe_float(cell)
                if v is not None:
                    budget = v
                    break

        category = _detect_category(label)
        line_items.append(LineItem(
            category=category,
            description=label,
            amount=actual,
            budget_amount=budget,
        ))

    return line_items


@router.post(
    "/{company_id}/import-excel",
    response_model=FinancialPeriodResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import a financial period from an Excel file",
)
async def import_excel(
    company_id: int,
    period_type: str = "MONTHLY",
    period_date: str = "2024-01-01",
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinancialPeriodResponse:
    """Parse an uploaded .xlsx file and create a financial period from it.

    Expected format: rows with (Label, Actual, Budget) columns.
    The first row may be a header and is skipped if non-numeric in col B.
    Category is auto-detected from the row label.
    Rows where Actual is blank/zero and label is empty are skipped.
    """
    await _get_company_for_user(company_id, current_user, db)

    # Validate period_type
    try:
        pt = PeriodType(period_type.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid period_type: {period_type}")

    # Validate period_date
    from datetime import date as date_type
    try:
        pd_parsed = date_type.fromisoformat(period_date)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid period_date: {period_date}")

    contents = await file.read()
    filename = (file.filename or '').lower()

    if filename.endswith('.csv'):
        # Parse CSV
        try:
            text = contents.decode('utf-8-sig')  # handles BOM from Excel CSV exports
            reader = csv.reader(io.StringIO(text))
            rows = [tuple(row) for row in reader]
        except Exception:
            raise HTTPException(status_code=422, detail="Could not parse CSV file.")
    else:
        # Parse XLSX
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
        except Exception:
            raise HTTPException(status_code=422, detail="Could not parse file. Make sure it is a valid .xlsx or .csv file.")
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))

    line_items: list[LineItem] = _parse_rows_smart(rows)

    if not line_items:
        raise HTTPException(
            status_code=422,
            detail="No valid line items found. The file should have row labels in one column and numeric amounts in another.",
        )

    # Create the period
    period = FinancialPeriod(
        company_id=company_id,
        period_type=pt,
        period_date=pd_parsed,
    )
    db.add(period)
    await db.flush()

    for li in line_items:
        li.financial_period_id = period.id
        db.add(li)

    await db.flush()
    period = await _get_period_with_items(period.id, company_id, db)
    return FinancialPeriodResponse.model_validate(period)
