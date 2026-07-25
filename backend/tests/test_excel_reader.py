import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.excel_reader import (
    detect_has_header,
    get_value_type,
    looks_like_alnum_code,
    looks_like_time,
)


class GetValueTypeTest(unittest.TestCase):
    def test_recognizes_time_values(self):
        self.assertEqual(get_value_type("08:30"), "time")
        self.assertEqual(get_value_type("11:30:00"), "time")

    def test_recognizes_alnum_codes(self):
        self.assertEqual(get_value_type("IFT1015"), "alnum_code")
        self.assertEqual(get_value_type("B-321"), "alnum_code")

    def test_recognizes_ordinary_types(self):
        self.assertEqual(get_value_type(None), "null")
        self.assertEqual(get_value_type(True), "bool")
        self.assertEqual(get_value_type(3), "int")
        self.assertEqual(get_value_type(3.5), "float")
        self.assertEqual(get_value_type("Lundi"), "str")

    def test_time_takes_priority_over_alnum_code(self):
        # "08:30" contient un chiffre mais pas de lettre : ne doit pas être pris pour un code
        self.assertEqual(get_value_type("08:30"), "time")


class LooksLikeHelpersTest(unittest.TestCase):
    def test_looks_like_time_accepts_hh_mm_and_hh_mm_ss(self):
        self.assertTrue(looks_like_time("8:30"))
        self.assertTrue(looks_like_time("08:30"))
        self.assertTrue(looks_like_time("08:30:15"))

    def test_looks_like_time_rejects_non_time_strings(self):
        self.assertFalse(looks_like_time("IFT1015"))
        self.assertFalse(looks_like_time("Lundi"))
        self.assertFalse(looks_like_time(""))

    def test_looks_like_alnum_code_requires_letters_and_digits(self):
        self.assertTrue(looks_like_alnum_code("B-321"))
        self.assertFalse(looks_like_alnum_code("Lundi"))   # que des lettres
        self.assertFalse(looks_like_alnum_code("12345"))   # que des chiffres


class DetectHasHeaderTest(unittest.TestCase):
    def test_detects_header_with_time_and_code_columns(self):
        # Cas réel corrigé : "Horaires" (Jour, HeureDebut, HeureFin, Cours, Salle)
        first_row = ["Jour", "HeureDebut", "HeureFin", "Cours", "Salle"]
        data_rows = [
            ["Lundi", "08:30", "11:30", "IFT1015", "B-321"],
            ["Lundi", "13:00", "16:00", "IFT2255", "B-220"],
            ["Mardi", "09:00", "12:00", "MAT1400", "A-110"],
        ]
        self.assertTrue(detect_has_header(first_row, data_rows))

    def test_detects_header_with_classic_identifier_names(self):
        first_row = ["id", "nom", "montant"]
        data_rows = [
            [1, "Alice", 12.5],
            [2, "Bob", 30.0],
        ]
        self.assertTrue(detect_has_header(first_row, data_rows))

    def test_no_header_when_first_row_looks_like_data(self):
        first_row = ["Alice", "Bob", "Charlie"]
        data_rows = [
            ["David", "Emma", "Felix"],
            ["Grace", "Hugo", "Isabelle"],
        ]
        self.assertFalse(detect_has_header(first_row, data_rows))

    def test_empty_first_row_has_no_header(self):
        self.assertFalse(detect_has_header([None, None], [["a", "b"]]))

    def test_single_row_without_data_falls_back_on_type_homogeneity(self):
        # Sans données suivantes, on ne peut trancher que sur l'homogénéité des types
        self.assertTrue(detect_has_header(["nom", "ville"], []))
        self.assertFalse(detect_has_header(["nom", 42], []))


if __name__ == "__main__":
    unittest.main()
