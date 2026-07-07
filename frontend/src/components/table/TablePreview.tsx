import { useLayoutEffect, useRef, useState } from 'react'
import type { ColumnConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
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
}

interface HighlightRect { left: number; top: number; width: number; height: number }

function TablePreview({ columns, rows, focusedColumn, showMeta = true }: Props) {
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

  return (
    <div>
      {showMeta && (
        <p className="preview-meta">
          {rows.length} ligne{rows.length > 1 ? 's' : ''} · {columns.length} colonnes — lecture seule
        </p>
      )}
      <div ref={wrapperRef} className="preview-wrapper">
        <div ref={scrollRef} className="preview-scroll">
          <table ref={tableRef} className="preview-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const badge     = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  const isFocused = focusedColumn === col.originalName
                  return (
                    <th
                      key={col.originalName}
                      ref={(el) => { thRefs.current[col.originalName] = el }}
                      className={`preview-th${isFocused ? ' focused' : ''}`}
                    >
                      <div className="preview-th-inner">
                        {col.isPrimaryKey && <span className="preview-th-key" title="Identifiant unique">CLÉ</span>}
                        <span className={`preview-th-name${isFocused ? ' focused' : ''}`}>{col.name}</span>
                        <span className="type-badge-sm" style={{ background: badge.bg, color: badge.color }}>
                          {typeLabel(col.type)}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
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
