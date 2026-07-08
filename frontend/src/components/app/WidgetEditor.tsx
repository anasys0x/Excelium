import { useMemo, useState } from 'react'
import type { TableConfig } from '../../App'
import {
  FORMULA_LABELS, FORMULA_ORDER, needsCondition, needsNumericColumn,
} from '../../lib/formulas'
import type { Condition, ConditionOperator, FormulaKind, FormulaWidget } from '../../lib/formulas'

const OPERATORS: ConditionOperator[] = ['=', '!=', '>', '<', 'contient']
const NUMERIC_TYPES = ['INT', 'FLOAT']

interface Props {
  tables: TableConfig[]
  initial?: FormulaWidget
  onSave: (widget: FormulaWidget) => void
  onCancel: () => void
}

const fieldStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '13px',
} as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: '14px' }}>
      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

// Panneau de création/édition d'un widget de formule :
// Formule → Table → Colonne (filtrée selon la formule) → Condition (.SI) → Titre
function WidgetEditor({ tables, initial, onSave, onCancel }: Props) {
  const [formula, setFormula] = useState<FormulaKind>(initial?.formula ?? 'SOMME')
  const [tableId, setTableId] = useState(initial?.tableId ?? tables[0]?.id ?? '')
  const [columnIndex, setColumnIndex] = useState(initial?.columnIndex ?? -1)
  const [condColumn, setCondColumn] = useState(initial?.condition?.columnIndex ?? -1)
  const [condOperator, setCondOperator] = useState<ConditionOperator>(initial?.condition?.operator ?? '=')
  const [condValue, setCondValue] = useState(initial?.condition?.value ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')

  const table = tables.find((t) => t.id === tableId)

  // SOMME/MOYENNE… ne proposent que les colonnes numériques ; NB & co proposent tout
  const eligibleColumns = useMemo(() => {
    if (!table) return []
    return table.columns
      .map((col, index) => ({ col, index }))
      .filter(({ col }) => !needsNumericColumn(formula) || NUMERIC_TYPES.includes(col.type))
  }, [table, formula])

  const columnValid = eligibleColumns.some((c) => c.index === columnIndex)
  const conditionRequired = needsCondition(formula)
  const conditionValid = !conditionRequired || (condColumn >= 0 && condValue.trim() !== '')
  const canSave = table !== undefined && columnValid && conditionValid

  const save = () => {
    if (!canSave || !table) return
    const condition: Condition | undefined = conditionRequired
      ? { columnIndex: condColumn, operator: condOperator, value: condValue.trim() }
      : undefined

    onSave({
      id: initial?.id ?? `w-${Date.now()}`,
      formula,
      tableId,
      columnIndex,
      condition,
      label: label.trim() || undefined,
    })
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '400px', maxHeight: '85vh', overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '22px 24px',
          boxShadow: '0 12px 40px rgba(0,0,0,.25)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '18px' }}>
          {initial ? 'Modifier le widget' : 'Nouveau widget'}
        </h2>

        <Field label="Formule">
          <select
            value={formula}
            onChange={(e) => { setFormula(e.target.value as FormulaKind); setColumnIndex(-1) }}
            style={fieldStyle}
          >
            {FORMULA_ORDER.map((f) => (
              <option key={f} value={f}>{FORMULA_LABELS[f]}</option>
            ))}
          </select>
        </Field>

        <Field label="Table">
          <select
            value={tableId}
            onChange={(e) => { setTableId(e.target.value); setColumnIndex(-1); setCondColumn(-1) }}
            style={fieldStyle}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.tableName}</option>
            ))}
          </select>
        </Field>

        <Field label={needsNumericColumn(formula) ? 'Colonne (numérique)' : 'Colonne'}>
          <select
            value={columnIndex}
            onChange={(e) => setColumnIndex(Number(e.target.value))}
            style={fieldStyle}
          >
            <option value={-1}>— choisir —</option>
            {eligibleColumns.map(({ col, index }) => (
              <option key={index} value={index}>{col.name}</option>
            ))}
          </select>
          {eligibleColumns.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--amber-text)', display: 'block', marginTop: '4px' }}>
              Aucune colonne numérique dans cette table.
            </span>
          )}
        </Field>

        {conditionRequired && table && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '12px 14px', marginBottom: '14px', background: 'var(--surface-alt)',
          }}>
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px' }}>
              Condition (si…)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={condColumn}
                onChange={(e) => setCondColumn(Number(e.target.value))}
                style={{ ...fieldStyle, flex: 2 }}
              >
                <option value={-1}>colonne</option>
                {table.columns.map((col, index) => (
                  <option key={index} value={index}>{col.name}</option>
                ))}
              </select>
              <select
                value={condOperator}
                onChange={(e) => setCondOperator(e.target.value as ConditionOperator)}
                style={{ ...fieldStyle, flex: 1 }}
              >
                {OPERATORS.map((op) => <option key={op} value={op}>{op === '!=' ? '≠' : op}</option>)}
              </select>
              <input
                type="text"
                value={condValue}
                onChange={(e) => setCondValue(e.target.value)}
                placeholder="valeur"
                style={{ ...fieldStyle, flex: 2 }}
              />
            </div>
          </div>
        )}

        <Field label="Titre du widget (optionnel)">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex : Chiffre d'affaires"
            style={fieldStyle}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 16px', background: 'var(--surface)', color: 'var(--text-2)',
              border: '1px solid var(--border-strong)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            style={{
              padding: '9px 20px', background: 'var(--accent)', color: '#FFFFFF',
              border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
              cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
            }}
          >
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WidgetEditor
