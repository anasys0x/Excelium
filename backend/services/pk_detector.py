from models.excel_type import Type
from services.type_detector import get_column_values


# ─── Constantes ───────────────────────────────────────────────────────────────

PK_NAME_KEYWORDS = {"id", "code", "num", "number", "key", "ref", "uuid", "no"}


# ─── Fonctions ────────────────────────────────────────────────────────────────

def is_primary_key_candidate(values):
    if not values:
        return False
    if any(v is None for v in values):
        return False
    if len(values) != len(set(values)):
        return False
    return True


def primary_key_score(column, detected_type):
    score = 0
    name = column.name.lower()

    if any(
        kw == name or name.startswith(kw + "_") or name.endswith("_" + kw)
        for kw in PK_NAME_KEYWORDS
    ):
        score += 3

    if detected_type == Type.INT:
        score += 2

    if column.index == 0:
        score += 1

    return score


def detect_primary_keys(workbook):
    for table in workbook.get_all_tables():

        for column in table.get_columns():
            column.set_primary_key(False)

        best_column = None
        best_score = -1

        for column in table.get_columns():
            values = get_column_values(table, column)

            if not is_primary_key_candidate(values):
                continue

            score = primary_key_score(column, column.detected_type)

            if score > best_score:
                best_score = score
                best_column = column

        if best_column is not None:
            best_column.set_primary_key(True)
