def execute_sql(conn, sql):

    cursor = conn.cursor()

    cursor.execute(sql)

    conn.commit()

    cursor.close()