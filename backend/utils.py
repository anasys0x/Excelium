import re
import unicodedata


def slugify(name: str) -> str:
    """Converts any string to a safe PostgreSQL identifier.

    Handles accents, spaces, parentheses, hyphens, etc.
    Examples:
        "Employés (2024)"  -> "employes_2024"
        "order id"         -> "order_id"
        "référence"        -> "reference"
    """
    name = unicodedata.normalize('NFKD', str(name))
    name = name.encode('ascii', 'ignore').decode('ascii')
    name = name.lower()
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = name.strip('_')
    return name or 'col'
