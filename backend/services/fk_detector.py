from services.type_detector import get_column_values
from models.relational.foreign_key import ForeignKey


# ─── Détection de clés étrangères ─────────────────────────────────────────────

def get_pk_column(table):
    for col in table.get_columns():
        if col.is_primary_key and not col.is_serial:
            return col
    return None


def values_are_subset(col_values, pk_values):
    if not col_values:
        return False
    pk_set = set(pk_values)
    return all(v in pk_set for v in col_values if v is not None)


def detect_foreign_keys(excel_workbook, relational_db):
    excel_tables = excel_workbook.get_all_tables()
    rel_tables = relational_db.get_tables()

    # Construire un index : nom_colonne_pk → (rel_table, excel_table)
    pk_index = {}
    for rel_table, excel_table in zip(rel_tables, excel_tables):
        pk_col = get_pk_column(rel_table)
        if pk_col is not None:
            pk_values = [
                row.get(pk_col.name)
                for row in rel_table.get_rows()
                if row.get(pk_col.name) is not None
            ]
            pk_index[pk_col.name] = (rel_table, pk_col, pk_values)

    # Pour chaque table, chercher les colonnes qui référencent un PK
    for rel_table, excel_table in zip(rel_tables, excel_tables):
        for excel_col in excel_table.get_columns():
            if excel_col.is_primary_key:
                continue

            if excel_col.name not in pk_index:
                continue

            ref_rel_table, ref_pk_col, pk_values = pk_index[excel_col.name]

            if ref_rel_table.name == rel_table.name:
                continue

            col_values = get_column_values(excel_table, excel_col)

            if not values_are_subset(col_values, pk_values):
                continue

            # FK détectée → on la set sur la TableColumn relationnelle
            rel_col = next(
                (c for c in rel_table.get_columns() if c.name == excel_col.name),
                None
            )
            if rel_col is not None:
                fk = ForeignKey(
                    column_name=excel_col.name,
                    ref_table=ref_rel_table.name,
                    ref_column=ref_pk_col.name
                )
                rel_col.set_foreign_key(fk)
                rel_table.add_constraint(fk)
                print(f"  [FK] {rel_table.name}.{excel_col.name} -> {ref_rel_table.name}.{ref_pk_col.name}")
