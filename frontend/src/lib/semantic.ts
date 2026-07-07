// Détection sémantique : déduit le « sens » d'une colonne (au-delà du type brut)
// à partir de son nom et d'un échantillon de valeurs. Module pur et testable.

export type SemanticRole =
  | 'id'
  | 'title'
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'currency'
  | 'percent'
  | 'category'
  | 'rating'
  | 'image'

export type LayoutKind = 'table' | 'gallery' | 'dashboard'

interface ColumnLike {
  name: string
  type: string
  isPrimaryKey?: boolean
}

export interface AnalyzedColumn {
  name: string
  role: SemanticRole
  index: number
}

const ID_RE       = /(^id$|_id$|^id_|^code$|_code$|^ref$|_ref$|uuid|matricule|^num[eé]ro?$)/i
const CURRENCY_RE = /(prix|price|montant|cost|cout|co[uû]t|total|salaire|amount|revenu|chiffre|€|\$)/i
const PERCENT_RE  = /(taux|percent|pourcent|%|\brate\b|ratio)/i
const RATING_RE   = /(note|score|rating|[ée]toile|stars?|avis)/i
const IMAGE_RE    = /(image|photo|avatar|logo|picture|thumbnail|cover|img)/i
const TITLE_RE    = /(^nom$|name|^titre$|title|libell|label|intitul|d[ée]signation)/i
const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i

function sampleValues(rows: unknown[][], colIndex: number, limit = 60): unknown[] {
  const out: unknown[] = []
  for (const row of rows) {
    const v = row[colIndex]
    if (v !== null && v !== undefined && String(v).trim() !== '') out.push(v)
    if (out.length >= limit) break
  }
  return out
}

export function detectRole(column: ColumnLike, colIndex: number, rows: unknown[][]): SemanticRole {
  const name = column.name ?? ''
  const type = column.type
  const values = sampleValues(rows, colIndex)

  // Identifiant
  if (column.isPrimaryKey || ID_RE.test(name)) return 'id'

  // Types non ambigus
  if (type === 'BOOL') return 'boolean'
  if (type === 'DATE') return 'date'

  // Numérique → affiner selon le nom
  if (type === 'INT' || type === 'FLOAT') {
    if (CURRENCY_RE.test(name)) return 'currency'
    if (PERCENT_RE.test(name)) return 'percent'
    if (RATING_RE.test(name) && values.every((v) => Number(v) >= 0 && Number(v) <= 5)) return 'rating'
    return 'number'
  }

  // Texte → image, catégorie, titre, ou texte
  if (IMAGE_RE.test(name) || values.some((v) => IMAGE_URL_RE.test(String(v)))) return 'image'

  // Catégorie : faible cardinalité
  const distinct = new Set(values.map((v) => String(v).trim().toLowerCase()))
  if (values.length >= 4 && distinct.size <= 12 && distinct.size <= Math.ceil(values.length / 2)) {
    return 'category'
  }

  if (TITLE_RE.test(name)) return 'title'
  return 'text'
}

export function analyzeColumns(columns: ColumnLike[], rows: unknown[][]): AnalyzedColumn[] {
  return columns.map((col, index) => ({
    name: col.name,
    role: detectRole(col, index, rows),
    index,
  }))
}

const METRIC_ROLES: SemanticRole[] = ['number', 'currency', 'percent', 'rating']

export function isMetricRole(role: SemanticRole): boolean {
  return METRIC_ROLES.includes(role)
}

// Layouts pertinents selon le contenu de la table
export function suggestLayouts(columns: AnalyzedColumn[]): LayoutKind[] {
  const layouts: LayoutKind[] = ['table']

  if (columns.some((c) => c.role === 'image')) layouts.push('gallery')

  const metricCount = columns.filter((c) => isMetricRole(c.role)).length
  if (metricCount >= 2 && metricCount >= columns.length / 2) layouts.push('dashboard')

  return layouts
}
