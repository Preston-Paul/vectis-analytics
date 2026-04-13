# Vectis Analytics — Backend

FastAPI backend for the Vectis Analytics energy-sector financial reporting and analytics platform.

## Tech Stack

- **FastAPI** — async web framework
- **SQLAlchemy 2.0 (async)** — ORM with aiosqlite for development (swap `DATABASE_URL` for PostgreSQL in production)
- **python-jose** — JWT authentication
- **passlib[bcrypt]** — password hashing
- **ReportLab** — PDF report generation
- **openpyxl** — Excel report generation

## Setup

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
.venv\Scripts\activate           # Windows
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum, set a strong SECRET_KEY
```

### 4. Run the development server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## API Overview

All routes are prefixed with `/api/v1`.

| Module       | Prefix                  | Description                              |
|--------------|-------------------------|------------------------------------------|
| Auth         | `/api/v1/auth`          | Register, login, current user            |
| Companies    | `/api/v1/companies`     | CRUD for client entities                 |
| Financials   | `/api/v1/financials`    | Periods, income statements, variance     |
| Commodity    | `/api/v1/commodity`     | Price feeds and watchlists               |
| Reports      | `/api/v1/reports`       | PDF and Excel report generation          |

## Switching to PostgreSQL

Set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/vectis
```

Then install the driver:

```bash
pip install asyncpg
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app entry point
│   ├── config.py         # Environment settings
│   ├── database.py       # Async SQLAlchemy engine & session
│   ├── auth/             # JWT authentication
│   ├── companies/        # Company CRUD
│   ├── financials/       # Core financial analytics
│   ├── commodity/        # Commodity price feeds
│   └── reports/          # PDF & Excel report generation
├── requirements.txt
├── .env.example
└── README.md
```
