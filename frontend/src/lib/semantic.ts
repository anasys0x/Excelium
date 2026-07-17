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
  | 'status'
  | 'rating'
  | 'image'

export type LayoutKind = 'table' | 'gallery' | 'dashboard' | 'cards'

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

export interface ChartRecommendation {
  kind: 'category' | 'time'
  dimension: AnalyzedColumn
  metric: AnalyzedColumn
}

const ID_RE       = /(^id$|_id$|^id_|^code$|_code$|^ref$|_ref$|uuid|matricule|^num[eé]ro?$)/i
const CURRENCY_RE = /(prix|price|montant|cost|cout|co[uû]t|total|salaire|amount|revenu|chiffre|€|\$)/i
const PERCENT_RE  = /(taux|percent|pourcent|%|\brate\b|ratio)/i
const RATING_RE   = /(note|score|rating|[ée]toile|stars?|avis)/i
const IMAGE_RE    = /(image|photo|avatar|logo|picture|thumbnail|cover|img)/i
const STATUS_RE   = /(statut|status|[ée]tat$|^[ée]tat|\bstate\b|phase|stage|situation)/i
const TITLE_RE    = /(^nom$|name|^titre$|title|libell|label|intitul|d[ée]signation)/i
const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i
const DESCRIPTIVE_NUMBER_RE = /(^|[\s_-])(age|âge|anciennet[ée]|ann[ée]e|year|rang|rank|taille|height|poids|weight|code postal|postal|zip)([\s_-]|$)/i
const PERSONAL_DATE_RE = /(naissance|birth|birthday|date.?of.?birth|dob)/i

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

  // Statut : nom évocateur + faible cardinalité (avant catégorie, plus spécifique)
  const distinct = new Set(values.map((v) => String(v).trim().toLowerCase()))
  const lowCardinality = values.length >= 4 && distinct.size <= 12 && distinct.size <= Math.ceil(values.length / 2)
  if (STATUS_RE.test(name) && lowCardinality) return 'status'

  // Catégorie : faible cardinalité
  if (lowCardinality) return 'category'

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

function isMeaningfulMetric(column: AnalyzedColumn): boolean {
  return isMetricRole(column.role) && !DESCRIPTIVE_NUMBER_RE.test(column.name)
}

// Un graphique n'est proposé que si les colonnes expriment une vraie relation
// analytique. Les attributs descriptifs d'une personne (âge, naissance, etc.)
// ne sont jamais transformés automatiquement en graphique.
export function findChartRecommendation(columns: AnalyzedColumn[]): ChartRecommendation | null {
  const metric = columns.find(isMeaningfulMetric)
  if (!metric) return null

  const category = columns.find((column) => column.role === 'category' || column.role === 'status')
  if (category) return { kind: 'category', dimension: category, metric }

  const date = columns.find((column) => column.role === 'date' && !PERSONAL_DATE_RE.test(column.name))
  if (date) return { kind: 'time', dimension: date, metric }

  return null
}

// Layouts pertinents selon le contenu de la table
export function suggestLayouts(columns: AnalyzedColumn[]): LayoutKind[] {
  const layouts: LayoutKind[] = ['table']

  if (columns.some((c) => c.role === 'image')) layouts.push('gallery')

  const metricCount = columns.filter((c) => isMetricRole(c.role)).length
  if (metricCount >= 2 && metricCount >= columns.length / 2) layouts.push('dashboard')

  return layouts
}
