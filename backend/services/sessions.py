"""Gestion des sessions utilisateur — sauvegarde et reprise."""

import json
import random
import string
from datetime import datetime


def _init_table(conn):
    """Crée la table sessions si elle n'existe pas."""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS _excelium_sessions (
            code        VARCHAR(8)   PRIMARY KEY,
            tables      TEXT         NOT NULL,
            config      JSONB        NOT NULL DEFAULT '{}',
            created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
        )
    """)
    conn.commit()
    cursor.close()


def _gen_code(conn) -> str:
    """Génère un code unique de 4 chiffres préfixé EXC-."""
    cursor = conn.cursor()
    for _ in range(20):
        code = 'EXC-' + ''.join(random.choices(string.digits, k=4))
        cursor.execute(
            "SELECT 1 FROM _excelium_sessions WHERE code = %s", (code,)
        )
        if cursor.fetchone() is None:
            cursor.close()
            return code
    cursor.close()
    raise RuntimeError("Impossible de générer un code unique.")


def save_session(conn, tables: list[str], config: dict) -> str:
    """Sauvegarde une session et retourne le code court."""
    _init_table(conn)
    code = _gen_code(conn)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO _excelium_sessions (code, tables, config)
        VALUES (%s, %s, %s)
        """,
        (code, ','.join(tables), json.dumps(config))
    )
    conn.commit()
    cursor.close()
    return code


def load_session(conn, code: str) -> dict | None:
    """Charge une session par son code. Retourne None si introuvable."""
    _init_table(conn)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT tables, config FROM _excelium_sessions WHERE code = %s",
        (code.upper(),)
    )
    row = cursor.fetchone()
    cursor.close()
    if row is None:
        return None
    tables_str, config = row
    return {
        'tables': [t.strip() for t in tables_str.split(',') if t.strip()],
        'config': config if isinstance(config, dict) else json.loads(config),
    }
