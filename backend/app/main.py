"""Vectis Analytics — FastAPI application entry point.

Registers all routers under /api/v1, configures CORS for the Vite dev server,
and creates database tables on startup via the lifespan handler.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Routers — import after models so metadata is populated before table creation
from app.auth.router import router as auth_router
from app.companies.router import router as companies_router
from app.financials.router import router as financials_router
from app.commodity.router import router as commodity_router
from app.reports.router import router as reports_router
from app.scenarios.router import router as scenarios_router

# ---------------------------------------------------------------------------
# Lifespan handler
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Create database tables on startup; clean up on shutdown.

    In production, prefer running Alembic migrations instead of relying on
    ``create_all``. This is kept here for development convenience.
    """
    # Import all models so SQLAlchemy registers them before create_all
    import app.auth.models  # noqa: F401
    import app.companies.models  # noqa: F401
    import app.financials.models  # noqa: F401
    import app.commodity.models  # noqa: F401
    import app.scenarios.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    await engine.dispose()


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Vectis Analytics API",
    description=(
        "Energy-sector financial reporting and analytics platform. "
        "Provides income statement generation, variance analysis, "
        "trend reporting, and commodity price tracking."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server and production origins
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(companies_router, prefix=f"{API_PREFIX}/companies", tags=["Companies"])
app.include_router(financials_router, prefix=f"{API_PREFIX}/financials", tags=["Financials"])
app.include_router(commodity_router, prefix=f"{API_PREFIX}/commodity", tags=["Commodity"])
app.include_router(reports_router, prefix=f"{API_PREFIX}/reports", tags=["Reports"])
app.include_router(scenarios_router, prefix=f"{API_PREFIX}/scenarios", tags=["Scenarios"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok", "service": "vectis-analytics"}
