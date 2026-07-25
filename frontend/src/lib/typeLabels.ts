// Libellés lisibles pour le client à partir des types techniques détectés (openpyxl).
// On garde le type technique (col.type) pour le backend ; ceci ne sert qu'à l'affichage.

import type { Lang } from './i18n'

const TYPE_LABELS: Record<Lang, Record<string, string>> = {
  fr: { STRING: 'Texte', INT: 'Nombre', FLOAT: 'Décimal', DATE: 'Date', BOOL: 'Oui / Non', MIXED: 'Mixte' },
  en: { STRING: 'Text', INT: 'Number', FLOAT: 'Decimal', DATE: 'Date', BOOL: 'Yes / No', MIXED: 'Mixed' },
}

export function typeLabel(type: string, lang: Lang = 'fr'): string {
  return TYPE_LABELS[lang]?.[type] ?? TYPE_LABELS.fr[type] ?? type
}
