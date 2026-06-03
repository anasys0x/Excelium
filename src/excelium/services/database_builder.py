import sqlite3
def execute_sql(sql):
    con = sqlite3.connect("excelium.db")
    cur = con.cursor()
    cur.execute(sql)
    con.commit()
    con.close()