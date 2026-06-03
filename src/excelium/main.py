from pathlib import Path

from src.excelium.services.excel_reader import open_workbook, get_active_worksheet, get_headers, clean_headers, get_data
from src.excelium.services.type_detector import detect_all_column_types
from src.excelium.services.sql_mapper import map_all_columns_to_sql, create_table_sql
from src.excelium.services.database_builder import execute_sql

project_root = Path(__file__).resolve().parents[2]
excel_path = project_root / "data" / "excel.xlsx"

excel = open_workbook(excel_path)
clients = get_active_worksheet(excel)
lines = get_data(clients)
headers = clean_headers(get_headers(clients))

my_dict = detect_all_column_types(headers, lines)
mapping = map_all_columns_to_sql(my_dict)

create_sql = create_table_sql("clients", mapping)
print(create_sql)

execute_sql(create_sql)