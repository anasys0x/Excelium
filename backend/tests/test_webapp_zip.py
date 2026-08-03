import io
import sys
import zipfile
from pathlib import Path
from unittest import mock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services import webapp_zip as webapp_zip_module
from services.webapp_zip import WebappZipError, build_webapp_zip

SESSION_ID = "11111111-1111-1111-1111-111111111111"

FAKE_SESSION = {
    "id": SESSION_ID,
    "createdAt": "2026-07-29T00:00:00",
    "dbSchema": {
        "tables": [
            {
                "tableName": "clients",
                "columns": [
                    {"name": "id", "type": "INT", "isPrimaryKey": True},
                    {"name": "nom", "type": "STRING", "isPrimaryKey": False},
                ],
                "rows": [[1, "Sophie"], [2, "O'Brien"]],
            }
        ]
    },
    "preset": {"theme": "dark"},
}


@pytest.fixture(autouse=True)
def fake_dist_export(tmp_path, monkeypatch):
    dist = tmp_path / "dist-export"
    dist.mkdir()
    (dist / "export.html").write_text("<html></html>", encoding="utf-8")
    assets = dist / "assets"
    assets.mkdir()
    (assets / "export.js").write_text("console.log('ok')", encoding="utf-8")
    monkeypatch.setattr(webapp_zip_module, "DIST_EXPORT_DIR", dist)
    return dist


def _zip_from(conn=None):
    content = build_webapp_zip(conn, SESSION_ID)
    return zipfile.ZipFile(io.BytesIO(content))


def test_raises_404_when_session_is_missing():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=None):
        with pytest.raises(WebappZipError) as exc_info:
            build_webapp_zip(None, SESSION_ID)
    assert exc_info.value.status_code == 404


def test_raises_when_export_build_is_missing(fake_dist_export):
    import shutil
    shutil.rmtree(fake_dist_export)
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        with pytest.raises(WebappZipError) as exc_info:
            build_webapp_zip(None, SESSION_ID)
    assert "build:export" in str(exc_info.value)


def test_zip_contains_expected_files():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        zf = _zip_from()
    names = zf.namelist()

    assert "database/schema.sql" in names
    assert "backend/api.py" in names
    assert "backend/services/session_store.py" in names
    assert "frontend/export.html" in names
    assert "frontend/config.json" in names
    assert "README.md" in names
    assert ".env.example" in names
    assert "start.py" in names


def test_zip_never_contains_env_or_tests():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        zf = _zip_from()
    names = zf.namelist()

    assert "backend/.env" not in names
    assert not any(name.startswith("backend/tests/") for name in names)
    assert not any("__pycache__" in name for name in names)


def test_api_py_appears_once_with_open_cors():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        zf = _zip_from()
    names = zf.namelist()

    assert names.count("backend/api.py") == 1
    content = zf.read("backend/api.py").decode("utf-8")
    assert 'allow_origins=["*"]' in content
    assert "http://localhost:5173" not in content


def test_config_json_has_the_right_session_id():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        zf = _zip_from()
    config = zf.read("frontend/config.json").decode("utf-8")
    assert SESSION_ID in config


def test_schema_sql_creates_data_table_and_session_row():
    with mock.patch.object(webapp_zip_module, "load_session", return_value=FAKE_SESSION):
        zf = _zip_from()
    sql = zf.read("database/schema.sql").decode("utf-8")

    assert 'CREATE TABLE "clients"' in sql
    assert "INSERT INTO \"clients\"" in sql
    assert "O''Brien" in sql  # apostrophe correctement échappée
    assert "CREATE TABLE IF NOT EXISTS webapp_sessions" in sql
    assert f"INSERT INTO webapp_sessions (id, schema_json, preset_json) VALUES ('{SESSION_ID}'" in sql
