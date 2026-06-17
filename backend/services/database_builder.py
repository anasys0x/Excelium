def generate_create_table_sql(table):

    table_name = table.name.lower().replace(" ", "_")

    columns_sql = []

    for column in table.get_columns():

        sql_type = column.get_sql_type()

        if sql_type is None:
            continue

        column_definition = f"{column.name} {sql_type.value}"

        if column.is_primary_key:
            column_definition += " PRIMARY KEY"

        columns_sql.append(column_definition)

    columns_text = ", ".join(columns_sql)

    return f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_text});"


def generate_insert_sql(table):

    table_name = table.name.lower().replace(" ", "_")

    inserts = []

    for row in table.get_rows():

        values = []

        for cell in row.get_cells():

            if cell.value is None:
                values.append("NULL")

            elif isinstance(cell.value, str):
                values.append(f"'{cell.value}'")

            else:
                values.append(str(cell.value))

        values_text = ", ".join(values)

        inserts.append(
            f"INSERT INTO {table_name} VALUES ({values_text}) ON CONFLICT DO NOTHING;"
        )

    return inserts
