"""Assemble un zip auto-hébergeable contenant la webapp générée d'un client :
mini-frontend déjà buildé (dist-export/), backend réutilisable tel quel,
et un dump SQL qui recrée ses tables de données ainsi que sa session
(pour que la webapp exportée retrouve directement son thème).

Voir docs/superpowers/specs/2026-07-29-export-webapp-zip-design.md.
"""

import io
import re
import zipfile
from datetime import date, datetime
from pathlib import Path

import psycopg2.extras

from services.session_store import CREATE_TABLE_SQL, load_session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
DIST_EXPORT_DIR = REPO_ROOT / "frontend" / "dist-export"

# Fichiers/dossiers backend réutilisables tels quels dans le zip. Exclut
# volontairement .env (secrets locaux), tests/, main.py, export.py,
# Pipfile et le dossier racine transforms/ (inutilisé, à ne pas confondre
# avec models/transforms/). api.py n'est pas dans cette liste : il est
# copié séparément avec le CORS patché (voir _write_backend_source).
BACKEND_FILES = ["constants.py", "errors.py", "utils.py", "requirements.txt"]
BACKEND_DIRS = ["models", "services"]

TYPE_MAP = {
    "INT": "INTEGER", "FLOAT": "DOUBLE PRECISION", "STRING": "TEXT",
    "DATE": "DATE",   "BOOL": "BOOLEAN",           "MIXED":  "TEXT",
}

_IDENT_RE = re.compile(r"[^a-zA-Z0-9_]+")


def _slugify(name: str) -> str:
    return _IDENT_RE.sub("_", name).strip("_").lower() or "table"


def _sql_value(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (date, datetime)):
        return "'" + value.isoformat() + "'"
    return "'" + str(value).replace("'", "''") + "'"


class WebappZipError(Exception):
    """Erreur attendue (session introuvable, build d'export manquant)."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _build_data_sql(db_schema: dict) -> str:
    parts: list[str] = []
    for table in db_schema.get("tables", []):
        safe = _slugify(table["tableName"])
        columns = table["columns"]
        col_names = [c["name"] for c in columns]

        col_defs = []
        for c in columns:
            defn = f'  "{c["name"]}" {TYPE_MAP.get(c["type"], "TEXT")}'
            if c.get("isPrimaryKey"):
                defn += " PRIMARY KEY"
            col_defs.append(defn)
        parts.append(f'CREATE TABLE "{safe}" (\n' + ",\n".join(col_defs) + "\n);")

        rows = table.get("rows", [])
        if rows:
            col_list = ", ".join(f'"{c}"' for c in col_names)
            value_rows = [
                "(" + ", ".join(_sql_value(v) for v in row) + ")"
                for row in rows
            ]
            parts.append(f'INSERT INTO "{safe}" ({col_list}) VALUES\n' + ",\n".join(value_rows) + ";")

    for table in db_schema.get("tables", []):
        safe = _slugify(table["tableName"])
        for col in table["columns"]:
            fk = col.get("foreignKey")
            if not fk:
                continue
            ref_table = _slugify(fk["refTable"])
            constraint = f'fk_{safe}_{_slugify(col["name"])}'
            parts.append(
                f'ALTER TABLE "{safe}" ADD CONSTRAINT "{constraint}" '
                f'FOREIGN KEY ("{col["name"]}") REFERENCES "{ref_table}" ("{fk["refColumn"]}");'
            )

    return "\n\n".join(parts)


def _build_session_sql(session_id: str, db_schema: dict, preset: dict) -> str:
    schema_json = psycopg2.extras.Json(db_schema).getquoted().decode("utf-8")
    preset_json = psycopg2.extras.Json(preset).getquoted().decode("utf-8")
    return (
        CREATE_TABLE_SQL.strip() + "\n\n"
        f"INSERT INTO webapp_sessions (id, schema_json, preset_json) "
        f"VALUES ('{session_id}', {schema_json}, {preset_json});"
    )


def _write_backend_source(zf: zipfile.ZipFile) -> None:
    for filename in BACKEND_FILES:
        zf.write(BACKEND_DIR / filename, f"backend/{filename}")
    for dirname in BACKEND_DIRS:
        for path in (BACKEND_DIR / dirname).rglob("*.py"):
            if "__pycache__" in path.parts or "tests" in path.parts:
                continue
            arcname = f"backend/{path.relative_to(BACKEND_DIR).as_posix()}"
            zf.write(path, arcname)

    # Copie de api.py avec CORS ouvert : cette webapp exportée sert un seul
    # client depuis une origine que l'utilisateur choisit lui-même (pas
    # forcément localhost:5173, l'origine du serveur de dev Excelium).
    api_source = (BACKEND_DIR / "api.py").read_text(encoding="utf-8")
    patched = api_source.replace(
        'allow_origins=["http://localhost:5173"]',
        'allow_origins=["*"]',
    )
    zf.writestr("backend/api.py", patched)


def _write_frontend(zf: zipfile.ZipFile, session_id: str) -> None:
    if not DIST_EXPORT_DIR.exists():
        raise WebappZipError(
            "Le frontend d'export n'a pas été buildé. "
            "Lancez `npm run build:export` dans frontend/ avant d'exporter une webapp."
        )
    for path in DIST_EXPORT_DIR.rglob("*"):
        if path.is_file():
            arcname = f"frontend/{path.relative_to(DIST_EXPORT_DIR).as_posix()}"
            zf.write(path, arcname)
    zf.writestr("frontend/config.json", f'{{"sessionId": "{session_id}"}}')


ENV_EXAMPLE = """DB_HOST=localhost
DB_PORT=5432
DB_NAME=ma_webapp
DB_USER=postgres
DB_PASSWORD=
"""

README = """# Ma WebApp

Webapp générée par Excelium, prête à héberger où tu veux.

## Installation (une seule fois)

Il te faut PostgreSQL installé (le serveur, pas forcément avec une base déjà
créée) et Python 3. Depuis la racine du dossier dézippé :

```
python setup.py
```

Ce script installe les dépendances Python, te demande tes identifiants
PostgreSQL (avec des valeurs par défaut), crée la base si besoin, écrit
`backend/.env`, et importe automatiquement tes tables et tes données.

Tu peux aussi faire chaque étape à la main si tu préfères :
1. Crée une base PostgreSQL vide.
2. Copie `.env.example` en `.env` dans `backend/`, renseigne tes identifiants.
3. Installe les dépendances Python : `cd backend && pip install -r requirements.txt`
4. Importe tes données : `psql -U <utilisateur> -d <base> -f database/schema.sql`

## Lancer la webapp

Une seule commande, depuis la racine du dossier dézippé :

```
python start.py
```

Ça démarre le backend (port 8000) et sert le frontend (port 4173), puis
ouvre ta webapp directement dans le navigateur. `Ctrl+C` arrête les deux.

Pas de Node.js requis. Ne double-clique pas sur `export.html` directement
(`file://`) : les navigateurs bloquent alors le chargement de la
configuration — passe toujours par `start.py` ou un serveur de fichiers.
"""

SETUP_PY = '''"""Installation en une seule commande :
- installe les dépendances Python du backend
- demande les identifiants PostgreSQL (avec valeurs par défaut)
- crée la base si elle n'existe pas encore
- écrit backend/.env
- importe les tables et les données (database/schema.sql)

Usage : python setup.py (depuis la racine de ce dossier). À ne lancer
qu'une fois — relance-le si tu changes de base ou d'identifiants.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
SCHEMA_SQL = ROOT / "database" / "schema.sql"


def ask(label: str, default: str) -> str:
    value = input(f"{label} [{default}]: ").strip()
    return value or default


def install_dependencies() -> None:
    print("Installation des dépendances Python...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(BACKEND_DIR / "requirements.txt")],
        check=True,
    )


def collect_credentials() -> dict:
    print("\\nIdentifiants PostgreSQL (le serveur doit déjà être installé et démarré) :")
    return {
        "host": ask("Hôte", "localhost"),
        "port": ask("Port", "5432"),
        "user": ask("Utilisateur", "postgres"),
        "password": ask("Mot de passe", ""),
        "dbname": ask("Nom de la base", "ma_webapp"),
    }


def create_database_if_missing(creds: dict) -> None:
    import psycopg2
    from psycopg2 import errors

    admin_conn = psycopg2.connect(
        host=creds["host"], port=creds["port"], user=creds["user"],
        password=creds["password"], dbname="postgres",
    )
    admin_conn.autocommit = True
    try:
        with admin_conn.cursor() as cur:
            try:
                cur.execute(f'CREATE DATABASE "{creds["dbname"]}"')
                print(f"Base « {creds['dbname']} » créée.")
            except errors.DuplicateDatabase:
                print(f"Base « {creds['dbname']} » déjà existante, réutilisée.")
    finally:
        admin_conn.close()


def write_env_file(creds: dict) -> None:
    env_content = (
        f"DB_HOST={creds['host']}\\n"
        f"DB_PORT={creds['port']}\\n"
        f"DB_NAME={creds['dbname']}\\n"
        f"DB_USER={creds['user']}\\n"
        f"DB_PASSWORD={creds['password']}\\n"
    )
    (BACKEND_DIR / ".env").write_text(env_content, encoding="utf-8")
    print("backend/.env écrit.")


def import_schema(creds: dict) -> None:
    if not SCHEMA_SQL.exists():
        print("database/schema.sql introuvable, import ignoré.")
        return
    print("Import des tables et des données...")
    env = {"PGPASSWORD": creds["password"]} if creds["password"] else {}
    import os
    subprocess.run(
        [
            "psql", "-h", creds["host"], "-p", creds["port"], "-U", creds["user"],
            "-d", creds["dbname"], "-f", str(SCHEMA_SQL),
        ],
        check=True,
        env={**os.environ, **env},
    )


def main() -> None:
    install_dependencies()
    creds = collect_credentials()
    create_database_if_missing(creds)
    write_env_file(creds)
    import_schema(creds)
    print("\\nInstallation terminée. Lance la webapp avec : python start.py")


if __name__ == "__main__":
    main()
'''

START_PY = '''"""Lance la webapp complète en une seule commande :
- sert frontend/ en statique sur le port 4173
- démarre le backend (uvicorn) sur le port 8000
- ouvre le navigateur sur la webapp

Usage : python start.py (depuis la racine de ce dossier, après avoir suivi
les étapes d'installation du README).
"""

import functools
import http.server
import socketserver
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_DIR = ROOT / "backend"
FRONTEND_PORT = 4173
BACKEND_PORT = 8000


def serve_frontend() -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(FRONTEND_DIR))
    with socketserver.TCPServer(("", FRONTEND_PORT), handler) as httpd:
        httpd.serve_forever()


def main() -> None:
    threading.Thread(target=serve_frontend, daemon=True).start()

    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", str(BACKEND_PORT)],
        cwd=str(BACKEND_DIR),
    )

    time.sleep(2)
    webbrowser.open(f"http://localhost:{FRONTEND_PORT}/export.html")

    print(f"Webapp : http://localhost:{FRONTEND_PORT}/export.html")
    print(f"API    : http://localhost:{BACKEND_PORT}")
    print("Ctrl+C pour arrêter.")

    try:
        backend.wait()
    except KeyboardInterrupt:
        backend.terminate()


if __name__ == "__main__":
    main()
'''


def build_webapp_zip(conn, session_id: str) -> bytes:
    """Assemble et retourne le contenu binaire du zip pour une session."""
    session = load_session(conn, session_id)
    if session is None:
        raise WebappZipError("Session introuvable.", status_code=404)

    db_schema = session["dbSchema"]
    preset = session["preset"]

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        data_sql = _build_data_sql(db_schema)
        session_sql = _build_session_sql(session_id, db_schema, preset)
        zf.writestr("database/schema.sql", data_sql + "\n\n" + session_sql + "\n")

        _write_backend_source(zf)
        _write_frontend(zf, session_id)

        zf.writestr(".env.example", ENV_EXAMPLE)
        zf.writestr("README.md", README)
        zf.writestr("start.py", START_PY)
        zf.writestr("setup.py", SETUP_PY)

    buffer.seek(0)
    return buffer.read()
