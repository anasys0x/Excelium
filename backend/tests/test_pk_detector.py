import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.excel.cell import Cell
from models.excel.column import Column
from models.excel.row import Row
from models.excel.table import Table
from models.excel.workbook import Workbook
from models.excel.worksheet import Worksheet
from services.pk_detector import (
    _all_fixed_prefix_codes,
    _all_uuid,
    _is_sequential,
    _value_format_score,
    detect_primary_keys,
    get_pk_candidates,
    is_unique_non_null,
    pk_name_score,
)


def build_table(name, columns_values):
    """columns_values : liste de (nom_colonne, valeurs)."""
    table = Table(name, 0)
    for index, (col_name, _) in enumerate(columns_values):
        table.add_column(Column(col_name, index, chr(ord("A") + index)))
    row_count = max(len(values) for _, values in columns_values)
    for row_index in range(row_count):
        row = Row(row_index)
        for col_index, (_, values) in enumerate(columns_values):
            value = values[row_index] if row_index < len(values) else None
            row.add_cell(Cell(value, row_index, col_index))
        table.add_row(row)
    return table


def build_workbook(*tables):
    workbook = Workbook("test.xlsx", "/tmp/test.xlsx")
    for index, table in enumerate(tables):
        worksheet = Worksheet(table.name, index)
        worksheet.add_table(table)
        workbook.add_worksheet(worksheet)
    return workbook


class PkNameScoreTest(unittest.TestCase):
    def test_scores_exact_names(self):
        self.assertEqual(pk_name_score("id"), 10)
        self.assertEqual(pk_name_score("matricule"), 9)
        self.assertEqual(pk_name_score("code"), 7)

    def test_scores_prefixes_and_suffixes(self):
        self.assertEqual(pk_name_score("id_client"), 8)
        self.assertEqual(pk_name_score("client_id"), 8)
        self.assertEqual(pk_name_score("ref_commande"), 5)

    def test_is_case_insensitive(self):
        self.assertEqual(pk_name_score("ID"), 10)
        self.assertEqual(pk_name_score("Client_Id"), 8)

    def test_gives_zero_to_ordinary_names(self):
        for name in ["nom", "montant", "date_naissance"]:
            self.assertEqual(pk_name_score(name), 0, name)


class IsUniqueNonNullTest(unittest.TestCase):
    def test_accepts_unique_values(self):
        self.assertTrue(is_unique_non_null([1, 2, 3]))
        self.assertTrue(is_unique_non_null(["A", "B"]))

    def test_rejects_duplicates_nulls_and_empty(self):
        self.assertFalse(is_unique_non_null([1, 2, 2]))
        self.assertFalse(is_unique_non_null([1, None, 3]))
        self.assertFalse(is_unique_non_null([]))


class ValueFormatSignalsTest(unittest.TestCase):
    def test_sequential_numbers(self):
        self.assertTrue(_is_sequential([1, 2, 3]))
        self.assertTrue(_is_sequential([10, 20, 30]))
        self.assertTrue(_is_sequential([3, 1, 2]))       # l'ordre ne compte pas
        self.assertTrue(_is_sequential([1.0, 2.0, 3.0]))  # floats entiers acceptés

    def test_non_sequences_are_rejected(self):
        self.assertFalse(_is_sequential([1, 2, 4]))
        self.assertFalse(_is_sequential([1]))            # trop court
        self.assertFalse(_is_sequential([True, False]))  # les bools ne comptent pas
        self.assertFalse(_is_sequential(["1", "2"]))

    def test_uuid_detection(self):
        uuids = [
            "a3bb189e-8bf9-3888-9912-ace4e6543002",
            "F47AC10B-58CC-4372-A567-0E02B2C3D479",  # majuscules acceptées
        ]
        self.assertTrue(_all_uuid(uuids))
        self.assertFalse(_all_uuid(uuids + ["pas-un-uuid"]))
        self.assertFalse(_all_uuid([]))

    def test_fixed_prefix_codes(self):
        self.assertTrue(_all_fixed_prefix_codes(["EMP001", "EMP002", "EMP003"]))
        self.assertFalse(_all_fixed_prefix_codes(["EMP001", "PRD002"]))  # préfixes différents
        self.assertFalse(_all_fixed_prefix_codes(["EMP001"]))            # trop court

    def test_score_hierarchy(self):
        self.assertEqual(_value_format_score([1, 2, 3]), 4)
        self.assertEqual(_value_format_score(["EMP001", "EMP002"]), 3)
        self.assertEqual(_value_format_score(["Alice", "Bob"]), 0)


class GetPkCandidatesTest(unittest.TestCase):
    def test_returns_scored_candidates(self):
        table = build_table("etudiants", [
            ("id", [1, 2, 3]),                    # nom (10) + séquence (4) = 14
            ("matricule", ["EMP1", "EMP2", "EMP3"]),  # nom (9) + codes (3) = 12
            ("nom", ["Alice", "Bob", "Charlie"]),    # unique mais aucun signal
            ("note", [12, 15, 12]),               # doublons → exclu d'office
        ])

        candidates = get_pk_candidates(table)

        self.assertEqual(candidates, {"id": 14, "matricule": 12})

    def test_a_non_unique_id_is_not_a_candidate(self):
        table = build_table("notes", [("id", [1, 1, 2])])

        self.assertEqual(get_pk_candidates(table), {})


class DetectPrimaryKeysTest(unittest.TestCase):
    def _pk_names(self, table):
        return [c.name for c in table.get_columns() if c.is_primary_key]

    def test_marks_the_best_candidate_of_each_table(self):
        etudiants = build_table("etudiants", [
            ("id", [1, 2, 3]),
            ("matricule", ["EMP1", "EMP2", "EMP3"]),
            ("nom", ["Alice", "Bob", "Charlie"]),
        ])
        notes = build_table("notes", [
            ("code", ["N1", "N2"]),
            ("valeur", [12, 15]),
        ])

        detect_primary_keys(build_workbook(etudiants, notes))

        self.assertEqual(self._pk_names(etudiants), ["id"])
        self.assertEqual(self._pk_names(notes), ["code"])

    def test_marks_nothing_without_a_positive_signal(self):
        table = build_table("personnes", [
            ("nom", ["Alice", "Bob"]),      # unique mais nom sans signal
            ("age", [21, 21]),              # doublons
        ])

        detect_primary_keys(build_workbook(table))

        self.assertEqual(self._pk_names(table), [])

    def test_resets_previous_pk_flags(self):
        table = build_table("etudiants", [
            ("id", [1, 2, 3]),
            ("nom", ["Alice", "Bob", "Charlie"]),
        ])
        # simulate un ancien marquage erroné : la détection doit repartir de zéro
        table.get_columns()[1].set_primary_key(True)

        detect_primary_keys(build_workbook(table))

        self.assertEqual(self._pk_names(table), ["id"])


if __name__ == "__main__":
    unittest.main()
