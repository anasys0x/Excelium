import re
from models.excel.excel_type import Type
from models.relational.foreign_key import ForeignKey
from services.type_detector import get_column_values


# ─── Config ───────────────────────────────────────────────────────────────────

_FK_COMPATIBLE_TYPES = {Type.INT, Type.STRING}

# Seuil de validation par les données : au moins 95% des valeurs non-nulles
# de la colonne candidate doivent exister dans la PK cible pour créer la FK.
# On tolère 5% de lignes orphelines (données réelles souvent imparfaites).
FK_SUBSET_THRESHOLD = 0.95

# Fonctions Excel qui encodent une relation de lookup vers une autre feuille.
# Chaque fonction est cherchée sous son nom anglais ET français, car les deux
# peuvent apparaître selon l'origine du fichier :
#   VLOOKUP / RECHERCHEV, HLOOKUP / RECHERCHEH, XLOOKUP / RECHERCHEX,
#   LOOKUP / RECHERCHE, MATCH / EQUIV, XMATCH / EQUIVX
#
# Deux familles, selon l'ordre des arguments :
#   - "valeur d'abord" (VLOOKUP, MATCH...)      : func(valeur_cherchée, Feuille!plage, ...)
#   - "plage d'abord"  (SUMIF, COUNTIF...)      : func(Feuille!plage, critère, ...)
#   - "plage décalée"  (SUMIFS)                 : func(somme_plage, Feuille!plage, critère, ...)
# Dans tous les cas on capture (1) lettre de la colonne source (référence absolue
# $A2 / A$2 / $A$2 ou relative A2 — le $ est optionnel devant la lettre ET le chiffre),
# (2) nom de la feuille cible, (3) lettre de la première colonne du range cible —
# quel que soit l'ordre dans lequel ils apparaissent réellement dans la formule.

_VALUE_FIRST_FUNCTIONS = [
    'VLOOKUP', 'RECHERCHEV',
    'HLOOKUP', 'RECHERCHEH',
    'XLOOKUP', 'RECHERCHEX',
    'LOOKUP', 'RECHERCHE',
    'MATCH', 'EQUIV',
    'XMATCH', 'EQUIVX',
]
# func( valeur_source , 'Feuille'!plage_cible ...
_VALUE_FIRST_TEMPLATE = r'\b{name}\(\s*\$?([A-Z]+)\$?\d+\s*,\s*\'?([^!\']+?)\'?!\$?([A-Z]+)'

# SUMIF, COUNTIF, COUNTIFS et leurs équivalents français : la plage-critère
# (référence vers la feuille cible) est le 1er argument, la valeur cherchée le 2e.
_RANGE_FIRST_FUNCTIONS = [
    'SUMIF', 'SOMME.SI',
    'COUNTIF', 'NB.SI',
    'COUNTIFS', 'NB.SI.ENS',
]
# func( 'Feuille'!plage_cible , valeur_source ...
_RANGE_FIRST_TEMPLATE = r'\b{name}\(\s*\'?([^!\']+?)\'?!\$?([A-Z]+)[^,]*,\s*\$?([A-Z]+)\$?\d+'

# SUMIFS / SOMME.SI.ENS : un 1er argument "somme_plage" précède la plage-critère.
_SHIFTED_RANGE_FIRST_FUNCTIONS = ['SUMIFS', 'SOMME.SI.ENS']
# func( somme_plage , 'Feuille'!plage_cible , valeur_source ...
_SHIFTED_RANGE_FIRST_TEMPLATE = r'\b{name}\(\s*[^,]+,\s*\'?([^!\']+?)\'?!\$?([A-Z]+)[^,]*,\s*\$?([A-Z]+)\$?\d+'

# Chaque entrée : (regex compilée, ordre des groupes capturés dans le pattern).
# 'value-first'  → groupes (src, sheet, tgt)
# 'range-first'  → groupes (sheet, tgt, src)
_LOOKUP_PATTERNS = (
    [(re.compile(_VALUE_FIRST_TEMPLATE.format(name=name), re.IGNORECASE), 'value-first')
     for name in _VALUE_FIRST_FUNCTIONS]
    + [(re.compile(_RANGE_FIRST_TEMPLATE.format(name=re.escape(name)), re.IGNORECASE), 'range-first')
       for name in _RANGE_FIRST_FUNCTIONS]
    + [(re.compile(_SHIFTED_RANGE_FIRST_TEMPLATE.format(name=re.escape(name)), re.IGNORECASE), 'range-first')
       for name in _SHIFTED_RANGE_FIRST_FUNCTIONS]
)


# ─── Utilitaires ──────────────────────────────────────────────────────────────

def get_pk_column(table):
    """Retourne la PK "métier" de la table (on ignore les PK SERIAL auto-générées,
    car une colonne Excel ne peut pas référencer une valeur qui n'existait pas)."""
    for col in table.get_columns():
        if col.is_primary_key and not col.is_serial:
            return col
    return None


def _subset_ratio(col_values, pk_values):
    """Ratio des valeurs non-nulles de col_values qui existent dans pk_values."""
    non_null = [v for v in col_values if v is not None]
    if not non_null:
        return 0.0
    pk_set = set(pk_values)
    return sum(1 for v in non_null if v in pk_set) / len(non_null)


def _cardinality_ratio(values):
    """Ratio valeurs distinctes / total lignes. Faible = beaucoup de répétitions = signal FK."""
    non_null = [v for v in values if v is not None]
    if not non_null:
        return 1.0
    return len(set(non_null)) / len(non_null)


def _find_col_by_letter(table, letter):
    """Retrouve une colonne d'un excel.Table par sa lettre Excel (A, B, C...)."""
    letter = letter.upper()
    for col in table.get_columns():
        if hasattr(col, 'letter') and col.letter.upper() == letter:
            return col
    return None


def _find_worksheet_by_name(workbook, name):
    name = name.strip().lower()
    for ws in workbook.get_worksheets():
        if ws.name.strip().lower() == name:
            return ws
    return None


def _normalize(name):
    return name.lower().strip()


def _candidate_col_names(table_name, pk_name):
    """
    Noms de colonnes FK plausibles pour une table+PK donnée.
    Ex: clients + id  →  {clients_id, client_id}
        produits + code →  {produits_code, produit_code}
    """
    t = _normalize(table_name)
    p = _normalize(pk_name)
    candidates = {f"{t}_{p}"}
    # Enlève "s" en premier (commandes → commande_id ✓)
    if t.endswith("s"):
        candidates.add(f"{t[:-1]}_{p}")
    # Enlève aussi "es" pour couvrir l'anglais (addresses → address_id)
    if t.endswith("es"):
        candidates.add(f"{t[:-2]}_{p}")
    return candidates


def _register_fk(rel_table, rel_col, ref_rel_table, ref_pk_col, reason):
    """Crée et attache la FK si elle n'existe pas déjà sur cette colonne."""
    if rel_col is None or rel_col.foreign_key is not None:
        return
    fk = ForeignKey(
        column_name=rel_col.name,
        ref_table=ref_rel_table.name,
        ref_column=ref_pk_col.name
    )
    rel_col.set_foreign_key(fk)
    rel_table.add_constraint(fk)
    print(f"  [FK/{reason}] {rel_table.name}.{rel_col.name} -> {ref_rel_table.name}.{ref_pk_col.name}")


# ─── Stratégie 0 : formules VLOOKUP / RECHERCHEV / XLOOKUP / INDEX+MATCH ─────

def _extract_lookup_hints(excel_workbook):
    """
    Scanne toutes les cellules à la recherche de formules de lookup inter-feuilles.
    Retourne une liste de tuples :
        (source_excel_table, src_col_letter, target_sheet_name, tgt_col_letter)

    Exemple : =VLOOKUP(A2, Clients!$A:$D, 2, FALSE)
        → source_col_letter = "A"  (la colonne qui contient la valeur cherchée)
        → target_sheet = "Clients"
        → target_col_letter = "A"  (la première colonne du range = la PK)
    """
    hints = []
    for worksheet in excel_workbook.get_worksheets():
        for table in worksheet.get_tables():
            for row in table.get_rows():
                for cell in row.get_cells():
                    if not cell.has_formula():
                        continue
                    for pat, group_order in _LOOKUP_PATTERNS:
                        m = pat.search(cell.formula)
                        if not m:
                            continue
                        if group_order == 'value-first':
                            src_letter, tgt_sheet, tgt_letter = m.group(1), m.group(2), m.group(3)
                        else:
                            tgt_sheet, tgt_letter, src_letter = m.group(1), m.group(2), m.group(3)
                        hints.append((table, src_letter.upper(), tgt_sheet.strip(), tgt_letter.upper()))
                        break
    return hints


def _apply_lookup_fks(excel_workbook, rel_tables, excel_tables):
    """Transforme chaque indice de lookup en vraie FK, après vérifications."""
    hints = _extract_lookup_hints(excel_workbook)
    if not hints:
        return

    for src_excel_table, src_letter, tgt_sheet_name, tgt_letter in hints:

        # La colonne source doit exister, ne pas être elle-même une PK,
        # et avoir un type compatible avec une FK (entier ou texte)
        src_excel_col = _find_col_by_letter(src_excel_table, src_letter)
        if src_excel_col is None or src_excel_col.is_primary_key:
            continue
        if src_excel_col.detected_type not in _FK_COMPATIBLE_TYPES:
            continue

        # La feuille visée par la formule doit exister dans le classeur
        tgt_worksheet = _find_worksheet_by_name(excel_workbook, tgt_sheet_name)
        if tgt_worksheet is None:
            continue

        for tgt_excel_table in tgt_worksheet.get_tables():
            # La colonne cible du lookup doit être la clé primaire de sa table :
            # c'est ce qui garantit que la relation est bien une FK -> PK
            tgt_excel_col = _find_col_by_letter(tgt_excel_table, tgt_letter)
            if tgt_excel_col is None or not tgt_excel_col.is_primary_key:
                continue

            # Retrouver les tables relationnelles correspondant aux tables Excel
            # (les deux listes sont alignées index par index).
            # On refuse aussi l'auto-référence (une table qui pointe vers elle-même).
            src_rt = next((rt for rt, et in zip(rel_tables, excel_tables) if et is src_excel_table), None)
            tgt_rt = next((rt for rt, et in zip(rel_tables, excel_tables) if et is tgt_excel_table), None)
            if src_rt is None or tgt_rt is None or src_rt.name == tgt_rt.name:
                continue

            tgt_rel_pk = next((c for c in tgt_rt.get_columns() if c.name == tgt_excel_col.name), None)
            src_rel_col = next((c for c in src_rt.get_columns() if c.name == src_excel_col.name), None)
            if tgt_rel_pk is None or src_rel_col is None:
                continue

            _register_fk(src_rt, src_rel_col, tgt_rt, tgt_rel_pk, "LOOKUP")


# ─── Détection principale ─────────────────────────────────────────────────────

def detect_foreign_keys(excel_workbook, relational_db):
    """
    Point d'entrée de la détection des clés étrangères.

    Trois stratégies, de la plus fiable à la moins fiable :
      0. Formules de lookup (VLOOKUP/RECHERCHEV...) : la relation est explicite.
      1. Nom de colonne identique à la PK d'une autre table (ex : id_client).
      2. Nom dérivé de la convention <table_singulier>_<pk> (ex : client_id).
    Les stratégies 1 et 2 ne sont validées que si >= 95% des valeurs de la
    colonne candidate existent réellement dans la PK cible (subset check).
    """
    excel_tables = excel_workbook.get_all_tables()
    rel_tables   = relational_db.get_tables()

    # ── Stratégie 0 : formules de lookup (signal le plus fort) ───────────────
    _apply_lookup_fks(excel_workbook, rel_tables, excel_tables)

    # ── Construire l'index des PK ─────────────────────────────────────────────
    # Pour chaque table qui a une PK, on enregistre :
    #   - son nom exact (stratégie 1)
    #   - ses noms dérivés plausibles comme client_id (stratégie 2)
    # ainsi que la liste de ses valeurs, pour le subset check plus bas.
    pk_by_col_name = {}   # nom exact de la PK → (table, pk_col, valeurs)
    pk_by_fk_name  = {}   # nom dérivé (client_id, clients_id...) → idem

    for rel_table, excel_table in zip(rel_tables, excel_tables):
        pk_col = get_pk_column(rel_table)
        if pk_col is None:
            continue
        pk_values = [
            row.get(pk_col.name)
            for row in rel_table.get_rows()
            if row.get(pk_col.name) is not None
        ]
        entry = (rel_table, pk_col, pk_values)
        pk_by_col_name[_normalize(pk_col.name)] = entry
        for candidate in _candidate_col_names(rel_table.name, pk_col.name):
            if candidate not in pk_by_col_name:
                pk_by_fk_name[candidate] = entry

    # ── Stratégies 1 & 2 : nom exact + nom dérivé + subset check ────────────
    for rel_table, excel_table in zip(rel_tables, excel_tables):
        for excel_col in excel_table.get_columns():

            # Une PK ne peut pas être aussi une FK ici, et seuls les types
            # entier/texte peuvent raisonnablement référencer une PK
            if excel_col.is_primary_key:
                continue
            if excel_col.detected_type not in _FK_COMPATIBLE_TYPES:
                continue

            col_name_norm = _normalize(excel_col.name)

            # Stratégie 1 — nom identique à une PK
            entry = pk_by_col_name.get(col_name_norm)
            # Stratégie 2 — nom dérivé (client_id → clients.id)
            if entry is None:
                entry = pk_by_fk_name.get(col_name_norm)
            if entry is None:
                continue

            ref_rel_table, ref_pk_col, pk_values = entry
            # Pas d'auto-référence : une table ne pointe pas vers elle-même
            if ref_rel_table.name == rel_table.name:
                continue

            # Validation par les données : le nom propose, les valeurs confirment.
            # Si moins de 95% des valeurs existent dans la PK cible → fausse alerte.
            col_values = get_column_values(excel_table, excel_col)
            ratio = _subset_ratio(col_values, pk_values)
            if ratio < FK_SUBSET_THRESHOLD:
                continue

            # Déterminer le libellé de la raison pour le log
            reason = "EXACT" if col_name_norm == _normalize(ref_pk_col.name) else "DERIVED"
            if ratio < 1.0:
                reason += f"/~{int(ratio * 100)}%"
            card = _cardinality_ratio(col_values)
            if card < 0.3:
                reason += "/low-card"

            rel_col = next(
                (c for c in rel_table.get_columns() if c.name == excel_col.name),
                None
            )
            _register_fk(rel_table, rel_col, ref_rel_table, ref_pk_col, reason)
