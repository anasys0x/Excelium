// Libellés lisibles pour le client à partir des types techniques détectés (openpyxl).
// On garde le type technique (col.type) pour le backend ; ceci ne sert qu'à l'affichage.

const TYPE_LABELS: Record<string, string> = {
  STRING: 'Texte',
  INT: 'Nombre',
  FLOAT: 'Décimal',
  DATE: 'Date',
  BOOL: 'Oui / Non',
  MIXED: 'Mixte',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}
