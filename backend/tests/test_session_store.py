import unittest
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.session_store import load_session


class FakeCursor:
    def __init__(self, row=None):
        self.row = row
        self.closed = False
        self.executions = []

    def execute(self, query, params=None):
        self.executions.append((query, params))

    def fetchone(self):
        return self.row

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, row=None):
        self.cursors = [FakeCursor(), FakeCursor(row)]
        self.committed = False

    def cursor(self):
        return self.cursors.pop(0)

    def commit(self):
        self.committed = True


class LoadSessionTest(unittest.TestCase):
    def test_returns_saved_schema_and_preset(self):
        session_id = "2a39bfa1-4f2a-4aa8-ae38-1d70fb9f76fd"
        created_at = datetime(2026, 7, 15, tzinfo=timezone.utc)
        connection = FakeConnection((
            session_id,
            created_at,
            {"tables": [{"tableName": "Étudiants"}]},
            {"density": "compact"},
        ))

        session = load_session(connection, session_id)

        self.assertEqual(session["id"], session_id)
        self.assertEqual(session["dbSchema"]["tables"][0]["tableName"], "Étudiants")
        self.assertEqual(session["preset"]["density"], "compact")

    def test_returns_none_for_unknown_session(self):
        connection = FakeConnection(None)

        self.assertIsNone(load_session(connection, "2a39bfa1-4f2a-4aa8-ae38-1d70fb9f76fd"))


if __name__ == "__main__":
    unittest.main()
