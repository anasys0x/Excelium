from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from models.workbook import Workbook
from models.worksheet import Worksheet
from models.row import Row
from models.column import Column
from models.cell import Cell
from errors import ExcelReadError


def clean_header(header):
    if header is None:
        return ""

    return str(header).lower().strip().replace(" ", "_")


def is_row_empty(ws, row_index, max_col):
    for col_index in range(1, max_col + 1):
        value = ws.cell(row=row_index, column=col_index).value
        if value is not None and str(value).strip() != "":
            return False
    return True


def detect_blocks(ws):
    """
    Retourne une liste de (start_row, end_row) pour chaque bloc
    de données séparé par des lignes vides.
    """
    blocks = []
    block_start = None

    for row_index in range(1, ws.max_row + 1):

        row_empty = is_row_empty(ws, row_index, ws.max_column)

        if not row_empty and block_start is None:
            block_start = row_index

        elif row_empty and block_start is not None:
            blocks.append((block_start, row_index - 1))
            block_start = None

    if block_start is not None:
        blocks.append((block_start, ws.max_row))

    return blocks


def load_block(ws, sheet_name, block_index, start_row, end_row, worksheet_index):
    """
    Construit un Worksheet à partir d'un bloc de lignes (start_row..end_row).
    """
    # Nom unique : NomFeuille si un seul bloc, NomFeuille_2 pour les suivants
    name = (
        sheet_name
        if block_index == 0
        else f"{sheet_name}_{block_index + 1}"
    )

    worksheet = Worksheet(name=name, index=worksheet_index)

    first_row_values = [
        ws.cell(row=start_row, column=col).value
        for col in range(1, ws.max_column + 1)
    ]

    # Détection header : toutes les cellules non-vides de la 1ère ligne sont des str
    non_empty = [v for v in first_row_values if v is not None and str(v).strip() != ""]
    worksheet.has_header = (
        len(non_empty) > 0
        and all(isinstance(v, str) for v in non_empty)
    )

    # Colonnes : on ne retient que les colonnes qui ont des données dans le bloc
    used_columns = []
    for col_index in range(ws.max_column):
        has_data = any(
            ws.cell(row=r, column=col_index + 1).value is not None
            for r in range(start_row, end_row + 1)
        )
        if has_data:
            used_columns.append(col_index)

    for local_index, col_index in enumerate(used_columns):

        if worksheet.has_header:
            header_name = clean_header(first_row_values[col_index])
            if header_name == "":
                header_name = f"column_{local_index + 1}"
        else:
            header_name = f"column_{local_index + 1}"

        column = Column(
            name=header_name,
            index=local_index,
            letter=ws.cell(row=start_row, column=col_index + 1).column_letter
        )

        if local_index == 0:
            column.set_primary_key(True)

        worksheet.add_column(column)

    data_start = start_row + 1 if worksheet.has_header else start_row

    for row_index in range(data_start, end_row + 1):

        row = Row(row_index)

        for local_index, col_index in enumerate(used_columns):

            excel_cell = ws.cell(row=row_index, column=col_index + 1)
            value = excel_cell.value

            formula = None
            if isinstance(value, str) and value.startswith("="):
                formula = value

            cell = Cell(
                value=value,
                row_index=row_index,
                column_index=local_index + 1,
                formula=formula
            )

            row.add_cell(cell)

        worksheet.add_row(row)

    return worksheet


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

    workbook = Workbook(
        file_name=Path(path).name,
        file_path=str(path)
    )

    worksheet_index = 0

    for ws in wb.worksheets:

        blocks = detect_blocks(ws)

        pending_title = None

        for block_index, (start_row, end_row) in enumerate(blocks):

            worksheet = load_block(
                ws=ws,
                sheet_name=ws.title,
                block_index=block_index,
                start_row=start_row,
                end_row=end_row,
                worksheet_index=worksheet_index
            )

            # Bloc sans données = ligne-titre → on retient son texte pour le bloc suivant
            if len(worksheet.get_rows()) == 0:
                cell_value = ws.cell(row=start_row, column=1).value
                if cell_value is not None and str(cell_value).strip() != "":
                    pending_title = str(cell_value).strip().lower().replace(" ", "_")
                continue

            # Si un titre précède ce bloc, on l'utilise comme nom de table
            if pending_title is not None:
                worksheet.name = pending_title
                pending_title = None

            workbook.add_worksheet(worksheet)
            worksheet_index += 1

    return workbook