import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.excel.cell import Cell
from models.excel.column import Column
from models.excel.excel_type import Type
from models.excel.row import Row
from models.excel.table import Table as ExcelTable
from models.excel.workbook import Workbook
from models.excel.worksheet import Worksheet
from models.relational.relational_db import RelationalDB
from models.relational.table import Table as RelTable
from models.relational.table_column import TableColumn
from models.relational.table_row import TableRow
from services.fk_detector import (
    _candidate_col_names,
    _subset_ratio,
    detect_foreign_keys,
    get_pk_column,
)


def build_pair(name, cols_spec, formulas=None):
    """
    Construit la table Excel ET la table relationnelle alignées, comme le fait /parse.
    cols_spec : liste de (nom, Type, is_pk, valeurs)
    formulas : dict {(row_index, col_index): formule} pour la stratégie VLOOKUP
    """
    formulas = formulas or {}
    excel_table = ExcelTable(name, 0)
    rel_table = RelTable(name)

    for index, (col_name, col_type, is_pk, _) in enumerate(cols_spec):
        excel_col = Column(col_name, index, chr(ord("A") + index))
        excel_col.set_detected_type(col_type)
        excel_col.set_primary_key(is_pk)
        excel_table.add_column(excel_col)

        rel_col = TableColumn(name=col_name, relational_type=None)
        rel_col.is_primary_key = is_pk
        rel_table.add_column(rel_col)

    row_count = max(len(values) for _, _, _, values in cols_spec)
    for row_index in range(row_count):
        row = Row(row_index)
        row_dict = {}
        for col_index, (col_name, _, _, values) in enumerate(cols_spec):
            value = values[row_index] if row_index < len(values) else None
            formula = formulas.get((row_index, col_index))
            row.add_cell(Cell(value, row_index, col_index, formula=formula))
            row_dict[col_name] = value
        excel_table.add_row(row)
        rel_table.add_row(TableRow(row_dict))

    return excel_table, rel_table


def build_db(*pairs):
    """Assemble le classeur Excel (une feuille par table) et la base relationnelle."""
    workbook = Workbook("test.xlsx", "/tmp/test.xlsx")
    db = RelationalDB(name="db")
    for index, (excel_table, rel_table) in enumerate(pairs):
        worksheet = Worksheet(excel_table.name, index)
        worksheet.add_table(excel_table)
        workbook.add_worksheet(worksheet)
        db.add_table(rel_table)
    return workbook, db


def get_fk(db, table_name, col_name):
    table = next(t for t in db.get_tables() if t.name == table_name)
    col = next(c for c in table.get_columns() if c.name == col_name)
    return col.foreign_key


CLIENTS = ("clients", [
    ("id", Type.INT, True, [1, 2, 3]),
    ("nom", Type.STRING, False, ["Ali", "Farah", "Sami"]),
])


class DerivedNameStrategyTest(unittest.TestCase):
    def test_client_id_points_to_clients_id(self):
        commandes = build_pair("commandes", [
            ("id", Type.INT, True, [10, 11, 12]),
            ("client_id", Type.INT, False, [1, 1, 3]),
        ])

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "client_id")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")
        self.assertEqual(fk.ref_column, "id")

    def test_rejected_when_values_do_not_match_the_target_pk(self):
        commandes = build_pair("commandes", [
            ("id", Type.INT, True, [10, 11, 12]),
            ("client_id", Type.INT, False, [97, 98, 99]),  # aucun de ces ids n'existe
        ])

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        self.assertIsNone(get_fk(db, "commandes", "client_id"))

    def test_rejected_when_the_type_is_incompatible(self):
        commandes = build_pair("commandes", [
            ("id", Type.INT, True, [10, 11]),
            ("client_id", Type.FLOAT, False, [1.0, 2.0]),  # FLOAT : jamais une FK
        ])

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        self.assertIsNone(get_fk(db, "commandes", "client_id"))

    def test_no_self_reference(self):
        clients = build_pair("clients", [
            ("id", Type.INT, True, [1, 2, 3]),
            ("client_id", Type.INT, False, [1, 2, 3]),  # pointerait vers sa propre table
        ])

        workbook, db = build_db(clients)
        detect_foreign_keys(workbook, db)

        self.assertIsNone(get_fk(db, "clients", "client_id"))


class ExactNameStrategyTest(unittest.TestCase):
    def test_a_column_named_like_a_foreign_pk_becomes_a_fk(self):
        etudiants = build_pair("etudiants", [
            ("matricule", Type.STRING, True, ["EMP1", "EMP2", "EMP3"]),
            ("nom", Type.STRING, False, ["Ali", "Farah", "Sami"]),
        ])
        notes = build_pair("notes", [
            ("id", Type.INT, True, [1, 2, 3]),
            ("matricule", Type.STRING, False, ["EMP1", "EMP1", "EMP3"]),
        ])

        workbook, db = build_db(etudiants, notes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "notes", "matricule")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "etudiants")
        self.assertEqual(fk.ref_column, "matricule")


class LookupFormulaStrategyTest(unittest.TestCase):
    def test_a_vlookup_formula_creates_the_fk(self):
        # 'ref' ne matche aucune convention de nom : seule la formule relie les tables
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("nom_client", Type.STRING, False, ["Ali", "Farah"]),
            ],
            formulas={
                (0, 2): "=VLOOKUP(B1, clients!$A:$B, 2, FALSE)",
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "ref")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")
        self.assertEqual(fk.ref_column, "id")

    def test_french_recherchev_is_understood_too(self):
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("nom_client", Type.STRING, False, ["Ali", "Farah"]),
            ],
            formulas={
                (0, 2): "=RECHERCHEV(B1; clients!$A:$B; 2; FAUX)".replace(";", ","),
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        self.assertIsNotNone(get_fk(db, "commandes", "ref"))

    def test_absolute_reference_dollar_sign_is_understood(self):
        # $B1 (référence absolue) : cassait le matching avant le correctif du $.
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("nom_client", Type.STRING, False, ["Ali", "Farah"]),
            ],
            formulas={
                (0, 2): "=VLOOKUP($B1, clients!$A:$B, 2, FALSE)",
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "ref")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")

    def test_xmatch_formula_creates_the_fk(self):
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("nom_client", Type.STRING, False, ["Ali", "Farah"]),
            ],
            formulas={
                (0, 2): "=XMATCH(B1, clients!A:A)",
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "ref")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")

    def test_sumif_formula_creates_the_fk(self):
        # SUMIF : la plage-critère (feuille cible) vient avant la valeur cherchée,
        # ordre inverse de VLOOKUP.
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("total_client", Type.INT, False, [100, 200]),
            ],
            formulas={
                (0, 2): "=SUMIF(clients!$A:$A, B1, clients!$C:$C)",
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "ref")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")

    def test_sumifs_formula_skips_the_leading_sum_range(self):
        # SUMIFS : le 1er argument est la plage-somme (pas la feuille cible),
        # la plage-critère vient en 2e position.
        commandes = build_pair(
            "commandes",
            [
                ("id", Type.INT, True, [10, 11]),
                ("ref", Type.INT, False, [1, 2]),
                ("total_client", Type.INT, False, [100, 200]),
            ],
            formulas={
                (0, 2): "=SUMIFS(clients!$C:$C, clients!$A:$A, B1)",
            },
        )

        workbook, db = build_db(build_pair(*CLIENTS), commandes)
        detect_foreign_keys(workbook, db)

        fk = get_fk(db, "commandes", "ref")
        self.assertIsNotNone(fk)
        self.assertEqual(fk.ref_table, "clients")


class HelpersTest(unittest.TestCase):
    def test_candidate_col_names_handles_plurals(self):
        self.assertEqual(
            _candidate_col_names("clients", "id"),
            {"clients_id", "client_id"},
        )
        self.assertIn("address_id", _candidate_col_names("addresses", "id"))

    def test_subset_ratio(self):
        self.assertEqual(_subset_ratio([1, 2, 3], [1, 2, 3]), 1.0)
        self.assertEqual(_subset_ratio([1, 2, 99, 98], [1, 2, 3]), 0.5)
        self.assertEqual(_subset_ratio([None, 1], [1]), 1.0)  # les None sont ignorés
        self.assertEqual(_subset_ratio([], [1]), 0.0)

    def test_get_pk_column_ignores_serial_pks(self):
        table = RelTable("t")
        serial = TableColumn(name="id", relational_type=None, is_serial=True)
        serial.is_primary_key = True
        table.add_column(serial)

        self.assertIsNone(get_pk_column(table))


if __name__ == "__main__":
    unittest.main()
