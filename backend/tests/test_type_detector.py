import unittest
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.excel.cell import Cell
from models.excel.column import Column
from models.excel.excel_type import Type
from models.excel.row import Row
from models.excel.table import Table
from services.type_detector import detect_column_type, detect_table_types, is_date_string


class IsDateStringTest(unittest.TestCase):
    def test_accepts_the_supported_formats(self):
        for value in ["15/07/2026", "15-07-2026", "2026-07-15",
                      "2026/07/15", "07/15/2026", "2026-07-15 12:30:00"]:
            self.assertTrue(is_date_string(value), value)

    def test_ignores_surrounding_whitespace(self):
        self.assertTrue(is_date_string("  15/07/2026  "))

    def test_rejects_non_dates(self):
        for value in ["bonjour", "15/13/2026", "2026", "12,5", ""]:
            self.assertFalse(is_date_string(value), value)

    def test_rejects_non_strings(self):
        for value in [None, 42, 12.5, date(2026, 7, 15)]:
            self.assertFalse(is_date_string(value), repr(value))


class DetectColumnTypeTest(unittest.TestCase):
    def test_detects_each_simple_type(self):
        cases = [
            ([1, 2, 3], Type.INT),
            ([1.5, 2.0], Type.FLOAT),
            ([True, False], Type.BOOL),
            (["Ali", "Farah"], Type.STRING),
            ([date(2026, 7, 15), datetime(2026, 7, 16, 8, 0)], Type.DATE),
            (["15/07/2026", "2026-07-16"], Type.DATE),
        ]
        for values, expected in cases:
            self.assertEqual(detect_column_type(values), expected, values)

    def test_empty_column_falls_back_to_string(self):
        self.assertEqual(detect_column_type([]), Type.STRING)

    def test_blank_strings_are_ignored(self):
        self.assertEqual(detect_column_type(["  ", 1, 2]), Type.INT)
        self.assertEqual(detect_column_type(["", "   "]), Type.STRING)

    def test_ints_mixed_with_floats_widen_to_float(self):
        self.assertEqual(detect_column_type([1, 2.5, 3]), Type.FLOAT)

    def test_incompatible_types_give_mixed(self):
        self.assertEqual(detect_column_type([1, "Ali"]), Type.MIXED)
        self.assertEqual(detect_column_type(["15/07/2026", "pas une date"]), Type.MIXED)
        self.assertEqual(detect_column_type([True, 1]), Type.MIXED)

    def test_booleans_are_not_confused_with_ints(self):
        # bool est une sous-classe de int en Python : le booléen doit gagner
        self.assertEqual(detect_column_type([True, False]), Type.BOOL)

    def test_numeric_looking_strings_stay_strings(self):
        self.assertEqual(detect_column_type(["0032", "0045"]), Type.STRING)


class DetectTableTypesTest(unittest.TestCase):
    def _build_table(self, columns_values):
        table = Table("Étudiants", 0)
        for index, (name, _) in enumerate(columns_values):
            table.add_column(Column(name, index, chr(ord("A") + index)))
        row_count = max(len(values) for _, values in columns_values)
        for row_index in range(row_count):
            row = Row(row_index)
            for col_index, (_, values) in enumerate(columns_values):
                value = values[row_index] if row_index < len(values) else None
                row.add_cell(Cell(value, row_index, col_index))
            table.add_row(row)
        return table

    def test_sets_detected_type_and_transform_on_each_column(self):
        table = self._build_table([
            ("id", [1, 2, 3]),
            ("nom", ["Ali", "Farah", "Sami"]),
            ("moyenne", [12.5, 15.0, 9.75]),
        ])

        detect_table_types(table)

        detected = [col.detected_type for col in table.get_columns()]
        self.assertEqual(detected, [Type.INT, Type.STRING, Type.FLOAT])
        for col in table.get_columns():
            self.assertIsNotNone(col.transform)
            self.assertIsNotNone(col.get_sql_type())

    def test_none_cells_are_ignored_during_detection(self):
        table = self._build_table([("age", [21, None, 23])])

        detect_table_types(table)

        self.assertEqual(table.get_columns()[0].detected_type, Type.INT)


if __name__ == "__main__":
    unittest.main()
