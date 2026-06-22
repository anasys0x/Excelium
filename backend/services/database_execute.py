import psycopg2
from errors import DatabaseExecutionError


def execute_sql(conn, sql):
    """Executes DDL or parameter-free SQL (CREATE, TRUNCATE, ALTER, DROP)."""
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        raise DatabaseExecutionError(
            f"Erreur SQL : {e.pgerror or str(e)}\n  Requête : {sql[:120]}"
        )
    finally:
        cursor.close()


def execute_sql_params(conn, sql, params):
    """Executes a parameterized DML statement (INSERT, UPDATE, DELETE).
    Uses psycopg2 placeholders (%s) — prevents SQL injection.
    """
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        raise DatabaseExecutionError(
            f"Erreur SQL : {e.pgerror or str(e)}\n  Requête : {sql[:120]}"
        )
    finally:
        cursor.close()


def table_exists(conn, table_name):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s);",
            (table_name.lower(),)
        )
        return cursor.fetchone()[0]
    finally:
        cursor.close()


def get_table_columns(conn, table_name):
    """Returns the set of column names that currently exist in the DB table."""
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s;",
            (table_name.lower(),)
        )
        return {row[0] for row in cursor.fetchall()}
    finally:
        cursor.close()
