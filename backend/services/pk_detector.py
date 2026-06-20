import re
from services.type_detector import get_column_values


# ─── Patterns stricts de nom PK ───────────────────────────────────────────────

PK_NAME_PATTERNS = [
    # Anglais
    r'^id$',            # id
    r'^id_',            # id_employe, id_client
    r'_id$',            # employee_id, order_id
    r'^uuid$',          # uuid
    r'_uuid$',          # employe_uuid
    r'^code$',          # code
    r'_code$',          # product_code
    r'_no$',            # employe_no, order_no
    r'_num$',           # employe_num
    r'_number$',        # order_number, invoice_number
    r'_key$',           # product_key, surrogate_key
    r'_ref$',           # order_ref, client_ref
    r'_pk$',            # employe_pk

    # Français
    r'^matricule$',     # matricule
    r'_matricule$',     # employe_matricule
    r'^numero$',        # numero
    r'_numero$',        # employe_numero
    r'^identifiant$',   # identifiant
    r'_identifiant$',   # employe_identifiant
    r'^reference$',     # reference
    r'_reference$',     # commande_reference
]

_compiled = [re.compile(p) for p in PK_NAME_PATTERNS]


def matches_pk_name(name):
    name = name.lower()
    return any(p.search(name) for p in _compiled)


# ─── Fonctions ────────────────────────────────────────────────────────────────

def is_unique_non_null(values):
    if not values:
        return False
    if any(v is None for v in values):
        return False
    return len(values) == len(set(values))


def detect_primary_keys(workbook):
    for table in workbook.get_all_tables():

        for column in table.get_columns():
            column.set_primary_key(False)

        for column in table.get_columns():
            values = get_column_values(table, column)
            if matches_pk_name(column.name) and is_unique_non_null(values):
                column.set_primary_key(True)
                break
