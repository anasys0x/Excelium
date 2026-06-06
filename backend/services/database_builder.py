def generate_create_table_sql(worksheet):

    table_name = worksheet.name.lower().replace(" ", "_")

    columns_sql = []

    for column in worksheet.get_columns():

        sql_type = column.get_sql_type()

        if sql_type is None:
            continue

        columns_sql.append(
            f"{column.name} {sql_type.value}"
        )

    columns_text = ", ".join(columns_sql)

    sql = (
        f"CREATE TABLE IF NOT EXISTS "
        f"{table_name} "
        f"({columns_text});"
    )

    return sql