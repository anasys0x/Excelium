from datetime import date, datetime

from utils import slugify


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _to_param(value):
    """Converts a Python value to a psycopg2-safe parameter.
    Dates are converted to ISO string so PostgreSQL accepts them correctly.
    """
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d')
    if isinstance(value, date):
        return value.strftime('%Y-%m-%d')
    return value


def _get_pk_column(table):
    for col in table.get_columns():
        if col.is_primary_key and not col.is_serial:
            return col
    return None


# ─── DDL ─────────────────────────────────────────────────────────────────────

def generate_create_table_sql(table):
    table_name = slugify(table.name)

    columns_sql = []
    for col in table.get_columns():
        col_name = slugify(col.name)
        if col.is_serial:
            columns_sql.append(f"{col_name} SERIAL PRIMARY KEY")
        else:
            definition = f"{col_name} {col.relational_type.value}"
            if col.is_primary_key:
                definition += " PRIMARY KEY"
            columns_sql.append(definition)

    return f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(columns_sql)});"


# ─── DML — parameterized ─────────────────────────────────────────────────────

def generate_sync_sql(table):
    """Returns (before, inserts, after) where each item is a (sql, params) tuple.

    Without real PK : TRUNCATE CASCADE + simple INSERTs
    With real PK    : upserts (ON CONFLICT DO UPDATE) + DELETE of removed rows
    """
    table_name = slugify(table.name)
    pk_col = _get_pk_column(table)
    columns = [col for col in table.get_columns() if not col.is_serial]

    if pk_col is None:
        # CASCADE handles FK references to this SERIAL table
        before = [(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;", None)]
        inserts = _generate_inserts(table_name, columns, table.get_rows())
        return before, inserts, []

    # Real PK → upsert + DELETE of rows no longer in Excel
    non_pk_cols = [col for col in columns if col.name != pk_col.name]
    col_names_sql = ", ".join(slugify(col.name) for col in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    pk_slug = slugify(pk_col.name)

    inserts = []
    pk_values = []

    for row in table.get_rows():
        params = tuple(_to_param(row.get(col.name)) for col in columns)
        pk_val = _to_param(row.get(pk_col.name))
        pk_values.append(pk_val)

        if non_pk_cols:
            update_set = ", ".join(
                f"{slugify(col.name)} = EXCLUDED.{slugify(col.name)}"
                for col in non_pk_cols
            )
            sql = (
                f"INSERT INTO {table_name} ({col_names_sql}) VALUES ({placeholders}) "
                f"ON CONFLICT ({pk_slug}) DO UPDATE SET {update_set};"
            )
        else:
            sql = (
                f"INSERT INTO {table_name} ({col_names_sql}) VALUES ({placeholders}) "
                f"ON CONFLICT ({pk_slug}) DO NOTHING;"
            )
        inserts.append((sql, params))

    after = []
    if pk_values:
        placeholders_pk = ", ".join(["%s"] * len(pk_values))
        after.append((
            f"DELETE FROM {table_name} WHERE {pk_slug} NOT IN ({placeholders_pk});",
            tuple(pk_values)
        ))

    return [], inserts, after


def _generate_inserts(table_name, columns, rows):
    col_names_sql = ", ".join(slugify(col.name) for col in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    inserts = []
    for row in rows:
        params = tuple(_to_param(row.get(col.name)) for col in columns)
        inserts.append((
            f"INSERT INTO {table_name} ({col_names_sql}) VALUES ({placeholders});",
            params
        ))
    return inserts


# ─── FK constraints ───────────────────────────────────────────────────────────

def generate_fk_sql(relational_db):
    """Returns plain SQL strings (no user data, safe to build as strings)."""
    statements = []
    for table in relational_db.get_tables():
        table_name = slugify(table.name)
        for constraint in table.get_constraints():
            from models.relational.foreign_key import ForeignKey
            if isinstance(constraint, ForeignKey):
                col_name  = slugify(constraint.column_name)
                ref_table = slugify(constraint.ref_table)
                ref_col   = slugify(constraint.ref_column)
                cname = f"fk_{table_name}_{col_name}"
                statements.append(
                    f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {cname};"
                )
                statements.append(
                    f"ALTER TABLE {table_name} ADD CONSTRAINT {cname} "
                    f"FOREIGN KEY ({col_name}) REFERENCES {ref_table} ({ref_col});"
                )
    return statements
