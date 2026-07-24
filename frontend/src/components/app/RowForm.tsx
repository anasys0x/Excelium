import { useState } from 'react'
import type { ColumnConfig } from '../../App'

interface Props {
  columns: ColumnConfig[]
  initialData?: Record<string, unknown>
  mode: 'create' | 'edit'
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
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

function RowForm({ columns, initialData = {}, mode, onSubmit, onCancel }: Props) {
  const includedCols = columns.filter((c) => !c.excluded)

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const col of includedCols) {
      init[col.name] = initialData[col.name] ?? (col.type === 'BOOL' ? false : '')
    }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const setField = (name: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-overlay" onClick={onCancel}>
      <div className="form-panel" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">
            {mode === 'create' ? 'Ajouter une ligne' : 'Modifier la ligne'}
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
                  {col.isPrimaryKey && <span className="form-label-pk">Identifiant</span>}
                  {isReadOnly && <span className="form-label-readonly">lecture seule</span>}
                </label>
                {inputFor(col, formData[col.name], (v) => setField(col.name, v), isReadOnly)}
              </div>
            )
          })}
          {error && <div className="form-error">{error}</div>}
        </form>

        <div className="form-footer">
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="form-submit"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onCancel} className="form-cancel">Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default RowForm
