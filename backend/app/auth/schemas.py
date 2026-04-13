from __future__ import annotations
"""Pydantic schemas for auth request/response bodies."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for POST /auth/register."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    company_name: str | None = Field(default=None, max_length=255)


class UserLoginRequest(BaseModel):
    """Payload for POST /auth/login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token returned after successful authentication."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public user representation — never exposes hashed_password."""

    id: int
    email: str
    full_name: str
    company_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
