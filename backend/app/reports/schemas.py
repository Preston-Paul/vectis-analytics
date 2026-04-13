"""Pydantic schemas for the reports module."""

from pydantic import BaseModel


class ReportGeneratedResponse(BaseModel):
    """Metadata returned after a report is generated.

    The actual file is delivered as a FileResponse; this schema is used
    for error or metadata-only responses.
    """

    period_id: int
    format: str  # "pdf" or "excel"
    filename: str
