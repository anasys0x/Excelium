from pathlib import Path

from services.excel_reader import load_workbook_model
from services.type_detector import detect_workbook_types
from services.database_builder import generate_create_table_sql

project_root = Path(__file__).resolve().parents[1]
excel_path = project_root / "data" / "excel.xlsx"

workbook = load_workbook_model(excel_path)
detect_workbook_types(workbook)

for worksheet in workbook.get_worksheets():

    print(worksheet.name)

    print("Colonnes :")

    for column in worksheet.get_columns():
        print(
            column.name,
            "->",
            column.detected_type
        )

    print("Nombre de lignes :", len(worksheet.get_rows()))
    
    sql = generate_create_table_sql(
        worksheet
    )

    print(sql)