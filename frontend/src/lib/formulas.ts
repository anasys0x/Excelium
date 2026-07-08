// Moteur de formules type Excel : évalue une formule sur une colonne d'une
// table (avec condition optionnelle pour les .SI). Module pur et testable,
// jumeau de semantic.ts / archetype.ts.

import { detectRole } from './semantic'

export type FormulaKind =
  | 'SOMME' | 'MOYENNE' | 'NB' | 'MIN' | 'MAX'
  | 'MEDIANE' | 'ECART_TYPE'
  | 'NB_UNIQUE' | 'NB_VIDE'
  | 'NB_SI' | 'SOMME_SI' | 'MOYENNE_SI'

export type ConditionOperator = '=' | '!=' | '>' | '<' | 'contient'

export interface Condition {
  columnIndex: number
  operator: ConditionOperator
  value: string
}

export interface FormulaWidget {
  id: string
  formula: FormulaKind
  tableId: string
  columnIndex: number
  condition?: Condition
  label?: string
}

// Structurellement compatible avec TableConfig (App.tsx) sans en dépendre
export interface FormulaTable {
  id: string
  tableName: string
  columns: { name: string; type: string; isPrimaryKey?: boolean }[]
  rows: unknown[][]
}

export type EvalResult =
  | { ok: true; value: number; formatted: string }
  | { ok: false; reason: string }

export const FORMULA_LABELS: Record<FormulaKind, string> = {
  SOMME: 'Somme',
  MOYENNE: 'Moyenne',
  NB: 'Nombre de valeurs',
  MIN: 'Minimum',
  MAX: 'Maximum',
  MEDIANE: 'Médiane',
  ECART_TYPE: 'Écart-type',
  NB_UNIQUE: 'Valeurs uniques',
  NB_VIDE: 'Cellules vides',
  NB_SI: 'Nombre si…',
  SOMME_SI: 'Somme si…',
  MOYENNE_SI: 'Moyenne si…',
}

export const FORMULA_ORDER: FormulaKind[] = [
  'SOMME', 'MOYENNE', 'NB', 'MIN', 'MAX',
  'MEDIANE', 'ECART_TYPE', 'NB_UNIQUE', 'NB_VIDE',
  'NB_SI', 'SOMME_SI', 'MOYENNE_SI',
]

// Formules exigeant une colonne numérique
const NUMERIC_FORMULAS: FormulaKind[] = [
  'SOMME', 'MOYENNE', 'MIN', 'MAX', 'MEDIANE', 'ECART_TYPE', 'SOMME_SI', 'MOYENNE_SI',
]
// Formules exigeant une condition
const CONDITIONAL_FORMULAS: FormulaKind[] = ['NB_SI', 'SOMME_SI', 'MOYENNE_SI']
// Formules dont le résultat est un comptage (jamais €/%)
const COUNT_FORMULAS: FormulaKind[] = ['NB', 'NB_UNIQUE', 'NB_VIDE', 'NB_SI']

export function needsNumericColumn(f: FormulaKind): boolean {
  return NUMERIC_FORMULAS.includes(f)
}

export function needsCondition(f: FormulaKind): boolean {
  return CONDITIONAL_FORMULAS.includes(f)
}

// --- Helpers ---
const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

function toNumber(v: unknown): number | null {
  if (isEmpty(v)) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

function matchesCondition(row: unknown[], cond: Condition): boolean {
  const cell = row[cond.columnIndex]
  const cellNum = toNumber(cell)
  const condNum = toNumber(cond.value)
  const cellStr = String(cell ?? '').trim().toLowerCase()
  const condStr = cond.value.trim().toLowerCase()

  switch (cond.operator) {
    case '=':
      return cellNum !== null && condNum !== null ? cellNum === condNum : cellStr === condStr
    case '!=':
      return cellNum !== null && condNum !== null ? cellNum !== condNum : cellStr !== condStr
    case '>':
      return cellNum !== null && condNum !== null && cellNum > condNum
    case '<':
      return cellNum !== null && condNum !== null && cellNum < condNum
    case 'contient':
      return cellStr.includes(condStr)
  }
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

// --- Formatage selon le rôle sémantique de la colonne ---
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const cf = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

function formatValue(value: number, widget: FormulaWidget, table: FormulaTable): string {
  if (COUNT_FORMULAS.includes(widget.formula)) return nf.format(value)

  const column = table.columns[widget.columnIndex]
  const role = detectRole(column, widget.columnIndex, table.rows)
  if (role === 'currency') return cf.format(value)
  if (role === 'percent') return `${nf.format(value)} %`
  return nf.format(value)
}

// --- Évaluation ---
export function evaluate(widget: FormulaWidget, tables: FormulaTable[]): EvalResult {
  const table = tables.find((t) => t.id === widget.tableId)
  if (!table) return { ok: false, reason: 'Table introuvable' }
  if (!table.columns[widget.columnIndex]) return { ok: false, reason: 'Colonne introuvable' }
  if (needsCondition(widget.formula) && !widget.condition) {
    return { ok: false, reason: 'Condition manquante' }
  }

  // Lignes retenues (filtrées par la condition pour les .SI)
  const rows = widget.condition
    ? table.rows.filter((row) => matchesCondition(row, widget.condition!))
    : table.rows

  const cells = rows.map((row) => row[widget.columnIndex])

  let value: number
  switch (widget.formula) {
    case 'NB':
    case 'NB_SI':
      value = cells.filter((c) => !isEmpty(c)).length
      break
    case 'NB_VIDE':
      value = cells.filter((c) => isEmpty(c)).length
      break
    case 'NB_UNIQUE':
      value = new Set(cells.filter((c) => !isEmpty(c)).map((c) => String(c).trim().toLowerCase())).size
      break
    default: {
      const numbers = cells.map(toNumber).filter((n): n is number => n !== null)
      if (numbers.length === 0) return { ok: false, reason: 'Aucune valeur numérique' }

      switch (widget.formula) {
        case 'SOMME':
        case 'SOMME_SI':
          value = numbers.reduce((a, b) => a + b, 0)
          break
        case 'MOYENNE':
        case 'MOYENNE_SI':
          value = numbers.reduce((a, b) => a + b, 0) / numbers.length
          break
        case 'MIN':
          value = Math.min(...numbers)
          break
        case 'MAX':
          value = Math.max(...numbers)
          break
        case 'MEDIANE':
          value = median([...numbers].sort((a, b) => a - b))
          break
        case 'ECART_TYPE':
          value = stdDev(numbers)
          break
      }
    }
  }

  return { ok: true, value, formatted: formatValue(value, widget, table) }
}

// Sous-titre descriptif d'un widget : « SOMME · ventes.montant (si statut = payé) »
export function describeWidget(widget: FormulaWidget, tables: FormulaTable[]): string {
  const table = tables.find((t) => t.id === widget.tableId)
  if (!table) return FORMULA_LABELS[widget.formula]

  const colName = table.columns[widget.columnIndex]?.name ?? '?'
  let desc = `${FORMULA_LABELS[widget.formula]} · ${table.tableName}.${colName}`
  if (widget.condition) {
    const condCol = table.columns[widget.condition.columnIndex]?.name ?? '?'
    desc += ` (si ${condCol} ${widget.condition.operator} ${widget.condition.value})`
  }
  return desc
}
