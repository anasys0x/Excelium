from pathlib import Path

from services.excel_reader import load_workbook_model
from services.type_detector import detect_workbook_types
from services.database_builder import (generate_create_table_sql , generate_insert_sql)
from services.database_execute import execute_sql
from services.database_connection import get_connection
from services.dependency_detector import column_index_to_letter, detect_intra_dependencies


conn = get_connection()

print("Connected to PostgreSQL!")

project_root = Path(__file__).resolve().parents[1]

excel_path = (
    project_root
    / "data"
    #/ "excel.xlsx"
    #/ "excelphase2.xlsx"
    / "excelphase3.1.xlsx"
)

workbook = load_workbook_model(excel_path)

detect_workbook_types(workbook)

detect_intra_dependencies(workbook)
print("\nDEPENDENCIES\n")

for dependency in workbook.get_dependencies():

    source = (
        f"{column_index_to_letter(dependency.source_cell.column_index)}"
        f"{dependency.source_cell.row_index}"
    )

    target = (
        f"{column_index_to_letter(dependency.target_cell.column_index)}"
        f"{dependency.target_cell.row_index}"
    )

    print(source, "->", target)
for worksheet in workbook.get_worksheets():

    print()

    print(worksheet.name)

    print("Colonnes :")

    for column in worksheet.get_columns():

        print(
            column.name,
            "->",
            column.detected_type
        )

    print(
        "Nombre de lignes :",
        len(worksheet.get_rows())
    )

    sql = generate_create_table_sql(
        worksheet
    )

    print(sql)

    execute_sql(
        conn,
        sql
    )

    print(
        "Table créée avec succès !"
    )

    insert_sqls = generate_insert_sql(
        worksheet
    )

    for insert_sql in insert_sqls:

        execute_sql(
            conn,
            insert_sql
        )

    print(
        "Données importées avec succès !"
    )

conn.close()