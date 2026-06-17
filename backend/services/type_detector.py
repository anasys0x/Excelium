from datetime import date, datetime

from models.excel_type import Type
from transforms.type_transform_factory import TypeTransformFactory


# ─── Constantes ───────────────────────────────────────────────────────────────

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d",
    "%Y/%m/%d", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S",
]


# ─── Détection de type de colonne ─────────────────────────────────────────────

def is_date_string(value):
    if not isinstance(value, str):
        return False
    for fmt in DATE_FORMATS:
        try:
            datetime.strptime(value.strip(), fmt)
            return True
        except ValueError:
            pass
    return False


def get_column_values(table, column):
    return [
        row.cells[column.index].value
        for row in table.get_rows()
        if row.cells[column.index].value is not None
    ]


def detect_column_type(values):
    found_types = set()

    for value in values:
        if isinstance(value, str) and value.strip() == "":
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
            found_types.add(Type.DATE if is_date_string(value) else Type.STRING)

    if not found_types:
        return Type.STRING
    if found_types == {Type.INT, Type.FLOAT}:
        return Type.FLOAT
    if len(found_types) > 1:
        return Type.MIXED
    return found_types.pop()


def detect_table_types(table):
    for column in table.get_columns():
        detected_type = detect_column_type(get_column_values(table, column))
        column.set_detected_type(detected_type)
        column.set_transform(TypeTransformFactory.create(detected_type))


def detect_workbook_types(workbook):
    for worksheet in workbook.get_worksheets():
        for table in worksheet.get_tables():
            detect_table_types(table)


