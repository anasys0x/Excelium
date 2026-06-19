import re
from services.type_detector import get_column_values


# ─── Patterns stricts de nom PK ───────────────────────────────────────────────

PK_NAME_PATTERNS = [
    r'^id$',
    r'_id$',
    r'^code$',
    r'_code$',
    r'_no$',
    r'^uuid$',
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
