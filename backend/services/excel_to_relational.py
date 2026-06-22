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
from services.sql_generator import generate_create_table_sql, generate_sync_sql, generate_fk_sql
from services.fk_detector import detect_foreign_keys
from services.database_connection import get_connection
from services.database_execute import execute_sql, execute_sql_params, table_exists, get_table_columns
from errors import ExceliumError
from utils import slugify


# ─── Mapping ExcelType → RelationalType ──────────────────────────────────────
# Traduit chaque type Excel vers son équivalent SQL.
# MIXED n'existe pas en SQL → on le convertit en TEXT.

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
    # Vérifie si au moins une cellule de cette colonne contient une formule Excel
    for row in excel_table.get_rows():
        cell = next(
            (c for c in row.get_cells() if c.column_index == col.index + 1),
            None
        )
        if cell and cell.has_formula():
            return True
    return False


def convert_table(excel_table):
    # Convertit une excel.Table en relational.Table
    rel_table = RelationalTable(name=excel_table.name)

    # Ensemble des noms de colonnes qui ont des formules
    # → on leur ajoutera une colonne _formula en TEXT
    formula_cols = set()

    # ── Étape 1 : création des colonnes relationnelles ──
    for col in excel_table.get_columns():

        # Traduit le type Excel détecté en type SQL
        relational_type = EXCEL_TO_RELATIONAL.get(col.detected_type, RelationalType.TEXT)

        table_col = TableColumn(name=col.name, relational_type=relational_type)
        table_col.set_primary_key(col.is_primary_key)
        rel_table.add_column(table_col)

        # Si c'est la PK → ajoute aussi la contrainte PrimaryKey
        if col.is_primary_key:
            rel_table.add_constraint(PrimaryKey(col.name))

        # Si la colonne contient des formules → colonne _formula en plus
        if _col_has_formulas(excel_table, col):
            formula_cols.add(col.name)
            rel_table.add_column(TableColumn(
                name=f"{col.name}_formula",
                relational_type=RelationalType.TEXT
            ))

    # ── Étape 2 : création des lignes ──
    for row in excel_table.get_rows():
        values = {}
        for col in excel_table.get_columns():

            # Retrouve la cellule correspondant à cette colonne dans la ligne
            cell = next(
                (c for c in row.get_cells() if c.column_index == col.index + 1),
                None
            )

            values[col.name] = cell.value if cell else None

            # Si colonne formule → stocke aussi la formule brute
            if col.name in formula_cols:
                values[f"{col.name}_formula"] = cell.formula if cell else None

        rel_table.add_row(TableRow(values))

    return rel_table


def convert_workbook(excel_workbook):
    # Convertit tout le Workbook Excel en RelationalDB
    rel_db = RelationalDB(name=excel_workbook.file_name)

    for excel_table in excel_workbook.get_all_tables():
        rel_table = convert_table(excel_table)

        # Si aucune PK détectée → injecte un id SERIAL en première position
        # PostgreSQL auto-incrémentera la valeur à chaque INSERT
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

            # Phase 1 — Lecture du fichier Excel
            workbook = load_workbook_model(self.path)

            if workbook.is_empty():
                raise ExceliumError("Le fichier est vide")
            if not workbook.get_worksheets():
                raise ExceliumError("Aucune feuille trouvée")

            # Phase 2 — Enrichissement du modèle Excel
            detect_workbook_types(workbook)       # détecte les types de chaque colonne
            detect_primary_keys(workbook)         # marque les colonnes PK
            detect_intra_dependencies(workbook)   # dépendances dans la même feuille
            detect_inter_dependencies(workbook)   # dépendances entre feuilles

            # Phase 3 — Conversion Excel → Relationnel
            relational_db = convert_workbook(workbook)
            detect_foreign_keys(workbook, relational_db)  # détecte les FK entre tables

            # Phase 4 — Sync avec PostgreSQL
            self._display(workbook, relational_db)
            self._execute(conn, relational_db)

        except ExceliumError as e:
            print(f"\n[ERREUR] {e}")

        finally:
            # Toujours fermer la connexion même en cas d'erreur
            if conn is not None:
                conn.close()

    def _display(self, workbook, relational_db):
        # Affiche les dépendances et le modèle relationnel dans la console
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
        # Pour chaque table : crée si elle n'existe pas, migre si schéma changé, puis synchronise
        for table in relational_db.get_tables():

            if not table_exists(conn, slugify(table.name)):
                create_sql = generate_create_table_sql(table)
                execute_sql(conn, create_sql)
                print(f"\n  {create_sql}")
                print("  Table créée avec succès !")
            else:
                # Table existe → ajouter les colonnes manquantes si l'Excel a évolué
                self._sync_schema(conn, table)

            # Sync intelligente — chaque statement est un tuple (sql, params)
            # before = (TRUNCATE CASCADE, None) si SERIAL
            # inserts = (upsert %s, params) si PK réel, (INSERT %s, params) sinon
            # after = (DELETE NOT IN, params) si PK réel
            before, inserts, after = generate_sync_sql(table)

            for sql, _ in before:
                execute_sql(conn, sql)  # DDL, pas de params
            for sql, params in inserts:
                execute_sql_params(conn, sql, params)
            for sql, params in after:
                execute_sql_params(conn, sql, params)

            print(f"  Table '{table.name}' synchronisée ({len(inserts)} lignes).")

        # Applique les FK après toutes les tables
        # (les tables référencées doivent exister avant d'ajouter les contraintes)
        for fk_sql in generate_fk_sql(relational_db):
            execute_sql(conn, fk_sql)
            print(f"  {fk_sql}")

    def _sync_schema(self, conn, table):
        """Adds columns that exist in Excel but are missing from the DB table.
        Never removes columns — DB may contain data not present in Excel.
        """
        existing = get_table_columns(conn, slugify(table.name))
        for col in table.get_columns():
            col_slug = slugify(col.name)
            if col_slug not in existing:
                if col.is_serial:
                    continue  # SERIAL ne peut pas être ajouté après création
                alter = (
                    f"ALTER TABLE {slugify(table.name)} "
                    f"ADD COLUMN IF NOT EXISTS {col_slug} {col.relational_type.value};"
                )
                execute_sql(conn, alter)
                print(f"  [SCHEMA] Colonne ajoutée : {col_slug}")
