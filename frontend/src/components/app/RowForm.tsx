import { useMemo, useState } from 'react'
import type { ColumnConfig } from '../../App'
import { useI18n } from '../../lib/i18n'

interface Props {
  columns: ColumnConfig[]
  initialData?: Record<string, unknown>
  mode: 'create' | 'edit'
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  existingRows?: Record<string, unknown>[]
}

function inputFor(col: ColumnConfig, value: unknown, onChange: (v: unknown) => void, readOnly: boolean) {
  if (col.type === 'BOOL') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
      />
    )
  }
  if (col.type === 'DATE') {
    return (
      <input
        type="date"
        value={value ? String(value).split('T')[0] : ''}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`form-input${readOnly ? ' readonly' : ''}`}
      />
    )
  }
  if (col.type === 'INT' || col.type === 'FLOAT') {
    return (
      <input
        type="number"
        step={col.type === 'FLOAT' ? 'any' : '1'}
        value={value === null || value === undefined ? '' : String(value)}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`form-input${readOnly ? ' readonly' : ''}`}
      />
    )
  }
  return (
    <input
      type="text"
      value={value === null || value === undefined ? '' : String(value)}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={`form-input${readOnly ? ' readonly' : ''}`}
    />
  )
}

function RowForm({ columns, initialData = {}, mode, onSubmit, onCancel, existingRows = [] }: Props) {
  const { t } = useI18n()
  const includedCols = columns.filter((c) => !c.excluded)
  const pkCol = includedCols.find((c) => c.isPrimaryKey)
  const labelCol = includedCols.find((c) => !c.isPrimaryKey && (c.type === 'TEXT' || c.type === 'STRING')) ?? includedCols.find((c) => !c.isPrimaryKey)

  // Prochain identifiant disponible, suggéré pour une clé primaire numérique en création.
  const suggestedId = useMemo(() => {
    if (mode !== 'create' || !pkCol || pkCol.type !== 'INT') return null
    const max = existingRows.reduce((acc, row) => {
      const v = Number(row[pkCol.name])
      return Number.isFinite(v) && v > acc ? v : acc
    }, 0)
    return max + 1
  }, [mode, pkCol, existingRows])

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const col of includedCols) {
      if (mode === 'create' && col.isPrimaryKey && suggestedId !== null) {
        init[col.name] = suggestedId
        continue
      }
      init[col.name] = initialData[col.name] ?? (col.type === 'BOOL' ? false : '')
    }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const setField = (name: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [name]: value }))

  // Validation d'unicité de l'identifiant en temps réel (création uniquement).
  const duplicateRow = useMemo(() => {
    if (mode !== 'create' || !pkCol) return null
    const value = formData[pkCol.name]
    if (value === null || value === undefined || value === '') return null
    return existingRows.find((row) => String(row[pkCol.name]) === String(value)) ?? null
  }, [mode, pkCol, formData, existingRows])

  const idHasConflict = duplicateRow !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.unknownError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-overlay" onClick={onCancel}>
      <div className="form-panel" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">
            {mode === 'create' ? t('app.addRow') : t('app.editRow')}
          </h2>
          <button className="form-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          {includedCols.map((col) => {
            const isReadOnly = col.isPrimaryKey && mode === 'edit'
            return (
              <div key={col.originalName} className="form-field">
                <label className="form-label">
                  {col.name}
                  {col.isPrimaryKey && <span className="form-label-pk">{t('common.identifier')}</span>}
                  {isReadOnly && <span className="form-label-readonly">{t('preview.readonly')}</span>}
                </label>
                {inputFor(col, formData[col.name], (v) => setField(col.name, v), isReadOnly)}
                {col.isPrimaryKey && mode === 'create' && (
                  idHasConflict
                    ? (
                      <div className="form-field-error">
                        {t('app.idDuplicate', {
                          label: labelCol ? String(duplicateRow![labelCol.name] ?? '') : String(formData[col.name]),
                        })}
                      </div>
                    )
                    : suggestedId !== null && formData[col.name] === suggestedId && (
                      <div className="form-field-hint">{t('app.idSuggested', { value: suggestedId })}</div>
                    )
                )}
              </div>
            )
          })}
          {error && <div className="form-error">{error}</div>}
        </form>

        <div className="form-footer">
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving || idHasConflict}
            className="form-submit"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button onClick={onCancel} className="form-cancel">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

export default RowForm
