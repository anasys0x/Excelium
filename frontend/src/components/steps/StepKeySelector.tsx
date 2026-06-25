import { useState } from 'react'
import type { TableConfig, ColumnConfig } from '../../App'

const ACCENT = 'var(--accent)'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  FLOAT:  { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  STRING: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  DATE:   { bg: 'var(--badge-amber-bg)', color: 'var(--amber-text)' },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

// Poignée à 6 points (2 colonnes × 3 lignes)
function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true" style={{ color: 'var(--text-faint)' }}>
      {[3, 8, 13].map((cy) =>
        [2, 8].map((cx) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="currentColor" />
        ))
      )}
    </svg>
  )
}

interface Props {
  config: TableConfig
  onChange: (config: TableConfig) => void
  onFocusColumn: (name: string | null) => void
}

function StepKeySelector({ config, onChange, onFocusColumn }: Props) {

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const updateTableName = (name: string) =>
    onChange({ ...config, tableName: name })

  const updateColumnName = (originalName: string, newName: string) => {
    const columns = config.columns.map((col) =>
      col.originalName === originalName ? { ...col, name: newName } : col
    )
    onChange({ ...config, columns })
  }

  const updatePrimaryKey = (originalName: string) => {
    const columns = config.columns.map((col) => ({
      ...col,
      isPrimaryKey: col.originalName === originalName,
    }))
    onChange({ ...config, columns })
  }

  // Ajoute une colonne id auto-incrémentée (1 → N) en tête de tableau
  const addAutoIdColumn = () => {
    const autoCol: ColumnConfig = {
      originalName: '__auto_id__',
      name: 'id',
      type: 'INT',
      isPrimaryKey: true,
      isAuto: true,
    }
    const others = config.columns.map((col) => ({ ...col, isPrimaryKey: false }))
    const columns = [autoCol, ...others]
    const rows = config.rows.map((row, i) => [i + 1, ...row])
    onChange({ ...config, columns, rows })
  }

  // Retire la colonne id automatique (et ses valeurs dans chaque ligne)
  const removeAutoIdColumn = () => {
    const idx = config.columns.findIndex((col) => col.isAuto)
    if (idx === -1) return
    const columns = config.columns.filter((col) => !col.isAuto)
    const rows = config.rows.map((row) => row.filter((_, i) => i !== idx))
    onChange({ ...config, columns, rows })
  }

  // Déplace une colonne ET les cellules correspondantes dans chaque ligne
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

  const primaryKey = config.columns.find((col) => col.isPrimaryKey)
  const hasAutoId  = config.columns.some((col) => col.isAuto)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* En-tête */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
          Personnaliser
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5' }}>
          Renommez les colonnes, réorganisez-les et choisissez l'identifiant unique.
        </p>
      </div>

      {/* Nom du tableau */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--cell-text)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '6px',
        }}>
          Nom du tableau
        </label>
        <input
          type="text"
          value={config.tableName}
          onChange={(e) => updateTableName(e.target.value)}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Sera utilisé comme nom de table SQL.
        </p>
      </div>

      {/* Colonnes */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--cell-text)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '4px',
        }}>
          Colonnes
        </label>

        {/* Légende */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '20px 28px 1fr auto',
          gap: '8px',
          padding: '5px 10px',
          marginBottom: '4px',
        }}>
          <span />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Clé</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nom</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Type</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {config.columns.map((col: ColumnConfig, index) => {
            const badge      = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
            const isSelected = col.isPrimaryKey
            const isDragging = dragIndex === index
            const isOver     = overIndex === index && dragIndex !== null && dragIndex !== index

            return (
              <div
                key={col.originalName}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(index) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(index) }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 28px 1fr auto',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  // Bordure uniforme (pas de borderTop plus épais qui déborde)
                  border: `1.5px solid ${isOver || isSelected ? ACCENT : 'var(--border)'}`,
                  background: isOver ? 'var(--row-hover)' : isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                  opacity: isDragging ? 0.4 : 1,
                  transition: 'border-color .15s, background .15s, opacity .15s',
                }}
              >
                {/* Poignée de déplacement (seule zone draggable) */}
                <div
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                  title="Glisser pour réorganiser"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    height: '100%',
                  }}
                >
                  <GripIcon />
                </div>

                {/* Radio : identifiant unique */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="radio"
                    name="primaryKey"
                    checked={isSelected}
                    onChange={() => updatePrimaryKey(col.originalName)}
                    title="Définir comme identifiant unique"
                    style={{ width: '15px', height: '15px', accentColor: ACCENT, cursor: 'pointer' }}
                  />
                </div>

                {/* Champ nom — highlight la colonne au focus */}
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumnName(col.originalName, e.target.value)}
                  onFocus={() => onFocusColumn(col.originalName)}
                  onBlur={() => onFocusColumn(null)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: '13px',
                    fontFamily: "'JetBrains Mono', monospace",
                    border: '1px solid var(--border-strong)',
                    borderRadius: '4px',
                    background: 'var(--surface-alt)',
                    color: 'var(--text)',
                  }}
                />

                {/* Badge type */}
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 500,
                  background: badge.bg,
                  color: badge.color,
                  whiteSpace: 'nowrap',
                }}>
                  {col.type}
                </span>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Glissez la poignée pour réorganiser. Cliquez sur un nom pour surligner la colonne dans le tableau.
        </p>
      </div>

      {/* Option : colonne id automatique */}
      {hasAutoId ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '6px',
          background: 'var(--ok-bg)',
          border: '1px solid var(--ok-border)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--badge-green-text)' }}>
            Colonne <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>id</strong> automatique ajoutée (1 → {config.rows.length})
          </span>
          <button
            onClick={removeAutoIdColumn}
            style={{
              padding: '4px 10px',
              background: 'var(--surface)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              borderRadius: '5px',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Retirer
          </button>
        </div>
      ) : (
        <div style={{
          padding: '12px 14px',
          borderRadius: '6px',
          background: 'var(--surface-alt)',
          border: '1px dashed var(--border-strong)',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>
            Pas de colonne identifiant&nbsp;? Excelium peut en générer une, numérotée de 1 à {config.rows.length}.
          </p>
          <button
            onClick={addAutoIdColumn}
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--surface)',
              color: ACCENT,
              border: `1px solid ${ACCENT}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Ajouter un identifiant automatique
          </button>
        </div>
      )}

      {/* Statut clé principale */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '6px',
        background: primaryKey ? 'var(--accent-soft)' : 'var(--warn-bg)',
        border: `1px solid ${primaryKey ? 'var(--accent-border)' : 'var(--warn-border)'}`,
        fontSize: '13px',
        color: primaryKey ? 'var(--accent-text)' : 'var(--amber-text)',
      }}>
        {primaryKey
          ? <>Identifiant unique : <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{primaryKey.name}</strong></>
          : <>Sélectionnez une colonne comme identifiant unique avant de continuer.</>
        }
      </div>

    </div>
  )
}

export default StepKeySelector
