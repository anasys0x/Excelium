from pathlib import Path
from datetime import datetime

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from models.workbook import Workbook
from models.worksheet import Worksheet
from models.table import Table
from models.row import Row
from models.column import Column
from models.cell import Cell
from errors import ExcelReadError


# ─── Constantes ───────────────────────────────────────────────────────────────

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
    "%Y/%m/%d", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S",
]


# ─── Utilitaires ──────────────────────────────────────────────────────────────

def clean_header(value):
    if value is None:
        return ""
    return str(value).lower().strip().replace(" ", "_")


def looks_like_number(value):
    try:
        float(str(value).replace(",", "."))
        return True
    except ValueError:
        return False


def looks_like_date(value):
    for fmt in DATE_FORMATS:
        try:
            datetime.strptime(str(value).strip(), fmt)
            return True
        except ValueError:
            pass
    return False


def is_row_empty(ws, row_index, max_col):
    return all(
        ws.cell(row=row_index, column=col).value is None
        or str(ws.cell(row=row_index, column=col).value).strip() == ""
        for col in range(1, max_col + 1)
    )


# ─── Détection de header ──────────────────────────────────────────────────────

def detect_has_header(first_row_values, data_rows_values):
    non_empty = [
        v for v in first_row_values
        if v is not None and str(v).strip() != ""
    ]

    if not non_empty:
        return False

    # Critère 1 : toutes les valeurs non-vides sont des strings
    if not all(isinstance(v, str) for v in non_empty):
        return False

    # Critère 2 : valeurs uniques
    if len(non_empty) != len(set(v.strip().lower() for v in non_empty)):
        return False

    # Critère 3 : aucune ne ressemble à un nombre ou une date
    if any(looks_like_number(v) or looks_like_date(v) for v in non_empty):
        return False

    if not data_rows_values:
        return True

    data_values = [
        v for row in data_rows_values
        for v in row
        if v is not None and str(v).strip() != ""
    ]

    # Critère 4 : contraste de types avec les données suivantes
    if any(not isinstance(v, str) for v in data_values):
        return True

    # Critère 5 : aucune valeur du header n'apparaît dans les données
    data_str_set = {str(v).strip().lower() for v in data_values}
    return not any(v.strip().lower() in data_str_set for v in non_empty)


# ─── Détection de blocs ───────────────────────────────────────────────────────

def detect_blocks(ws):
    blocks = []
    block_start = None

    for row_index in range(1, ws.max_row + 1):
        if not is_row_empty(ws, row_index, ws.max_column):
            if block_start is None:
                block_start = row_index
        else:
            if block_start is not None:
                blocks.append((block_start, row_index - 1))
                block_start = None

    if block_start is not None:
        blocks.append((block_start, ws.max_row))

    return blocks


# ─── Chargement d'un bloc ─────────────────────────────────────────────────────

def load_block(ws, table_name, table_index, start_row, end_row):
    table = Table(name=table_name, index=table_index)

    first_row_values = [
        ws.cell(row=start_row, column=col).value
        for col in range(1, ws.max_column + 1)
    ]

    data_rows_values = [
        [ws.cell(row=r, column=col).value for col in range(1, ws.max_column + 1)]
        for r in range(start_row + 1, min(start_row + 4, end_row + 1))
    ]

    table.set_has_header(detect_has_header(first_row_values, data_rows_values))

    used_columns = [
        col_index for col_index in range(ws.max_column)
        if any(
            ws.cell(row=r, column=col_index + 1).value is not None
            for r in range(start_row, end_row + 1)
        )
    ]

    for local_index, col_index in enumerate(used_columns):
        if table.get_has_header():
            name = clean_header(first_row_values[col_index]) or f"column_{local_index + 1}"
        else:
            name = f"column_{local_index + 1}"

        column = Column(
            name=name,
            index=local_index,
            letter=ws.cell(row=start_row, column=col_index + 1).column_letter
        )
        table.add_column(column)

    data_start = start_row + 1 if table.get_has_header() else start_row

    for row_index in range(data_start, end_row + 1):
        row = Row(row_index)

        for local_index, col_index in enumerate(used_columns):
            value = ws.cell(row=row_index, column=col_index + 1).value
            formula = value if isinstance(value, str) and value.startswith("=") else None

            row.add_cell(Cell(
                value=value,
                row_index=row_index,
                column_index=local_index + 1,
                formula=formula
            ))

        table.add_row(row)

    return table


# ─── Chargement du classeur ───────────────────────────────────────────────────

def load_workbook_model(path):
    if path is None or str(path).strip() == "":
        raise ExcelReadError("Aucun fichier fourni")

    path = Path(path)

    if path.suffix.lower() != ".xlsx":
        raise ExcelReadError("Format invalide")

    if not path.exists():
        raise ExcelReadError(f"Fichier introuvable : {path}")

    try:
        wb = load_workbook(path)
    except InvalidFileException:
        raise ExcelReadError(f"Le fichier '{path.name}' est corrompu ou n'est pas un fichier Excel valide")

    workbook = Workbook(file_name=path.name, file_path=str(path))

    for sheet_index, ws in enumerate(wb.worksheets):
        worksheet = Worksheet(name=ws.title, index=sheet_index)
        pending_title = None
        table_index = 0

        for block_index, (start_row, end_row) in enumerate(detect_blocks(ws)):
            table_name = ws.title if block_index == 0 else f"{ws.title}_{block_index + 1}"
            table = load_block(ws, table_name, table_index, start_row, end_row)

            if table.is_empty():
                cell_value = ws.cell(row=start_row, column=1).value
                if cell_value and str(cell_value).strip():
                    pending_title = str(cell_value).strip().lower().replace(" ", "_")
                continue

            if pending_title is not None:
                table.name = pending_title
                pending_title = None

            worksheet.add_table(table)
            table_index += 1

        workbook.add_worksheet(worksheet)

    return workbook
