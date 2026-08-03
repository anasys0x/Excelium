import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ColumnConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'
import { useI18n } from '../../lib/i18n'
import type { Lang } from '../../lib/i18n'

const ALL_TYPES = ['INT', 'FLOAT', 'STRING', 'DATE', 'BOOL', 'MIXED']

// Aperçu uniquement : affiche un extrait, pas les 5000+ lignes d'un gros
// fichier (ça fige le navigateur pour rien, ce panneau ne sert qu'à
// configurer les colonnes/clés, pas à consulter toutes les données).
const PREVIEW_ROW_LIMIT = 20

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)' },
  STRING: { bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)'  },
  DATE:   { bg: 'var(--badge-amber-bg)',  color: 'var(--amber-text)'        },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

interface Props {
  columns: ColumnConfig[]
  rows: unknown[][]
  focusedColumn?: string | null
  showMeta?: boolean
  onTypeChange?: (originalName: string, newType: string) => void
  onNameChange?: (originalName: string, newName: string) => void
  onFocusColumn?: (name: string | null) => void
  // Bascule l'exclusion d'une colonne (exclure si incluse, restaurer si déjà exclue).
  onExcludeColumn?: (originalName: string) => void
}

interface HighlightRect { left: number; top: number; width: number; height: number }

interface TypeSelectProps {
  value: string
  badge: { bg: string; color: string }
  lang: Lang
  onChange: (newType: string) => void
}

function TypeSelect({ value, badge, lang, onChange }: TypeSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="type-select" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="type-select-trigger"
        style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.bg}` }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {typeLabel(value, lang)}
      </button>
      {open && (
        <div className="type-select-menu" role="listbox">
          {ALL_TYPES.map((ty) => {
            const selected = ty === value
            return (
              <div
                key={ty}
                role="option"
                aria-selected={selected}
                className={`type-select-option${selected ? ' selected' : ''}`}
                onClick={() => { onChange(ty); setOpen(false) }}
              >
                {typeLabel(ty, lang)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TablePreview({ columns, rows, focusedColumn, showMeta = true, onTypeChange, onNameChange, onFocusColumn, onExcludeColumn }: Props) {
  const { t, lang } = useI18n()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const tableRef   = useRef<HTMLTableElement>(null)
  const thRefs     = useRef<Record<string, HTMLTableCellElement | null>>({})
  const [rect, setRect] = useState<HighlightRect | null>(null)

  useLayoutEffect(() => {
    const compute = () => {
      const wrapper = wrapperRef.current
      const table   = tableRef.current
      if (!focusedColumn || !wrapper || !table) { setRect(null); return }
      const th = thRefs.current[focusedColumn]
      if (!th) { setRect(null); return }
      const zoom = th.offsetWidth ? th.getBoundingClientRect().width / th.offsetWidth : 1
      const wBox = wrapper.getBoundingClientRect()
      const tBox = table.getBoundingClientRect()
      const hBox = th.getBoundingClientRect()
      setRect({
        left: (hBox.left - wBox.left) / zoom,
        top: (tBox.top - wBox.top) / zoom,
        width: hBox.width / zoom,
        height: tBox.height / zoom,
      })
    }
    compute()
    const scroller = scrollRef.current
    window.addEventListener('resize', compute)
    scroller?.addEventListener('scroll', compute)
    return () => { window.removeEventListener('resize', compute); scroller?.removeEventListener('scroll', compute) }
  }, [focusedColumn, columns, rows])

  const previewRows = rows.length > PREVIEW_ROW_LIMIT ? rows.slice(0, PREVIEW_ROW_LIMIT) : rows

  return (
    <div>
      {showMeta && (
        <p className="preview-meta">
          {rows.length} {t('word.row', { count: rows.length })} · {columns.length} {t('word.column', { count: columns.length })} — {t('preview.readonly')}
          {rows.length > PREVIEW_ROW_LIMIT && ` — ${t('preview.truncated', { shown: PREVIEW_ROW_LIMIT })}`}
        </p>
      )}
      <div ref={wrapperRef} className="preview-wrapper">
        <div ref={scrollRef} className="preview-scroll">
          <table ref={tableRef} className="preview-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const badge      = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  const isFocused  = focusedColumn === col.originalName
                  const isExcluded = col.excluded === true
                  return (
                    <th
                      key={col.originalName}
                      ref={(el) => { thRefs.current[col.originalName] = el }}
                      className={`preview-th${isFocused ? ' focused' : ''}${isExcluded ? ' excluded' : ''}`}
                    >
                      <div className="preview-th-inner">
                        {isExcluded ? (
                          <>
                            <span className="preview-th-name excluded-name">{col.name}</span>
                            {onExcludeColumn && (
                              <button
                                type="button"
                                className="preview-th-restore"
                                onClick={() => onExcludeColumn(col.originalName)}
                                title={t('preview.restoreColumn')}
                              >
                                ↺
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {col.isPrimaryKey && <span className="preview-th-key" title={t('preview.idTitle')}>{t('common.identifier')}</span>}
                            {onNameChange ? (
                              <input
                                className={`preview-th-name-input${isFocused ? ' focused' : ''}`}
                                value={col.name}
                                onChange={(e) => onNameChange(col.originalName, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={() => onFocusColumn?.(col.originalName)}
                                onBlur={() => onFocusColumn?.(null)}
                                spellCheck={false}
                                title={t('preview.rename')}
                                style={{ width: `${Math.max(col.name.length, 3) + 1.5}ch` }}
                              />
                            ) : (
                              <span className={`preview-th-name${isFocused ? ' focused' : ''}`}>{col.name}</span>
                            )}
                            {onTypeChange ? (
                              <TypeSelect
                                value={col.type}
                                badge={badge}
                                lang={lang}
                                onChange={(newType) => onTypeChange(col.originalName, newType)}
                              />
                            ) : (
                              <span className="type-badge-sm" style={{ background: badge.bg, color: badge.color }}>
                                {typeLabel(col.type, lang)}
                              </span>
                            )}
                            {onExcludeColumn && !col.isAuto && (
                              <button
                                type="button"
                                className="preview-th-remove"
                                onClick={() => onExcludeColumn(col.originalName)}
                                title={t('preview.removeColumn')}
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const col       = columns[cellIndex]
                    const isFocused = col && focusedColumn === col.originalName
                    const isEmpty   = cell === null || cell === undefined
                    return (
                      <td
                        key={cellIndex}
                        className={[
                          'preview-td',
                          isFocused ? 'focused' : rowIndex % 2 !== 0 ? 'alt' : '',
                          isEmpty ? 'empty' : '',
                          col?.excluded ? 'excluded' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {isEmpty ? 'vide' : String(cell)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rect && (
          <div
            className="preview-highlight"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        )}
      </div>
    </div>
  )
}

export default TablePreview
