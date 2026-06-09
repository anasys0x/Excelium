def generate_create_table_sql(worksheet):

    table_name = worksheet.name.lower().replace(" ", "_")

    columns_sql = []

    for column in worksheet.get_columns():

        sql_type = column.get_sql_type()

        if sql_type is None:
            continue

        column_definition = (
            f"{column.name} {sql_type.value}"
        )

        if column.is_primary_key:
            column_definition += " PRIMARY KEY"

        columns_sql.append(
            column_definition
        )

    columns_text = ", ".join(columns_sql)

    sql = (
        f"CREATE TABLE IF NOT EXISTS "
        f"{table_name} "
        f"({columns_text});"
    )

    return sql
    
def generate_insert_sql(worksheet):

    
    table_name = worksheet.name.lower().replace(" ", "_")

    inserts = []

    for row in worksheet.get_rows():

        values = []

        for cell in row.get_cells():

            if cell.value is None:
                values.append("NULL")

            elif isinstance(cell.value, str):
                values.append(
                    f"'{cell.value}'"
                )

            else:
                values.append(
                    str(cell.value)
                )

        values_text = ", ".join(values)

        sql = (
            f"INSERT INTO {table_name} "
            f"VALUES ({values_text})"
            f"ON CONFLICT DO NOTHING;"
        )

        inserts.append(sql)

    return inserts