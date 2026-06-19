from models.excel.excel_type import Type
from models.relational.relational_db import RelationalDB
from models.relational.table import Table as RelationalTable
from models.relational.table_column import TableColumn
from models.relational.table_row import TableRow
from models.relational.primary_key import PrimaryKey
from models.relational.relational_type import RelationalType

from services.excel_reader import load_workbook_model
from services.type_detector import detect_workbook_types
from services.pk_detector import detect_primary_keys
from services.dependency_detector import detect_intra_dependencies, detect_inter_dependencies
from services.sql_generator import generate_create_table_sql, generate_sync_sql
from services.database_connection import get_connection
from services.database_execute import execute_sql, table_exists
from errors import ExceliumError


# ─── Mapping ExcelType → RelationalType ──────────────────────────────────────

EXCEL_TO_RELATIONAL = {
    Type.INT:    RelationalType.INTEGER,
    Type.FLOAT:  RelationalType.FLOAT,
    Type.DATE:   RelationalType.DATE,
    Type.BOOL:   RelationalType.BOOLEAN,
    Type.STRING: RelationalType.TEXT,
    Type.MIXED:  RelationalType.TEXT,
}


# ─── Conversion Excel model → Relational model ───────────────────────────────

def _col_has_formulas(excel_table, col):
    for row in excel_table.get_rows():
        cell = next(
            (c for c in row.get_cells() if c.column_index == col.index + 1),
            None
        )
        if cell and cell.has_formula():
            return True
    return False


def convert_table(excel_table):
    rel_table = RelationalTable(name=excel_table.name)

    formula_cols = set()

    for col in excel_table.get_columns():
        relational_type = EXCEL_TO_RELATIONAL.get(col.detected_type, RelationalType.TEXT)
        table_col = TableColumn(name=col.name, relational_type=relational_type)
        table_col.set_primary_key(col.is_primary_key)
        rel_table.add_column(table_col)

        if col.is_primary_key:
            rel_table.add_constraint(PrimaryKey(col.name))

        if _col_has_formulas(excel_table, col):
            formula_cols.add(col.name)
            rel_table.add_column(TableColumn(
                name=f"{col.name}_formula",
                relational_type=RelationalType.TEXT
            ))

    for row in excel_table.get_rows():
        values = {}
        for col in excel_table.get_columns():
            cell = next(
                (c for c in row.get_cells() if c.column_index == col.index + 1),
                None
            )
            values[col.name] = cell.value if cell else None
            if col.name in formula_cols:
                values[f"{col.name}_formula"] = cell.formula if cell else None
        rel_table.add_row(TableRow(values))

    return rel_table


def convert_workbook(excel_workbook):
    rel_db = RelationalDB(name=excel_workbook.file_name)

    for excel_table in excel_workbook.get_all_tables():
        rel_table = convert_table(excel_table)

        has_pk = any(col.is_primary_key for col in rel_table.get_columns())
        if not has_pk:
            serial_col = TableColumn(name="id", relational_type=RelationalType.INTEGER, is_serial=True)
            serial_col.set_primary_key(True)
            rel_table.columns.insert(0, serial_col)

        rel_db.add_table(rel_table)

    return rel_db


# ─── Orchestrateur principal ──────────────────────────────────────────────────

class ExcelToRelational:

    def __init__(self, path):
        self.path = path

    def run(self):
        conn = None

        try:
            conn = get_connection()
            print("Connected to PostgreSQL!")

            workbook = load_workbook_model(self.path)

            if workbook.is_empty():
                raise ExceliumError("Le fichier est vide")
            if not workbook.get_worksheets():
                raise ExceliumError("Aucune feuille trouvée")

            detect_workbook_types(workbook)
            detect_primary_keys(workbook)
            detect_intra_dependencies(workbook)
            detect_inter_dependencies(workbook)

            relational_db = convert_workbook(workbook)

            self._display(workbook, relational_db)
            self._execute(conn, relational_db)

        except ExceliumError as e:
            print(f"\n[ERREUR] {e}")

        finally:
            if conn is not None:
                conn.close()

    def _display(self, workbook, relational_db):
        print("\nDEPENDENCIES\n")
        from services.dependency_detector import column_index_to_letter
        for dep in workbook.get_dependencies():
            src = (
                f"{dep.source_worksheet.name}!"
                f"{column_index_to_letter(dep.source_cell.column_index)}"
                f"{dep.source_cell.row_index}"
            )
            tgt = (
                f"{dep.target_worksheet.name}!"
                f"{column_index_to_letter(dep.target_cell.column_index)}"
                f"{dep.target_cell.row_index}"
            )
            print(src, "->", tgt)

        for table in relational_db.get_tables():
            print(f"\n  Tableau : {table.name}")
            print(f"  Colonnes :")
            for col in table.get_columns():
                pk_flag = " [PK]" if col.is_primary_key else ""
                print(f"    {col.name} -> {col.relational_type.value}{pk_flag}")
            print(f"  Nombre de lignes : {len(table.get_rows())}")

    def _execute(self, conn, relational_db):
        for table in relational_db.get_tables():
            if not table_exists(conn, table.name):
                create_sql = generate_create_table_sql(table)
                execute_sql(conn, create_sql)
                print(f"\n  {create_sql}")
                print("  Table créée avec succès !")

            before, inserts, after = generate_sync_sql(table)

            for sql in before:
                execute_sql(conn, sql)
            for sql in inserts:
                execute_sql(conn, sql)
            for sql in after:
                execute_sql(conn, sql)

            print(f"  Table '{table.name}' synchronisée ({len(inserts)} lignes).")
