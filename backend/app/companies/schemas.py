from __future__ import annotations
"""Pydantic schemas for the companies module."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.companies.models import IndustrySegment


class CompanyCreateRequest(BaseModel):
    """Payload for creating a new company."""

    name: str = Field(..., min_length=1, max_length=255)
    industry: IndustrySegment = IndustrySegment.OTHER
    revenue_range: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=255)


class CompanyUpdateRequest(BaseModel):
    """Payload for updating an existing company (all fields optional)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: IndustrySegment | None = None
    revenue_range: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=255)


class CompanyResponse(BaseModel):
    """Public representation of a company."""

    id: int
    user_id: int
    name: str
    industry: IndustrySegment
    revenue_range: str | None
    location: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
