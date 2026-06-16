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