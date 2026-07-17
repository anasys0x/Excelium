import unittest
import sys
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import api


class FakeConnection:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


class ReadSessionEndpointTest(unittest.TestCase):
    def test_rejects_an_invalid_identifier(self):
        with self.assertRaises(HTTPException) as context:
            api.read_session("pas-un-uuid")

        self.assertEqual(context.exception.status_code, 400)

    def test_returns_404_for_an_unknown_session(self):
        connection = FakeConnection()
        with patch.object(api, "get_connection", return_value=connection), \
             patch.object(api, "load_session", return_value=None):
            with self.assertRaises(HTTPException) as context:
                api.read_session("2a39bfa1-4f2a-4aa8-ae38-1d70fb9f76fd")

        self.assertEqual(context.exception.status_code, 404)
        self.assertTrue(connection.closed)

    def test_returns_the_saved_session(self):
        connection = FakeConnection()
        saved = {
            "id": "2a39bfa1-4f2a-4aa8-ae38-1d70fb9f76fd",
            "createdAt": "2026-07-15T12:00:00+00:00",
            "dbSchema": {"tables": []},
            "preset": {},
        }
        with patch.object(api, "get_connection", return_value=connection), \
             patch.object(api, "load_session", return_value=saved):
            result = api.read_session(saved["id"])

        self.assertEqual(result, saved)
        self.assertTrue(connection.closed)


if __name__ == "__main__":
    unittest.main()
