import { useState } from 'react'
import type { TableConfig, ColumnConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'

const ALL_TYPES = ['INT', 'FLOAT', 'STRING', 'DATE', 'BOOL', 'MIXED']

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  STRING: { bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)'  },
  DATE:   { bg: 'var(--badge-amber-bg)',  color: 'var(--amber-text)'        },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      {[3, 8, 13].map((cy) =>
        [2, 8].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="currentColor" />
        ))
      )}
    </svg>
  )
}

interface FkTarget { value: string; label: string; tableName: string; colName: string }

interface Props {
  config: TableConfig
  allTables: TableConfig[]
  onChange: (config: TableConfig) => void
  onFocusColumn: (name: string | null) => void
}

function StepKeySelector({ config, allTables, onChange, onFocusColumn }: Props) {
  const [dragIndex, setDragIndex]           = useState<number | null>(null)
  const [overIndex, setOverIndex]           = useState<number | null>(null)
  const [newFkCol, setNewFkCol]             = useState('')
  const [newFkTarget, setNewFkTarget]       = useState('')
  const [refusedTargets, setRefusedTargets] = useState<Record<string, string>>({})

  const fkTargets: FkTarget[] = allTables
    .filter((t) => t.id !== config.id)
    .flatMap((t) =>
      t.columns
        .filter((c) => c.isPrimaryKey || c.isPkCandidate)
        .map((c) => ({
          value: `${t.tableName}::${c.name}`,
          label: `${t.tableName}  →  ${c.name}`,
          tableName: t.tableName,
          colName: c.name,
        }))
    )

  const updateTableName = (name: string) => onChange({ ...config, tableName: name })

  const updateColumnName = (originalName: string, newName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, name: newName } : col
    )
    onChange({ ...config, columns })
  }

  const updateColumnType = (originalName: string, newType: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, type: newType } : col
    )
    onChange({ ...config, columns })
  }

  const updatePrimaryKey = (originalName: string) => {
    const columns = config.columns.map((col) => ({ ...col, isPrimaryKey: col.originalName === originalName }))
    onChange({ ...config, columns })
  }

  const excludeColumn = (originalName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, excluded: true, isPrimaryKey: false } : col
    )
    onChange({ ...config, columns })
  }

  const includeColumn = (originalName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, excluded: false } : col
    )
    onChange({ ...config, columns })
  }

  const confirmForeignKey = (originalName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, foreignKeyConfirmed: true, foreignKeyRefused: false } : col
    )
    onChange({ ...config, columns })
  }

  const refuseForeignKey = (originalName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, foreignKeyConfirmed: false, foreignKeyRefused: true } : col
    )
    onChange({ ...config, columns })
  }

  const relinkForeignKey = (originalName: string, refTable: string, refColumn: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName
        ? { ...col, foreignKey: { refTable, refColumn }, foreignKeyConfirmed: true, foreignKeyRefused: false }
        : col
    )
    setRefusedTargets((prev) => { const n = { ...prev }; delete n[originalName]; return n })
    onChange({ ...config, columns })
  }

  const removeForeignKey = (originalName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName
        ? { ...col, foreignKey: null, foreignKeyConfirmed: false, foreignKeyRefused: false }
        : col
    )
    setRefusedTargets((prev) => { const n = { ...prev }; delete n[originalName]; return n })
    onChange({ ...config, columns })
  }

  const addForeignKey = () => {
    if (!newFkCol || !newFkTarget) return
    const [refTable, refColumn] = newFkTarget.split('::')
    const columns = config.columns.map((col) =>
      col.originalName === newFkCol
        ? { ...col, foreignKey: { refTable, refColumn }, foreignKeyConfirmed: true }
        : col
    )
    onChange({ ...config, columns })
    setNewFkCol('')
    setNewFkTarget('')
  }

  const addAutoIdColumn = () => {
    const autoCol: ColumnConfig = {
      originalName: '__auto_id__', name: 'id', type: 'INT',
      isPrimaryKey: true, isAuto: true, isPkCandidate: true,
    }
    const others = config.columns.map((col) => ({ ...col, isPrimaryKey: false }))
    onChange({ ...config, columns: [autoCol, ...others], rows: config.rows.map((row, i) => [i + 1, ...row]) })
  }

  const removeAutoIdColumn = () => {
    const idx = config.columns.findIndex((col) => col.isAuto)
    if (idx === -1) return
    onChange({
      ...config,
      columns: config.columns.filter((col) => !col.isAuto),
      rows: config.rows.map((row) => row.filter((_, i) => i !== idx)),
    })
  }

  const moveColumn = (from: number, to: number) => {
    if (from === to) return
    const columns = [...config.columns]
    const [movedCol] = columns.splice(from, 1)
    columns.splice(to, 0, movedCol)
    const rows = config.rows.map((row) => {
      const newRow = [...row]
      const [movedCell] = newRow.splice(from, 1)
      newRow.splice(to, 0, movedCell)
      return newRow
    })
    onChange({ ...config, columns, rows })
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null) moveColumn(dragIndex, targetIndex)
    setDragIndex(null)
    setOverIndex(null)
  }

  const primaryKey   = config.columns.find((col) => col.isPrimaryKey && !col.excluded)
  const hasAutoId    = config.columns.some((col) => col.isAuto)
  const activeCols   = config.columns.filter((c) => !c.excluded)
  const excludedCols = config.columns.filter((c) => c.excluded)

  const pendingFks      = activeCols.filter((c) => c.foreignKey != null && !c.foreignKeyConfirmed && !c.foreignKeyRefused)
  const confirmedFks    = activeCols.filter((c) => c.foreignKey != null && c.foreignKeyConfirmed)
  const refusedFks      = config.columns.filter((c) => c.foreignKeyRefused)
  const linkableColumns = activeCols.filter((c) => !c.isPrimaryKey && !c.isAuto && c.foreignKey == null && !c.foreignKeyRefused)

  return (
    <div className="key-selector">

      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Personnaliser</h2>
        <p className="section-desc">
          Renommez les colonnes, ajustez les types, réorganisez et choisissez l'identifiant unique.
        </p>
      </div>

      <div>
        <label className="section-label mb6">Nom du tableau</label>
        <input type="text" value={config.tableName} onChange={(e) => updateTableName(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div>
        <label className="section-label">Colonnes &amp; identifiant unique</label>
        <p className="section-desc">
          Cochez l'identifiant unique. Changez le type si nécessaire. Cliquez ✕ pour exclure une colonne.
        </p>

        <div className="col-legend">
          <span /><span className="center">ID</span><span>Nom</span><span>Type</span><span />
        </div>

        <div className="col-list">
          {config.columns.filter((c) => !c.excluded).map((col: ColumnConfig, index) => {
            const badge       = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
            const isSelected  = col.isPrimaryKey
            const isDragging  = dragIndex === index
            const isOver      = overIndex === index && dragIndex !== null && dragIndex !== index
            const isCandidate = col.isAuto || col.isPkCandidate === true
            const isGrayed    = !isCandidate && !isSelected

            return (
              <div
                key={col.originalName}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(index) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(index) }}
                className={[
                  'col-row',
                  isSelected  ? 'selected'  : '',
                  isOver      ? 'over'      : '',
                  isDragging  ? 'dragging'  : '',
                  isGrayed    ? 'grayed'    : '',
                  isCandidate && !isSelected && !isOver ? 'candidate' : '',
                ].filter(Boolean).join(' ')}
              >
                <div
                  className="col-grip"
                  draggable
                  onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                  title="Glisser pour réorganiser"
                >
                  <GripIcon />
                </div>

                <div className="col-radio-wrap">
                  <input
                    type="radio"
                    name="primaryKey"
                    checked={isSelected}
                    onChange={() => isCandidate && updatePrimaryKey(col.originalName)}
                    disabled={!isCandidate}
                    title={isCandidate ? 'Choisir comme identifiant unique' : 'Cette colonne contient des doublons'}
                    className="col-radio"
                    style={{ cursor: isCandidate ? 'pointer' : 'not-allowed' }}
                  />
                </div>

                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumnName(col.originalName, e.target.value)}
                  onFocus={() => onFocusColumn(col.originalName)}
                  onBlur={() => onFocusColumn(null)}
                  className={`col-name-input${isGrayed ? ' grayed' : ''}`}
                />

                <select
                  value={col.type}
                  onChange={(e) => updateColumnType(col.originalName, e.target.value)}
                  className="app-select"
                  style={{
                    padding: '3px 6px', fontSize: '11px',
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.bg}`,
                    opacity: isGrayed ? 0.5 : 1,
                  }}
                >
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>

                <button
                  className="col-exclude-btn"
                  onClick={() => excludeColumn(col.originalName)}
                  disabled={col.isPrimaryKey || col.isAuto}
                  title={col.isPrimaryKey ? "L'identifiant ne peut pas être exclu" : 'Exclure cette colonne'}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {excludedCols.length > 0 && (
          <div className="excluded-list">
            <p className="excluded-note">Colonnes exclues (ne seront pas importées) :</p>
            {excludedCols.map((col) => (
              <div key={col.originalName} className="excluded-item">
                <span className="excluded-name">{col.name}</span>
                <button className="include-btn" onClick={() => includeColumn(col.originalName)}>Inclure</button>
              </div>
            ))}
          </div>
        )}

        <p className="col-hint">Glissez la poignée pour réorganiser. Cliquez sur un nom pour surligner la colonne.</p>
      </div>

      {hasAutoId ? (
        <div className="auto-id-present">
          <span className="auto-id-label">
            Colonne <strong>id</strong> automatique ajoutée (1 → {config.rows.length})
          </span>
          <button className="auto-id-remove" onClick={removeAutoIdColumn}>Retirer</button>
        </div>
      ) : (
        <div className="auto-id-absent">
          <p className="auto-id-absent-desc">
            Aucune colonne identifiant&nbsp;? Excelium peut en générer une, numérotée de 1 à {config.rows.length}.
          </p>
          <button className="auto-id-btn" onClick={addAutoIdColumn}>+ Générer un identifiant automatique</button>
        </div>
      )}

      <div>
        <label className="section-label">Références vers d'autres feuilles</label>
        <p className="section-desc">
          Ces colonnes semblent faire référence à l'identifiant d'une autre feuille.
          Confirmez ou refusez chaque suggestion.
        </p>

        {pendingFks.length > 0 && (
          <div className="fk-list">
            {pendingFks.map((col) => (
              <div key={col.originalName} className="fk-suggestion">
                <div className="fk-suggestion-tag">Suggestion du système</div>
                <div className="fk-suggestion-body">
                  La colonne{' '}
                  <strong className="fk-col-name">{col.name}</strong>{' '}
                  semble faire référence à{' '}
                  <strong className="fk-ref-name">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</strong>
                </div>
                <div className="fk-suggestion-actions">
                  <button className="fk-confirm-btn" onClick={() => confirmForeignKey(col.originalName)}>✓ Confirmer</button>
                  <button className="fk-refuse-btn"  onClick={() => refuseForeignKey(col.originalName)}>✗ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {confirmedFks.length > 0 && (
          <div className="fk-confirmed-list">
            {confirmedFks.map((col) => (
              <div key={col.originalName} className="fk-confirmed-item">
                <span className="fk-confirmed-icon">✓</span>
                <span className="fk-confirmed-body">
                  <span className="fk-confirmed-col">{col.name}</span>
                  <span className="fk-confirmed-sep">fait référence à</span>
                  <span className="fk-confirmed-ref">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</span>
                </span>
                <button className="fk-cancel-btn" onClick={() => refuseForeignKey(col.originalName)}>Annuler</button>
              </div>
            ))}
          </div>
        )}

        {refusedFks.length > 0 && (
          <div className="fk-refused-list">
            <p className="fk-refused-title">Liens refusés — changer la cible ou supprimer</p>
            {refusedFks.map((col) => {
              const defaultTarget = col.foreignKey
                ? `${col.foreignKey.refTable}::${col.foreignKey.refColumn}`
                : (fkTargets[0]?.value ?? '')
              const currentTarget = refusedTargets[col.originalName] ?? defaultTarget
              const [refTable, refColumn] = currentTarget.split('::')
              return (
                <div key={col.originalName} className="fk-refused-item">
                  <div className="fk-refused-row">
                    <span className="fk-refused-col">{col.name}</span>
                    <span className="fk-refused-arrow">→</span>
                    <select
                      value={currentTarget}
                      onChange={(e) => setRefusedTargets((prev) => ({ ...prev, [col.originalName]: e.target.value }))}
                      className="app-select"
                      style={{ flex: 1, minWidth: '140px' }}
                    >
                      {fkTargets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button
                      className="fk-link-btn"
                      onClick={() => relinkForeignKey(col.originalName, refTable, refColumn)}
                      disabled={!currentTarget}
                    >✓ Lier</button>
                    <button className="fk-remove-btn" onClick={() => removeForeignKey(col.originalName)}>Supprimer</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {fkTargets.length > 0 && linkableColumns.length > 0 && (
          <div className="fk-add-box">
            <p className="fk-add-title">Ajouter un lien manuellement</p>
            <div className="fk-add-row">
              <select value={newFkCol} onChange={(e) => setNewFkCol(e.target.value)} className="app-select" style={{ flex: 1, minWidth: '120px' }}>
                <option value="">Colonne de ce tableau…</option>
                {linkableColumns.map((col) => <option key={col.originalName} value={col.originalName}>{col.name}</option>)}
              </select>
              <span className="fk-add-sep">fait référence à</span>
              <select value={newFkTarget} onChange={(e) => setNewFkTarget(e.target.value)} className="app-select" style={{ flex: 1, minWidth: '150px' }}>
                <option value="">Identifiant cible…</option>
                {fkTargets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                className={`fk-add-btn${newFkCol && newFkTarget ? ' ready' : ' unready'}`}
                onClick={addForeignKey}
                disabled={!newFkCol || !newFkTarget}
              >+ Lier</button>
            </div>
          </div>
        )}

        {pendingFks.length === 0 && confirmedFks.length === 0 && refusedFks.length === 0 && fkTargets.length === 0 && (
          <div className="fk-empty">
            <p>Aucune référence vers une autre feuille détectée.</p>
          </div>
        )}
      </div>

      <div className={`pk-status${primaryKey ? ' ok' : ''}`}>
        {primaryKey
          ? <>Identifiant unique : <strong>{primaryKey.name}</strong></>
          : <>Sélectionnez une colonne identifiant avant de continuer.</>
        }
      </div>

    </div>
  )
}

export default StepKeySelector
