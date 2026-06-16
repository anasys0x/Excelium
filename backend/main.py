from pathlib import Path

from services.excel_reader import load_workbook_model
from services.type_detector import*
from services.database_builder import*
from services.database_execute import execute_sql
from services.database_connection import get_connection
from services.dependency_detector import*
from errors import ExceliumError

project_root = Path(__file__).resolve().parents[1]

excel_path = (
    project_root
    / "data"
    #/ "excel.xlsx"
    #/ "excelphase2.xlsx"
    #/ "excelphase3.1.xlsx"
    #/ "excelphase3.2.xlsx"
    #/ "excel_sans_header.xlsx"
    / "excel_multi_tableau_meme_feuille.xlsx"
)

conn = None

try:

    conn = get_connection()
    print("Connected to PostgreSQL!")

    workbook = load_workbook_model(excel_path)

    if workbook.is_empty():
        raise ExceliumError("Le fichier est vide")

    if not workbook.get_worksheets():
        raise ExceliumError("Aucune feuille trouvée")

    detect_workbook_types(workbook)
    detect_primary_keys(workbook)

    detect_intra_dependencies(workbook)
    detect_inter_dependencies(workbook)
    print("\nDEPENDENCIES\n")

    for dependency in workbook.get_dependencies():
        source = (
            f"{dependency.source_worksheet.name}!"
            f"{column_index_to_letter(dependency.source_cell.column_index)}"
            f"{dependency.source_cell.row_index}"
        )
        target = (
            f"{dependency.target_worksheet.name}!"
            f"{column_index_to_letter(dependency.target_cell.column_index)}"
            f"{dependency.target_cell.row_index}"
        )
        print(source, "->", target)

    for worksheet in workbook.get_worksheets():

        print()
        print(worksheet.name)

        if worksheet.is_empty():
            print(f"[AVERTISSEMENT] La feuille '{worksheet.name}' est vide — ignorée")
            continue

        print("Colonnes :")

        for column in worksheet.get_columns():
            print(column.name, "->", column.detected_type)

        print("Nombre de lignes :", len(worksheet.get_rows()))

        sql = generate_create_table_sql(worksheet)
        print(sql)

        execute_sql(conn, sql)
        print("Table créée avec succès !")

        insert_sqls = generate_insert_sql(worksheet)

        for insert_sql in insert_sqls:
            execute_sql(conn, insert_sql)

        print("Données importées avec succès !")

except ExceliumError as e:
    print(f"\n[ERREUR] {e}")

finally:
    if conn is not None:
        conn.close()