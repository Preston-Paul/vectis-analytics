"""Auth router — register, login, and current-user endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.auth.service import create_access_token, hash_password, verify_password
from app.database import get_db

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Create a new user account and return a JWT access token.

    Raises:
        HTTPException 409: If the email address is already registered.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    print("DEBUG password repr:", repr(body.password))
    print("DEBUG password len:", len(body.password))
    print("DEBUG password type:", type(body.password))

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        company_name=body.company_name,
    )
    db.add(user)
    await db.flush()  # assigns user.id before commit
    await db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT token",
)
async def login(
    body: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Validate credentials and return a JWT access token.

    Raises:
        HTTPException 401: If the email/password combination is invalid.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return profile information for the authenticated user."""
    return UserResponse.model_validate(current_user)
