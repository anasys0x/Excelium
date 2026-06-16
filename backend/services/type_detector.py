from datetime import date, datetime

from models.excel_type import Type
from transforms.type_transform_factory import TypeTransformFactory


def get_column_values(worksheet, column):

    values = []

    for row in worksheet.get_rows():

        cell = row.cells[column.index]

        if cell.value is not None:
            values.append(cell.value)

    return values


def detect_column_type(values):

    found_types = set()

    for value in values:

        if isinstance(value, str):
            value = value.strip()

        if value == "":
            continue

        if isinstance(value, bool):
            found_types.add(Type.BOOL)

        elif isinstance(value, int):
            found_types.add(Type.INT)

        elif isinstance(value, float):
            found_types.add(Type.FLOAT)

        elif isinstance(value, (date, datetime)):
            found_types.add(Type.DATE)

        elif isinstance(value, str):

            if is_date_string(value):
                found_types.add(Type.DATE)

            else:
                found_types.add(Type.STRING)

    # colonne vide
    if len(found_types) == 0:
        return Type.STRING

    # int + float => float
    if found_types == {Type.INT, Type.FLOAT}:
        return Type.FLOAT

    # plusieurs types différents
    if len(found_types) > 1:
        return Type.MIXED

    return found_types.pop()


def detect_worksheet_types(worksheet):

    for column in worksheet.get_columns():

        values = get_column_values(
            worksheet,
            column
        )

        if column.name == "date":
            print("VALEURS DATE =", values)

        detected_type = detect_column_type(values)

        column.set_detected_type(
            detected_type
        )
        column.set_transform(
            TypeTransformFactory.create(detected_type)
        )


def detect_workbook_types(workbook):

    for worksheet in workbook.get_worksheets():

        detect_worksheet_types(
            worksheet
        )

def is_date_string(value):

    if not isinstance(value, str):
        return False

    value = value.strip()

    formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%Y-%m-%d %H:%M:%S"
    ]

    for fmt in formats:
        try:
            datetime.strptime(value, fmt)
            return True
        except ValueError:
            pass

    return False

def is_primary_key_candidate(column,values):

    if len(values) == 0:
        return False

    if any(value is None for value in values):
        return False

    if len(values) != len(set(values)):
        return False

    return True

def detect_primary_keys(workbook):

    for worksheet in workbook.get_worksheets():

        # Réinitialise toutes les colonnes
        for column in worksheet.get_columns():
            column.set_primary_key(False)

        # Choisit la première colonne candidate comme PK
        for column in worksheet.get_columns():

            values = [
                row.get_cells()[column.index].value
                for row in worksheet.get_rows()
            ]

            if is_primary_key_candidate(column, values):
                column.set_primary_key(True)
                break