import re
from services.type_detector import get_column_values


# ─── Patterns PK avec scores ──────────────────────────────────────────────────

PK_NAME_PATTERNS = [
    # Exact
    (r'^id$',           10),
    (r'^uuid$',          9),
    (r'^matricule$',     9),
    (r'^identifiant$',   8),
    (r'^reference$',     7),
    (r'^code$',          7),
    (r'^numero$',        7),
    (r'^no$',            6),
    (r'^num$',           6),
    (r'^key$',           6),
    (r'^pk$',            6),
    (r'^seq$',           5),
    (r'^nro$',           5),
    # Préfixes
    (r'^id_',            8),
    (r'^uuid_',          7),
    (r'^code_',          6),
    (r'^num_',           6),
    (r'^no_',            6),
    (r'^ref_',           5),
    # Suffixes
    (r'_id$',            8),
    (r'_uuid$',          7),
    (r'_matricule$',     7),
    (r'_identifiant$',   7),
    (r'_code$',          6),
    (r'_no$',            6),
    (r'_num$',           6),
    (r'_number$',        6),
    (r'_numero$',        6),
    (r'_reference$',     6),
    (r'_ref$',           5),
    (r'_key$',           5),
    (r'_pk$',            5),
]

_compiled = [(re.compile(p), score) for p, score in PK_NAME_PATTERNS]

_UUID_RE   = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)
_CODE_RE   = re.compile(r'^([A-Za-z]{1,6})(\d+)$')


# ─── Scoring du nom ───────────────────────────────────────────────────────────

def pk_name_score(name):
    name = name.lower()
    best = 0
    for pattern, score in _compiled:
        if pattern.search(name):
            best = max(best, score)
    return best


# ─── Contraintes de base ──────────────────────────────────────────────────────

def is_unique_non_null(values):
    if not values:
        return False
    if any(v is None for v in values):
        return False
    return len(values) == len(set(values))


# ─── Signaux sur les valeurs ──────────────────────────────────────────────────

def _is_sequential(values):
    """Séquence numérique régulière : 1,2,3 ou 10,20,30..."""
    nums = []
    for v in values:
        if isinstance(v, bool):
            return False
        if isinstance(v, (int, float)) and float(v) == int(v):
            nums.append(int(v))
        else:
            return False
    if len(nums) < 2:
        return False
    s = sorted(nums)
    step = s[1] - s[0]
    return step > 0 and all(s[i+1] - s[i] == step for i in range(len(s) - 1))


def _all_uuid(values):
    """Toutes les valeurs sont au format UUID."""
    strs = [str(v).strip() for v in values if v is not None]
    return bool(strs) and all(_UUID_RE.match(v) for v in strs)


def _all_fixed_prefix_codes(values):
    """Toutes les valeurs sont du type PREFIXE+chiffres avec le même préfixe (EMP001, PRD042...)."""
    strs = [str(v).strip() for v in values if v is not None]
    if len(strs) < 2:
        return False
    matches = [_CODE_RE.match(v) for v in strs]
    if not all(matches):
        return False
    return len({m.group(1) for m in matches}) == 1


def _all_code_format(values):
    """Toutes les valeurs sont du type PREFIXE+chiffres, préfixes variables (IFT1015, MAT1400, PHY1001...)."""
    strs = [str(v).strip() for v in values if v is not None]
    if len(strs) < 2:
        return False
    return all(_CODE_RE.match(v) for v in strs)


def _value_format_score(values):
    if _all_uuid(values):
        return 4
    if _is_sequential(values):
        return 4
    if _all_fixed_prefix_codes(values):
        return 3
    if _all_code_format(values):
        return 2
    return 0


# ─── Détection principale ─────────────────────────────────────────────────────

def get_pk_candidates(table):
    """Returns {col_name: total_score} for all unique+non-null columns with positive PK signal."""
    result = {}
    for column in table.get_columns():
        values = get_column_values(table, column)
        if not is_unique_non_null(values):
            continue
        name_score = pk_name_score(column.name)
        format_bonus = _value_format_score(values)
        if name_score == 0 and format_bonus == 0:
            continue
        result[column.name] = name_score + format_bonus
    return result


def detect_primary_keys(workbook):
    for table in workbook.get_all_tables():

        for column in table.get_columns():
            column.set_primary_key(False)

        best_col   = None
        best_score = 0

        for column in table.get_columns():
            values = get_column_values(table, column)
            if not is_unique_non_null(values):
                continue

            name_score   = pk_name_score(column.name)
            format_bonus = _value_format_score(values)

            # Au moins un signal positif obligatoire (nom ou format)
            if name_score == 0 and format_bonus == 0:
                continue

            total = name_score + format_bonus

            if total > best_score:
                best_score = total
                best_col   = column

        if best_col is not None:
            best_col.set_primary_key(True)
