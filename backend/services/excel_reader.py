from pathlib import Path

from openpyxl import load_workbook

from models.workbook import Workbook
from models.worksheet import Worksheet
from models.row import Row
from models.column import Column
from models.cell import Cell


def clean_header(header):
    if header is None:
        return ""

    return str(header).lower().strip().replace(" ", "_")


def load_workbook_model(path):

    wb = load_workbook(path)

    workbook = Workbook(
        file_name=Path(path).name,
        file_path=str(path)
    )

    for sheet_index, ws in enumerate(wb.worksheets):

        worksheet = Worksheet(
            name=ws.title,
            index=sheet_index
        )

        # Détection simple du header
        first_row = [cell.value for cell in ws[1]]

        worksheet.has_header = any(
            value is not None
            for value in first_row
        )

        # Création des colonnes
        for column_index in range(ws.max_column):

            if worksheet.has_header:

                header_name = clean_header(
                    first_row[column_index]
                )

                if header_name == "":
                    header_name = f"column_{column_index + 1}"

            else:

                header_name = f"column_{column_index + 1}"

            column = Column(
                name=header_name,
                index=column_index,
                letter=ws.cell(
                    row=1,
                    column=column_index + 1
                ).column_letter
            )

            if header_name == "id":
                column.set_primary_key(True)

            worksheet.add_column(column)

        # Début des données
        start_row = 2 if worksheet.has_header else 1

        # Création des lignes
        for row_index in range(start_row, ws.max_row + 1):

            row = Row(row_index)

            row_is_empty = True

            for column_index in range(1, ws.max_column + 1):

                excel_cell = ws.cell(
                    row=row_index,
                    column=column_index
                )

                value = excel_cell.value

                if value is not None and str(value).strip() != "":
                    row_is_empty = False

                formula = None

                if isinstance(value, str) and value.startswith("="):
                    formula = value

                cell = Cell(
                    value=value,
                    row_index=row_index,
                    column_index=column_index,
                    formula=formula
                )

                row.add_cell(cell)

            if not row_is_empty:
                worksheet.add_row(row)

        workbook.add_worksheet(worksheet)

    return workbook