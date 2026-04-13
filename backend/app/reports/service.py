"""Report generation service.

Produces formatted income statement reports as PDF (via ReportLab) and
Excel (via openpyxl) files. Files are written to a temporary path and
returned as FastAPI FileResponse objects.
"""

import io
import tempfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.financials.schemas import IncomeStatementResponse


# ---------------------------------------------------------------------------
# PDF Report
# ---------------------------------------------------------------------------

# Brand colours
VECTIS_NAVY = colors.HexColor("#0D1B2A")
VECTIS_TEAL = colors.HexColor("#00B4D8")
VECTIS_LIGHT_GREY = colors.HexColor("#F0F4F8")


def _fmt(value: float) -> str:
    """Format a float as a currency string with parentheses for negatives."""
    if value < 0:
        return f"({abs(value):,.0f})"
    return f"{value:,.0f}"


def generate_pdf_income_statement(
    statement: IncomeStatementResponse,
    company_name: str,
) -> Path:
    """Generate a PDF income statement and return the path to the temp file.

    The PDF uses a clean two-column layout (description | amount) with section
    headers and subtotal rows matching a standard P&L waterfall.

    Args:
        statement: A fully populated :class:`IncomeStatementResponse`.
        company_name: Display name of the company for the report header.

    Returns:
        A :class:`Path` pointing to a temporary PDF file. The caller is
        responsible for deleting the file after the response is sent.
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.close()
    output_path = Path(tmp.name)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "VectisTitle",
        parent=styles["Title"],
        textColor=VECTIS_NAVY,
        fontSize=18,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "VectisSubtitle",
        parent=styles["Normal"],
        textColor=colors.grey,
        fontSize=10,
        spaceAfter=12,
    )

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    # Table column widths
    col_widths = [4.5 * inch, 1.5 * inch]

    def _section_rows(section_label: str, section) -> list[list[str]]:
        rows = [[section_label, ""]]
        for li in section.line_items:
            label = li.description
            if li.subcategory:
                label = f"  {li.subcategory} — {li.description}"
            else:
                label = f"  {li.description}"
            rows.append([label, _fmt(li.amount)])
        return rows

    table_data: list[list] = []

    # Header
    table_data += _section_rows("Revenue", statement.revenue)
    table_data.append(["Total Revenue", _fmt(statement.revenue.total)])
    table_data.append(["", ""])

    table_data += _section_rows("Cost of Goods Sold", statement.cogs)
    table_data.append(["Total COGS", _fmt(statement.cogs.total)])
    table_data.append(["", ""])

    table_data.append(["GROSS PROFIT", _fmt(statement.gross_profit)])
    table_data.append(["", ""])

    table_data += _section_rows("Operating Expenses", statement.operating_expenses)
    table_data.append(["Total Operating Expenses", _fmt(statement.operating_expenses.total)])
    table_data.append(["", ""])

    table_data.append(["OPERATING INCOME (EBIT)", _fmt(statement.operating_income)])
    table_data.append(["", ""])

    if statement.other_income.line_items:
        table_data += _section_rows("Other Income", statement.other_income)
    if statement.other_expense.line_items:
        table_data += _section_rows("Other Expense", statement.other_expense)

    table_data.append(["PRE-TAX INCOME (EBT)", _fmt(statement.pre_tax_income)])
    table_data.append(["", ""])

    if statement.tax.line_items:
        table_data += _section_rows("Income Tax Expense", statement.tax)

    table_data.append(["NET INCOME", _fmt(statement.net_income)])

    table = Table(table_data, colWidths=col_widths)

    # Identify rows to bold (subtotals/totals)
    bold_keywords = {
        "Total Revenue", "Total COGS", "GROSS PROFIT",
        "Total Operating Expenses", "OPERATING INCOME (EBIT)",
        "PRE-TAX INCOME (EBT)", "NET INCOME",
    }
    bold_rows = [i for i, row in enumerate(table_data) if row[0] in bold_keywords]

    style_cmds = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEBELOW", (0, -1), (-1, -1), 1, VECTIS_NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]

    for row_idx in bold_rows:
        style_cmds.append(("FONT", (0, row_idx), (-1, row_idx), "Helvetica-Bold", 9))
        style_cmds.append(("LINEABOVE", (0, row_idx), (-1, row_idx), 0.5, colors.grey))
        if row_idx == len(table_data) - 1:  # NET INCOME — final row
            style_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), VECTIS_LIGHT_GREY))

    table.setStyle(TableStyle(style_cmds))

    # Section header rows styling (first cell in section, no amount)
    section_labels = {"Revenue", "Cost of Goods Sold", "Operating Expenses", "Other Income", "Other Expense", "Income Tax Expense"}
    for i, row in enumerate(table_data):
        if row[0] in section_labels:
            table.setStyle(TableStyle([
                ("FONT", (0, i), (-1, i), "Helvetica-Bold", 9),
                ("BACKGROUND", (0, i), (-1, i), VECTIS_NAVY),
                ("TEXTCOLOR", (0, i), (-1, i), colors.white),
            ]))

    story = [
        Paragraph("Vectis Analytics", title_style),
        Paragraph(
            f"{company_name} — Income Statement | Period: {statement.period_date.strftime('%B %Y')}",
            subtitle_style,
        ),
        Spacer(1, 0.15 * inch),
        table,
    ]

    doc.build(story)
    return output_path


# ---------------------------------------------------------------------------
# Excel Report
# ---------------------------------------------------------------------------

def generate_excel_income_statement(
    statement: IncomeStatementResponse,
    company_name: str,
) -> Path:
    """Generate an Excel income statement and return the path to the temp file.

    The workbook uses a single "Income Statement" sheet with branded header
    rows, section groupings, and number formatting.

    Args:
        statement: A fully populated :class:`IncomeStatementResponse`.
        company_name: Display name of the company for the report header.

    Returns:
        A :class:`Path` pointing to a temporary .xlsx file.
    """
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill, numbers
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Income Statement"

    # Column widths
    ws.column_dimensions["A"].width = 50
    ws.column_dimensions["B"].width = 18

    # Colour palette
    NAVY_HEX = "0D1B2A"
    TEAL_HEX = "00B4D8"
    LGREY_HEX = "F0F4F8"
    WHITE_HEX = "FFFFFF"

    navy_fill = PatternFill("solid", fgColor=NAVY_HEX)
    teal_fill = PatternFill("solid", fgColor=TEAL_HEX)
    lgrey_fill = PatternFill("solid", fgColor=LGREY_HEX)

    num_fmt = '#,##0.00_);(#,##0.00)'

    row = 1

    def _write(label: str, value=None, bold=False, fill=None, indent=0, is_header=False):
        nonlocal row
        label_cell = ws.cell(row=row, column=1, value=("  " * indent) + label)
        val_cell = ws.cell(row=row, column=2, value=value)

        font = Font(bold=bold or is_header, color=WHITE_HEX if is_header else "000000")
        label_cell.font = font
        val_cell.font = font
        val_cell.alignment = Alignment(horizontal="right")
        if value is not None:
            val_cell.number_format = num_fmt

        if fill:
            label_cell.fill = fill
            val_cell.fill = fill

        row += 1

    # Title rows
    ws.merge_cells("A1:B1")
    title_cell = ws.cell(row=1, column=1, value="Vectis Analytics — Income Statement")
    title_cell.font = Font(bold=True, size=14, color=WHITE_HEX)
    title_cell.fill = navy_fill
    ws.row_dimensions[1].height = 22
    row += 1

    ws.merge_cells("A2:B2")
    sub_cell = ws.cell(
        row=2,
        column=1,
        value=f"{company_name} | Period: {statement.period_date.strftime('%B %Y')}",
    )
    sub_cell.font = Font(italic=True, color=WHITE_HEX)
    sub_cell.fill = teal_fill
    row += 1

    row += 1  # blank spacer

    def _write_section(section_label: str, section, negate_display=False):
        _write(section_label, bold=True, fill=navy_fill, is_header=True)
        for li in section.line_items:
            display_label = li.description
            if li.subcategory:
                display_label = f"{li.subcategory} — {li.description}"
            val = -li.amount if negate_display else li.amount
            _write(display_label, value=val, indent=1)
        _write(f"Total {section_label}", value=section.total, bold=True, fill=lgrey_fill)
        _write("")  # spacer

    _write_section("Revenue", statement.revenue)
    _write_section("Cost of Goods Sold", statement.cogs)
    _write("GROSS PROFIT", value=statement.gross_profit, bold=True, fill=lgrey_fill)
    _write("")
    _write_section("Operating Expenses", statement.operating_expenses)
    _write("OPERATING INCOME (EBIT)", value=statement.operating_income, bold=True, fill=lgrey_fill)
    _write("")

    if statement.other_income.line_items:
        _write_section("Other Income", statement.other_income)
    if statement.other_expense.line_items:
        _write_section("Other Expense", statement.other_expense)

    _write("PRE-TAX INCOME (EBT)", value=statement.pre_tax_income, bold=True, fill=lgrey_fill)
    _write("")

    if statement.tax.line_items:
        _write_section("Income Tax Expense", statement.tax)

    _write("NET INCOME", value=statement.net_income, bold=True, fill=navy_fill, is_header=True)

    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    tmp.close()
    output_path = Path(tmp.name)
    wb.save(str(output_path))
    return output_path
