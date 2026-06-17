def generate_create_table_sql(table):
    table_name = table.name.lower().replace(" ", "_")

    columns_sql = []
    for column in table.get_columns():
        sql_type = column.get_sql_type()
        if sql_type is None:
            continue
        definition = f"{column.name} {sql_type.value}"
        if column.is_primary_key:
            definition += " PRIMARY KEY"
        columns_sql.append(definition)

    return f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(columns_sql)});"


def generate_insert_sql(table):
    table_name = table.name.lower().replace(" ", "_")
    columns = table.get_columns()
    column_names = ", ".join(col.name for col in columns)

    inserts = []
    for row in table.get_rows():
        cells = row.get_cells()

        # Aligne les cellules sur les colonnes par index
        values = []
        for col in columns:
            cell = next((c for c in cells if c.column_index == col.index + 1), None)
            value = cell.value if cell else None

            if value is None:
                values.append("NULL")
            elif isinstance(value, str):
                escaped = value.replace("'", "''")
                values.append(f"'{escaped}'")
            else:
                values.append(str(value))

        inserts.append(
            f"INSERT INTO {table_name} ({column_names}) "
            f"VALUES ({', '.join(values)}) "
            f"ON CONFLICT DO NOTHING;"
        )

    return inserts
