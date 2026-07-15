"""Persistance des sessions de génération de webapp (schéma + preset UI).

Fondation pour la reprise de session (.taches/reprise-session.md) : chaque
création génère un identifiant, sauvegardé avec le schéma confirmé et le
preset UI calculé par le questionnaire.
"""

import uuid

import psycopg2.extras

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS webapp_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_json JSONB NOT NULL,
  preset_json JSONB NOT NULL
);
"""


def ensure_sessions_table(conn) -> None:
    cursor = conn.cursor()
    try:
        cursor.execute(CREATE_TABLE_SQL)
        conn.commit()
    finally:
        cursor.close()


def save_session(conn, schema: dict, preset: dict) -> str:
    """Enregistre une session et retourne son identifiant (UUID, str)."""
    ensure_sessions_table(conn)
    session_id = str(uuid.uuid4())
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO webapp_sessions (id, schema_json, preset_json) VALUES (%s, %s, %s);",
            (session_id, psycopg2.extras.Json(schema), psycopg2.extras.Json(preset)),
        )
        conn.commit()
    finally:
        cursor.close()
    return session_id


def load_session(conn, session_id: str) -> dict | None:
    """Retourne le schéma et le preset d'une session, ou None si elle n'existe pas."""
    ensure_sessions_table(conn)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, created_at, schema_json, preset_json
            FROM webapp_sessions
            WHERE id = %s;
            """,
            (session_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return {
            "id": str(row[0]),
            "createdAt": row[1].isoformat(),
            "dbSchema": row[2],
            "preset": row[3],
        }
    finally:
        cursor.close()
