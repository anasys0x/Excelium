import sys
import json
from pathlib import Path
from datetime import date, datetime

sys.path.insert(0, str(Path(__file__).parent))

from services.excel_reader import load_workbook_model
from services.type_detector import detect_workbook_types, detect_primary_keys
from errors import ExceliumError


def serialize(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (date, datetime)):
        return str(value)
    return value


def export(excel_path):
    workbook = load_workbook_model(excel_path)
    detect_workbook_types(workbook)
    detect_primary_keys(workbook)

    result = []

    for ws in workbook.get_worksheets():
        if ws.is_empty():
            continue
        result.append({
            "table": ws.name,
            "columns": [
                {
                    "name": col.name,
                    "sql_type": col.get_sql_type().value if col.get_sql_type() else "TEXT",
                    "is_primary_key": col.is_primary_key,
                }
                for col in ws.get_columns()
            ],
            "rows": [
                [serialize(cell.value) for cell in row.get_cells()]
                for row in ws.get_rows()
            ],
        })

    return result


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parents[1] / "data" / "excel.xlsx"

    try:
        data = export(path)
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except ExceliumError as e:
        print(f"Erreur : {e}", file=sys.stderr)
        sys.exit(1)
