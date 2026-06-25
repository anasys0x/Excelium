"""Crée les tables PostgreSQL à partir de la configuration finale du frontend.

Le frontend a déjà fait tout le travail sémantique (noms de colonnes, types,
clé primaire, réorganisation, id auto). On reçoit donc la config telle quelle
et on génère + exécute le SQL, sans re-parser l'Excel.
"""

from datetime import date, datetime

from utils import slugify
from constants import DATE_FORMATS


# Excel/détecté → type PostgreSQL
SQL_TYPES = {
    "INT": "INTEGER",
    "FLOAT": "DOUBLE PRECISION",
    "STRING": "TEXT",
    "DATE": "DATE",
    "BOOL": "BOOLEAN",
    "MIXED": "TEXT",
}


def _ident(name: str) -> str:
    """Identifiant SQL sûr et entre guillemets (gère accents, espaces, mots réservés)."""
    return '"' + slugify(name) + '"'


def _parse_date(value):
    """Convertit une valeur en date Python, ou None si non reconnue."""
    if isinstance(value, (date, datetime)):
        return value

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.fromisoformat(text)  # gère "2017-10-15T00:00:00"
    except ValueError:
        pass

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass

    return None


def _coerce(value, col_type: str):
    """Prépare une valeur pour psycopg2 selon le type de colonne."""
    if value is None:
        return None
    if col_type == "DATE":
        return _parse_date(value)
    if col_type in ("STRING", "MIXED"):
        return str(value)
    return value


def _build_create_sql(table_ident: str, columns: list[dict]) -> str:
    definitions = []
    for col in columns:
        sql_type = SQL_TYPES.get(col["type"], "TEXT")
        definition = f'{_ident(col["name"])} {sql_type}'
        if col.get("isPrimaryKey"):
            definition += " PRIMARY KEY"
        definitions.append(definition)
    return f'CREATE TABLE {table_ident} ({", ".join(definitions)});'


def create_tables(conn, tables: list[dict]) -> list[dict]:
    """Crée (recrée) chaque table et insère ses lignes. Tout ou rien (transaction)."""
    results = []
    cursor = conn.cursor()

    try:
        for table in tables:
            table_ident = _ident(table["tableName"])
            columns = table["columns"]
            rows = table["rows"]

            # Recréation propre pour que relancer la création soit idempotent
            cursor.execute(f"DROP TABLE IF EXISTS {table_ident} CASCADE;")
            cursor.execute(_build_create_sql(table_ident, columns))

            if rows:
                col_names = ", ".join(_ident(c["name"]) for c in columns)
                placeholders = ", ".join(["%s"] * len(columns))
                insert_sql = (
                    f"INSERT INTO {table_ident} ({col_names}) "
                    f"VALUES ({placeholders})"
                )
                params = [
                    tuple(
                        _coerce(row[i] if i < len(row) else None, columns[i]["type"])
                        for i in range(len(columns))
                    )
                    for row in rows
                ]
                cursor.executemany(insert_sql, params)

            results.append({
                "table": slugify(table["tableName"]),
                "rows": len(rows),
            })

        conn.commit()
        return results

    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
