import { useEffect, useRef, useState } from 'react'
import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'
import { useI18n } from '../../lib/i18n'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
  onDependency?: (rowIndex: number) => void
  expandedRowIndex?: number | null
}

function CardListView({ columns, rows, onRowClick, onDependency, expandedRowIndex }: Props) {
  const { t } = useI18n()
  const titleCol  = columns.find((c) => c.role === 'title') ?? columns.find((c) => c.role === 'text')
  const badgeCols = columns.filter((c) => c.role === 'status' || c.role === 'category').slice(0, 2)
  const infoCols  = columns
    .filter((c) => c !== titleCol && !badgeCols.includes(c) && c.role !== 'image')
    .slice(0, 5)

  const gridRef  = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => {
      const children = Array.from(el.children) as HTMLElement[]
      if (children.length < 1) return
      const firstTop = children[0].getBoundingClientRect().top
      let count = 0
      for (const child of children) {
        if (Math.abs(child.getBoundingClientRect().top - firstTop) < 4) count++
        else break
      }
      if (count > 0) setCols(count)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [rows.length])

  // Group row indices into visual rows
  const rowGroups: number[][] = []
  for (let i = 0; i < rows.length; i += cols) {
    rowGroups.push(Array.from({ length: Math.min(cols, rows.length - i) }, (_, j) => i + j))
  }

  return (
    <div>
      {rowGroups.map((group, gi) => (
        <div key={gi}>
          <div ref={gi === 0 ? gridRef : undefined} className="card-list-grid">
            {group.map((ri) => {
              const row = rows[ri]
              const isExpanded = expandedRowIndex === ri
              return (
                <div
                  key={ri}
                  className={`card-list-item${isExpanded ? ' card-expanded' : ''}`}
                  onClick={() => onRowClick(ri)}
                >
                  <div className="card-list-header">
                    <span className="card-list-title">
                      {titleCol ? String(row[titleCol.index] ?? '') : `Ligne ${ri + 1}`}
                    </span>
                    <span className="card-list-badges">
                      {badgeCols.map((c) => (
                        <span key={c.index}>{renderCell(c.role, row[c.index])}</span>
                      ))}
                    </span>
                  </div>

                  {infoCols.map((c) => (
                    <div key={c.index} className="card-list-row">
                      <span className="card-list-label">{c.name}</span>
                      <span className="card-list-value">{renderCell(c.role, row[c.index])}</span>
                    </div>
                  ))}

                  {onDependency && (
                    <button
                      className={`card-dep-btn${isExpanded ? ' active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onDependency(ri) }}
                    >
                      ⛓ {t('app.dependencies')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardListView
