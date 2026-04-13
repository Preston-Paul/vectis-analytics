"""Companies router — full CRUD scoped to the authenticated user."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.companies.models import Company
from app.companies.schemas import CompanyCreateRequest, CompanyResponse, CompanyUpdateRequest
from app.database import get_db

router = APIRouter()


def _assert_ownership(company: Company | None, user: User, company_id: int) -> Company:
    """Raise 404 if the company does not exist or does not belong to the user."""
    if company is None or company.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found.",
        )
    return company


@router.get(
    "",
    response_model=list[CompanyResponse],
    summary="List all companies for the authenticated user",
)
async def list_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CompanyResponse]:
    """Return all companies owned by the current user."""
    result = await db.execute(
        select(Company).where(Company.user_id == current_user.id).order_by(Company.created_at)
    )
    companies = result.scalars().all()
    return [CompanyResponse.model_validate(c) for c in companies]


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new company",
)
async def create_company(
    body: CompanyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    """Create a new company owned by the current user."""
    company = Company(
        user_id=current_user.id,
        name=body.name,
        industry=body.industry,
        revenue_range=body.revenue_range,
        location=body.location,
    )
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Get a specific company by ID",
)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    """Return a single company, ensuring it belongs to the current user."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = _assert_ownership(result.scalar_one_or_none(), current_user, company_id)
    return CompanyResponse.model_validate(company)


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Update a company",
)
async def update_company(
    company_id: int,
    body: CompanyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    """Partially update a company's fields."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = _assert_ownership(result.scalar_one_or_none(), current_user, company_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    await db.flush()
    await db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a company",
)
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Permanently delete a company and all of its financial data."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = _assert_ownership(result.scalar_one_or_none(), current_user, company_id)
    await db.delete(company)
