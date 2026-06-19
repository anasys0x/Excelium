import psycopg2
from errors import DatabaseExecutionError


def execute_sql(conn, sql):
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
