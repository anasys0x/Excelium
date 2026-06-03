def map_to_sql(python_type):
    type_mapping = {
        str: "TEXT",
        int: "INTEGER",
        float: "FLOAT",
        bool: "BOOLEAN",
    }

    return type_mapping.get(python_type, "TEXT")

def map_all_columns_to_sql(column_types: dict):
    sql_types = {}

    for key in column_types.keys():
        sql_types[key] = map_to_sql(column_types[key])
    return sql_types

def create_table_sql(table_name, sql_types : dict):
    columns_sql = []

    for column_name, sql_type in sql_types.items():
        columns_sql.append(f"{column_name} {sql_type}")

    columns_sql_text = ", ".join(columns_sql)

    sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_sql_text});"

    return sql
