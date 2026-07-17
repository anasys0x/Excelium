import unittest
import sys
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import api


SCHEMA = [
    {"name": "id", "type": "INT", "isPrimaryKey": True},
    {"name": "nom", "type": "STRING", "isPrimaryKey": False},
]

SCHEMA_SANS_PK = [
    {"name": "nom", "type": "STRING", "isPrimaryKey": False},
]


class FakeConnection:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


class CrudApiTestCase(unittest.TestCase):
    """Base : un TestClient et une fausse connexion déjà branchée."""

    def setUp(self):
        self.client = TestClient(api.app, raise_server_exceptions=False)
        self.connection = FakeConnection()
        patcher = patch.object(api, "get_connection", return_value=self.connection)
        patcher.start()
        self.addCleanup(patcher.stop)


class ReadRowsTest(CrudApiTestCase):
    def test_returns_columns_and_rows(self):
        rows = [{"id": 1, "nom": "Ali"}, {"id": 2, "nom": "Farah"}]
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "get_table_rows", return_value=rows):
            response = self.client.get("/tables/etudiants/rows")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"columns": SCHEMA, "rows": rows})
        self.assertTrue(self.connection.closed)

    def test_returns_503_when_database_is_unreachable(self):
        with patch.object(api, "get_connection", side_effect=Exception("db down")):
            response = self.client.get("/tables/etudiants/rows")

        self.assertEqual(response.status_code, 503)

    def test_returns_500_when_the_query_fails(self):
        with patch.object(api, "get_table_schema", side_effect=Exception("boom")):
            response = self.client.get("/tables/etudiants/rows")

        self.assertEqual(response.status_code, 500)
        self.assertTrue(self.connection.closed)


class CreateRowTest(CrudApiTestCase):
    def test_inserts_and_returns_the_row(self):
        created = {"id": 3, "nom": "Sami"}
        with patch.object(api, "insert_row", return_value=created) as mock_insert:
            response = self.client.post("/tables/etudiants/rows", json={"nom": "Sami"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"row": created})
        mock_insert.assert_called_once_with(self.connection, "etudiants", {"nom": "Sami"})
        self.assertTrue(self.connection.closed)


class UpdateRowTest(CrudApiTestCase):
    def test_coerces_the_pk_to_int_and_updates(self):
        updated = {"id": 5, "nom": "Leila"}
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "update_row", return_value=updated) as mock_update:
            response = self.client.put("/tables/etudiants/rows/5", json={"nom": "Leila"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"row": updated})
        # la PK est INT : "5" (chaîne de l'URL) doit devenir 5 (entier)
        mock_update.assert_called_once_with(
            self.connection, "etudiants", "id", 5, {"nom": "Leila"}
        )

    def test_returns_404_for_an_unknown_row(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "update_row", return_value=None):
            response = self.client.put("/tables/etudiants/rows/99", json={"nom": "X"})

        self.assertEqual(response.status_code, 404)
        self.assertTrue(self.connection.closed)

    def test_returns_400_when_the_table_has_no_pk(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA_SANS_PK):
            response = self.client.put("/tables/etudiants/rows/5", json={"nom": "X"})

        self.assertEqual(response.status_code, 400)


class DeleteRowTest(CrudApiTestCase):
    def test_deletes_a_row(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "delete_row", return_value=True) as mock_delete, \
             patch.object(api, "delete_row_cascade") as mock_cascade:
            response = self.client.delete("/tables/etudiants/rows/5")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"deleted": True})
        mock_delete.assert_called_once_with(self.connection, "etudiants", "id", 5)
        mock_cascade.assert_not_called()

    def test_cascade_uses_the_cascade_delete(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "delete_row") as mock_delete, \
             patch.object(api, "delete_row_cascade", return_value=True) as mock_cascade:
            response = self.client.delete("/tables/etudiants/rows/5?cascade=true")

        self.assertEqual(response.status_code, 200)
        mock_cascade.assert_called_once_with(self.connection, "etudiants", "id", 5)
        mock_delete.assert_not_called()

    def test_returns_404_when_nothing_was_deleted(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "delete_row", return_value=False):
            response = self.client.delete("/tables/etudiants/rows/99")

        self.assertEqual(response.status_code, 404)


class ReferencesTest(CrudApiTestCase):
    def test_returns_the_dependent_rows(self):
        refs = [{"table": "notes", "rows": [{"id": 1}]}]
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "get_row_references", return_value=refs):
            response = self.client.get("/tables/etudiants/rows/5/references")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"references": refs, "pkCol": "id"})


class CreateDatabaseTest(CrudApiTestCase):
    def test_rejects_an_empty_payload(self):
        response = self.client.post("/create", json={"tables": []})

        self.assertEqual(response.status_code, 400)

    def test_creates_the_tables(self):
        payload = {
            "tables": [{
                "tableName": "etudiants",
                "columns": [{"name": "id", "type": "INT", "isPrimaryKey": True}],
                "rows": [[1], [2]],
            }]
        }
        with patch.object(api, "create_tables", return_value=["etudiants"]) as mock_create:
            response = self.client.post("/create", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"created": ["etudiants"]})
        self.assertTrue(self.connection.closed)
        tables_arg = mock_create.call_args.args[1]
        self.assertEqual(tables_arg[0]["tableName"], "etudiants")

    def test_returns_503_when_database_is_unreachable(self):
        with patch.object(api, "get_connection", side_effect=Exception("db down")):
            response = self.client.post(
                "/create",
                json={"tables": [{"tableName": "t", "columns": [], "rows": []}]},
            )

        self.assertEqual(response.status_code, 503)


class ExportSqlTest(CrudApiTestCase):
    def test_generates_create_table_and_inserts(self):
        rows = [
            {"id": 1, "nom": "O'Brien"},
            {"id": 2, "nom": None},
        ]
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "get_table_rows", return_value=rows):
            response = self.client.get("/export/sql", params={"tables": "etudiants"})

        self.assertEqual(response.status_code, 200)
        sql = response.text
        self.assertIn('CREATE TABLE "etudiants"', sql)
        self.assertIn('"id" INTEGER PRIMARY KEY', sql)
        self.assertIn('"nom" TEXT', sql)
        # l'apostrophe doit être doublée, et None devenir NULL
        self.assertIn("'O''Brien'", sql)
        self.assertIn("NULL", sql)

    def test_ignores_empty_names_in_the_tables_parameter(self):
        with patch.object(api, "get_table_schema", return_value=SCHEMA) as mock_schema, \
             patch.object(api, "get_table_rows", return_value=[]):
            response = self.client.get("/export/sql", params={"tables": " etudiants , ,"})

        self.assertEqual(response.status_code, 200)
        mock_schema.assert_called_once_with(self.connection, "etudiants")


class ExportExcelTest(CrudApiTestCase):
    def test_produces_a_workbook_with_one_sheet_per_table(self):
        rows = [{"id": 1, "nom": "Ali"}]
        with patch.object(api, "get_table_schema", return_value=SCHEMA), \
             patch.object(api, "get_table_rows", return_value=rows):
            response = self.client.get("/export/excel", params={"tables": "etudiants"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("spreadsheetml", response.headers["content-type"])

        workbook = load_workbook(BytesIO(response.content))
        sheet = workbook["etudiants"]
        self.assertEqual([cell.value for cell in sheet[1]], ["id", "nom"])
        self.assertEqual([cell.value for cell in sheet[2]], [1, "Ali"])


class CoercePkTest(unittest.TestCase):
    def test_converts_to_int_when_the_pk_is_int(self):
        self.assertEqual(api._coerce_pk("5", SCHEMA), 5)

    def test_keeps_the_string_when_conversion_fails(self):
        self.assertEqual(api._coerce_pk("abc", SCHEMA), "abc")

    def test_keeps_the_string_for_a_non_int_pk(self):
        schema = [{"name": "code", "type": "STRING", "isPrimaryKey": True}]
        self.assertEqual(api._coerce_pk("A12", schema), "A12")


class SqlValueTest(unittest.TestCase):
    def test_formats_each_kind_of_value(self):
        cases = [
            (None, "NULL"),
            (True, "TRUE"),
            (False, "FALSE"),
            (42, "42"),
            (12.5, "12.5"),
            ("Ali", "'Ali'"),
            ("O'Brien", "'O''Brien'"),
        ]
        for value, expected in cases:
            self.assertEqual(api._sql_value(value), expected, repr(value))


if __name__ == "__main__":
    unittest.main()
