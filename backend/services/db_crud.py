"""Opérations CRUD génériques sur n'importe quelle table PostgreSQL."""

from datetime import date, datetime
from utils import slugify


def _ident(name: str) -> str:
    return '"' + slugify(name) + '"'


def _serialize(value):
    """Rend une valeur JSON-compatible."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def get_table_schema(conn, table_name: str) -> list[dict]:
    """Retourne la liste des colonnes avec nom, type applicatif et flag isPrimaryKey."""
    safe_name = slugify(table_name)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema   = kcu.table_schema
        WHERE tc.table_name      = %s
          AND tc.table_schema    = 'public'
          AND tc.constraint_type = 'PRIMARY KEY'
    """, (safe_name,))
    pk_cols = {row[0] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name   = %s
          AND table_schema = 'public'
        ORDER BY ordinal_position
    """, (safe_name,))

    PG_TO_APP = {
        'integer':                     'INT',
        'bigint':                      'INT',
        'smallint':                    'INT',
        'double precision':            'FLOAT',
        'numeric':                     'FLOAT',
        'real':                        'FLOAT',
        'text':                        'STRING',
        'character varying':           'STRING',
        'character':                   'STRING',
        'date':                        'DATE',
        'timestamp without time zone': 'DATE',
        'timestamp with time zone':    'DATE',
        'boolean':                     'BOOL',
    }

    cols = [
        {
            'name':         col_name,
            'type':         PG_TO_APP.get(data_type, 'STRING'),
            'isPrimaryKey': col_name in pk_cols,
        }
        for col_name, data_type in cursor.fetchall()
    ]
    cursor.close()
    return cols


def get_table_rows(conn, table_name: str) -> list[dict]:
    """Retourne toutes les lignes triées par la première colonne."""
    table_ident = _ident(table_name)
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM {table_ident} ORDER BY 1')
    col_names = [desc[0] for desc in cursor.description]
    rows = [
        {k: _serialize(v) for k, v in zip(col_names, row)}
        for row in cursor.fetchall()
    ]
    cursor.close()
    return rows


def insert_row(conn, table_name: str, data: dict) -> dict:
    """Insère une ligne et retourne la ligne créée."""
    table_ident = _ident(table_name)
    cursor = conn.cursor()

    cols         = list(data.keys())
    col_idents   = ', '.join(_ident(c) for c in cols)
    placeholders = ', '.join(['%s'] * len(cols))

    cursor.execute(
        f'INSERT INTO {table_ident} ({col_idents}) VALUES ({placeholders}) RETURNING *',
        list(data.values()),
    )
    col_names = [desc[0] for desc in cursor.description]
    result = {k: _serialize(v) for k, v in zip(col_names, cursor.fetchone())}
    conn.commit()
    cursor.close()
    return result


def update_row(conn, table_name: str, pk_col: str, pk_value, data: dict) -> dict | None:
    """Met à jour la ligne identifiée par pk_value et retourne la ligne modifiée."""
    table_ident = _ident(table_name)
    pk_ident    = _ident(pk_col)
    cursor      = conn.cursor()

    set_clause = ', '.join(f'{_ident(k)} = %s' for k in data.keys())
    cursor.execute(
        f'UPDATE {table_ident} SET {set_clause} WHERE {pk_ident} = %s RETURNING *',
        list(data.values()) + [pk_value],
    )
    row = cursor.fetchone()
    if row is None:
        conn.commit()
        cursor.close()
        return None

    col_names = [desc[0] for desc in cursor.description]
    result = {k: _serialize(v) for k, v in zip(col_names, row)}
    conn.commit()
    cursor.close()
    return result


def delete_row(conn, table_name: str, pk_col: str, pk_value) -> bool:
    """Supprime la ligne identifiée par pk_value."""
    table_ident = _ident(table_name)
    pk_ident    = _ident(pk_col)
    cursor      = conn.cursor()
    cursor.execute(f'DELETE FROM {table_ident} WHERE {pk_ident} = %s', (pk_value,))
    deleted = cursor.rowcount > 0
    conn.commit()
    cursor.close()
    return deleted


def _serialize_dict(d: dict) -> dict:
    return {k: _serialize(v) for k, v in d.items()}


def _get_fk_refs(cursor, table_name: str, pk_col: str) -> list[tuple[str, str]]:
    """Retourne (fk_table, fk_column) pour toutes les FK qui pointent vers table_name.pk_col."""
    cursor.execute("""
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON  kcu.constraint_name   = rc.constraint_name
          AND kcu.constraint_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON  ccu.constraint_name   = rc.unique_constraint_name
          AND ccu.constraint_schema = rc.unique_constraint_schema
        WHERE ccu.table_name  = %s
          AND ccu.column_name = %s
    """, (table_name, pk_col))
    return cursor.fetchall()


def get_row_references(conn, table_name: str, pk_col: str, pk_value) -> list[dict]:
    """Retourne les lignes dépendantes de cette valeur de PK dans les tables FK."""
    cursor = conn.cursor()
    try:
        refs = _get_fk_refs(cursor, table_name, pk_col)
        results = []
        for fk_table, fk_col in refs:
            cursor.execute(
                f'SELECT COUNT(*) FROM {_ident(fk_table)} WHERE {_ident(fk_col)} = %s',
                (pk_value,)
            )
            count = cursor.fetchone()[0]
            if count > 0:
                cursor.execute(
                    f'SELECT * FROM {_ident(fk_table)} WHERE {_ident(fk_col)} = %s LIMIT 50',
                    (pk_value,)
                )
                cols    = [d[0] for d in cursor.description]
                preview = [_serialize_dict(dict(zip(cols, r))) for r in cursor.fetchall()]
                results.append({
                    'table':   fk_table,
                    'column':  fk_col,
                    'count':   count,
                    'preview': preview,
                })
        return results
    finally:
        cursor.close()


def delete_row_cascade(conn, table_name: str, pk_col: str, pk_value) -> bool:
    """Supprime toutes les lignes dépendantes (via FK) puis la ligne elle-même."""
    cursor = conn.cursor()
    try:
        refs = _get_fk_refs(cursor, table_name, pk_col)
        for fk_table, fk_col in refs:
            cursor.execute(
                f'DELETE FROM {_ident(fk_table)} WHERE {_ident(fk_col)} = %s',
                (pk_value,)
            )
        cursor.execute(
            f'DELETE FROM {_ident(table_name)} WHERE {_ident(pk_col)} = %s',
            (pk_value,)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
