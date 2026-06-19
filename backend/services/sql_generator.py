def generate_create_table_sql(table):
    table_name = table.name.lower().replace(" ", "_")

    columns_sql = []
    for col in table.get_columns():
        if col.is_serial:
            columns_sql.append(f"{col.name} SERIAL PRIMARY KEY")
        else:
            definition = f"{col.name} {col.relational_type.value}"
            if col.is_primary_key:
                definition += " PRIMARY KEY"
            columns_sql.append(definition)

    return f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(columns_sql)});"


def _format_value(value):
    if value is None:
        return "NULL"
    if isinstance(value, str):
        return f"'{value.replace(chr(39), chr(39)*2)}'"
    return str(value)


def _get_pk_column(table):
    for col in table.get_columns():
        if col.is_primary_key and not col.is_serial:
            return col
    return None


def generate_sync_sql(table):
    """
    Retourne (statements_avant_insert, inserts, statements_après_insert).
    - Sans PK réel : TRUNCATE + INSERTs simples
    - Avec PK réel : upserts + DELETE des lignes supprimées
    """
    table_name = table.name.lower().replace(" ", "_")
    pk_col = _get_pk_column(table)
    columns = [col for col in table.get_columns() if not col.is_serial]

    if pk_col is None:
        # Pas de PK réel → TRUNCATE + INSERT
        before = [f"TRUNCATE TABLE {table_name} RESTART IDENTITY;"]
        inserts = _generate_inserts(table_name, columns, table.get_rows())
        after = []
        return before, inserts, after

    # PK réel → upsert + DELETE
    non_pk_cols = [col for col in columns if col.name != pk_col.name]
    column_names = ", ".join(col.name for col in columns)

    inserts = []
    pk_values = []

    for row in table.get_rows():
        values = [_format_value(row.get(col.name)) for col in columns]
        pk_val = _format_value(row.get(pk_col.name))
        pk_values.append(pk_val)

        if non_pk_cols:
            update_set = ", ".join(
                f"{col.name} = EXCLUDED.{col.name}" for col in non_pk_cols
            )
            inserts.append(
                f"INSERT INTO {table_name} ({column_names}) VALUES ({', '.join(values)}) "
                f"ON CONFLICT ({pk_col.name}) DO UPDATE SET {update_set};"
            )
        else:
            inserts.append(
                f"INSERT INTO {table_name} ({column_names}) VALUES ({', '.join(values)}) "
                f"ON CONFLICT ({pk_col.name}) DO NOTHING;"
            )

    # Supprimer les lignes qui ne sont plus dans l'Excel
    after = []
    if pk_values:
        after.append(
            f"DELETE FROM {table_name} WHERE {pk_col.name} NOT IN ({', '.join(pk_values)});"
        )

    return [], inserts, after


def _generate_inserts(table_name, columns, rows):
    column_names = ", ".join(col.name for col in columns)
    inserts = []
    for row in rows:
        values = [_format_value(row.get(col.name)) for col in columns]
        inserts.append(
            f"INSERT INTO {table_name} ({column_names}) VALUES ({', '.join(values)});"
        )
    return inserts


def generate_insert_sql(table):
    columns = [col for col in table.get_columns() if not col.is_serial]
    return _generate_inserts(
        table.name.lower().replace(" ", "_"),
        columns,
        table.get_rows()
    )
