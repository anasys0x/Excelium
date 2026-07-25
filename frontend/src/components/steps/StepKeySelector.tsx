import { useState } from 'react'
import type { TableConfig, ColumnConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'
import { useI18n } from '../../lib/i18n'

const ALL_TYPES = ['INT', 'FLOAT', 'STRING', 'DATE', 'BOOL', 'MIXED']

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  STRING: { bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)'  },
  DATE:   { bg: 'var(--badge-amber-bg)',  color: 'var(--amber-text)'        },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

interface FkTarget { value: string; label: string; tableName: string; colName: string }

interface Props {
  config: TableConfig
  allTables: TableConfig[]
  onChange: (config: TableConfig) => void
  onFocusColumn: (name: string | null) => void
}

function StepKeySelector({ config, allTables, onChange, onFocusColumn }: Props) {
  const { t, lang } = useI18n()
  const [newFkCol, setNewFkCol]             = useState('')
  const [newFkTarget, setNewFkTarget]       = useState('')
  const [refusedTargets, setRefusedTargets] = useState<Record<string, string>>({})

  const fkTargets: FkTarget[] = allTables
    .filter((tbl) => tbl.id !== config.id)
    .flatMap((tbl) =>
      tbl.columns
        .filter((c) => c.isPrimaryKey || c.isPkCandidate)
        .map((c) => ({
          value: `${tbl.tableName}::${c.name}`,
          label: `${tbl.tableName}  →  ${c.name}`,
          tableName: tbl.tableName,
          colName: c.name,
        }))
    )

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
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{t('keySel.title')}</h2>
        <p className="section-desc">{t('keySel.desc')}</p>
      </div>

      <div>
        <label className="section-label">{t('preview.idTitle')}</label>
        <p className="section-desc">{t('keySel.idDesc')}</p>

        <div className="col-legend">
          <span className="center">{t('common.identifier')}</span><span>{t('common.name')}</span><span>{t('common.type')}</span>
        </div>

        <div className="col-list">
          {config.columns
            .filter((col) => !col.excluded && (col.isAuto || col.isPkCandidate === true || col.isPrimaryKey))
            .map((col) => {
            const badge      = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
            const isSelected = col.isPrimaryKey

            return (
              <div
                key={col.originalName}
                className={`col-row${isSelected ? ' selected' : ' candidate'}`}
              >
                <div className="col-radio-wrap">
                  <input
                    type="radio"
                    name="primaryKey"
                    checked={isSelected}
                    onChange={() => updatePrimaryKey(col.originalName)}
                    title={t('keySel.pickId')}
                    className="col-radio"
                  />
                </div>

                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumnName(col.originalName, e.target.value)}
                  onFocus={() => onFocusColumn(col.originalName)}
                  onBlur={() => onFocusColumn(null)}
                  className="col-name-input"
                />

                <select
                  value={col.type}
                  onChange={(e) => updateColumnType(col.originalName, e.target.value)}
                  className="app-select"
                  style={{
                    padding: '3px 6px', fontSize: '11px',
                    background: badge.bg, color: badge.color,
                    border: `1px solid ${badge.bg}`,
                  }}
                >
                  {ALL_TYPES.map((ty) => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
                </select>
              </div>
            )
          })}
        </div>

        {excludedCols.length > 0 && (
          <div className="excluded-list">
            <p className="excluded-note">{t('keySel.excludedNote')}</p>
            {excludedCols.map((col) => (
              <div key={col.originalName} className="excluded-item">
                <span className="excluded-name">{col.name}</span>
                <button className="include-btn" onClick={() => includeColumn(col.originalName)}>{t('keySel.include')}</button>
              </div>
            ))}
          </div>
        )}

        <p className="col-hint">{t('keySel.hint')}</p>
      </div>

      {hasAutoId ? (
        <div className="auto-id-present">
          <span className="auto-id-label">{t('keySel.autoIdPresent', { n: config.rows.length })}</span>
          <button className="auto-id-remove" onClick={removeAutoIdColumn}>{t('keySel.remove')}</button>
        </div>
      ) : (
        <div className={`auto-id-absent${primaryKey ? '' : ' needs-attention'}`}>
          <p className="auto-id-absent-desc">{t('keySel.autoIdAbsent', { n: config.rows.length })}</p>
          <button className="auto-id-btn" onClick={addAutoIdColumn}>{t('keySel.autoIdBtn')}</button>
        </div>
      )}

      <div className={`pk-status${primaryKey ? ' ok' : ''}`}>
        {primaryKey
          ? <>{t('preview.idTitle')} : <strong>{primaryKey.name}</strong></>
          : <>{t('keySel.pkStatusNone')}</>
        }
      </div>

      <div>
        <label className="section-label">{t('keySel.refsTitle')}</label>
        <p className="section-desc">{t('keySel.refsDesc')}</p>

        {pendingFks.length > 0 && (
          <div className="fk-list">
            {pendingFks.map((col) => (
              <div key={col.originalName} className="fk-suggestion">
                <div className="fk-suggestion-tag">{t('keySel.suggestionTag')}</div>
                <div className="fk-suggestion-body">
                  {t('keySel.fkColumnWord')}{' '}
                  <strong className="fk-col-name">{col.name}</strong>{' '}
                  {t('keySel.fkSeemsRef')}{' '}
                  <strong className="fk-ref-name">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</strong>
                </div>
                <div className="fk-suggestion-actions">
                  <button className="fk-confirm-btn" onClick={() => confirmForeignKey(col.originalName)}>{t('keySel.confirm')}</button>
                  <button className="fk-refuse-btn"  onClick={() => refuseForeignKey(col.originalName)}>{t('keySel.refuse')}</button>
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
                  <span className="fk-confirmed-sep">{t('recap.refersTo')}</span>
                  <span className="fk-confirmed-ref">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</span>
                </span>
                <button className="fk-cancel-btn" onClick={() => refuseForeignKey(col.originalName)}>{t('keySel.cancel')}</button>
              </div>
            ))}
          </div>
        )}

        {refusedFks.length > 0 && (
          <div className="fk-refused-list">
            <p className="fk-refused-title">{t('keySel.refusedTitle')}</p>
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
                      {fkTargets.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                    <button
                      className="fk-link-btn"
                      onClick={() => relinkForeignKey(col.originalName, refTable, refColumn)}
                      disabled={!currentTarget}
                    >{t('keySel.linkBtn')}</button>
                    <button className="fk-remove-btn" onClick={() => removeForeignKey(col.originalName)}>{t('keySel.delete')}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {fkTargets.length > 0 && linkableColumns.length > 0 && (
          <div className="fk-add-box">
            <p className="fk-add-title">{t('keySel.addTitle')}</p>
            <div className="fk-add-row">
              <select value={newFkCol} onChange={(e) => setNewFkCol(e.target.value)} className="app-select" style={{ flex: 1, minWidth: '120px' }}>
                <option value="">{t('keySel.colOfTable')}</option>
                {linkableColumns.map((col) => <option key={col.originalName} value={col.originalName}>{col.name}</option>)}
              </select>
              <span className="fk-add-sep">{t('recap.refersTo')}</span>
              <select value={newFkTarget} onChange={(e) => setNewFkTarget(e.target.value)} className="app-select" style={{ flex: 1, minWidth: '150px' }}>
                <option value="">{t('keySel.targetId')}</option>
                {fkTargets.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
              <button
                className={`fk-add-btn${newFkCol && newFkTarget ? ' ready' : ' unready'}`}
                onClick={addForeignKey}
                disabled={!newFkCol || !newFkTarget}
              >{t('keySel.addBtn')}</button>
            </div>
          </div>
        )}

        {pendingFks.length === 0 && confirmedFks.length === 0 && refusedFks.length === 0 && fkTargets.length === 0 && (
          <div className="fk-empty">
            <p>{t('keySel.fkEmpty')}</p>
          </div>
        )}
      </div>

    </div>
  )
}

export default StepKeySelector
