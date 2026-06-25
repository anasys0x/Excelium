import { useLayoutEffect, useRef, useState } from 'react'
import type { ColumnConfig } from '../../App'

const ACCENT = 'var(--highlight)'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  FLOAT:  { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  STRING: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  DATE:   { bg: 'var(--badge-amber-bg)', color: 'var(--amber-text)' },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

interface Props {
  columns: ColumnConfig[]
  rows: unknown[][]
  focusedColumn?: string | null
  showMeta?: boolean
}

interface HighlightRect {
  left: number
  top: number
  width: number
  height: number
}

function TablePreview({ columns, rows, focusedColumn, showMeta = true }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const tableRef   = useRef<HTMLTableElement>(null)
  const thRefs     = useRef<Record<string, HTMLTableCellElement | null>>({})
  const [rect, setRect] = useState<HighlightRect | null>(null)

  // Calcule la position/dimension du contour à partir de la colonne ciblée
  useLayoutEffect(() => {
    const compute = () => {
      const wrapper = wrapperRef.current
      const table   = tableRef.current
      if (!focusedColumn || !wrapper || !table) {
        setRect(null)
        return
      }
      const th = thRefs.current[focusedColumn]
      if (!th) {
        setRect(null)
        return
      }

      // Compense un éventuel CSS zoom : getBoundingClientRect renvoie des pixels
      // visuels (zoomés), offsetWidth des pixels de layout. Leur ratio = le zoom.
      // On divise pour revenir en coordonnées de layout, attendues par l'overlay.
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
    return () => {
      window.removeEventListener('resize', compute)
      scroller?.removeEventListener('scroll', compute)
    }
  }, [focusedColumn, columns, rows])

  return (
    <div>
      {showMeta && (
        <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '10px' }}>
          {rows.length} ligne{rows.length > 1 ? 's' : ''} · {columns.length} colonnes — lecture seule
        </p>
      )}

      {/* Wrapper non rognant : laisse passer la lueur externe du contour */}
      <div ref={wrapperRef} style={{ position: 'relative' }}>

        {/* Conteneur scrollable (scroll seulement en cas extrême) */}
        <div ref={scrollRef} style={{
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          overflowX: 'auto',
        }}>
          <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                {columns.map((col) => {
                  const badge     = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  const isFocused = focusedColumn === col.originalName

                  return (
                    <th
                      key={col.originalName}
                      ref={(el) => { thRefs.current[col.originalName] = el }}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        background: isFocused ? 'var(--accent-soft)' : 'var(--surface-alt)',
                        whiteSpace: 'nowrap',
                        transition: 'background .15s',
                        borderRight:  '1px solid var(--border)',
                        borderBottom: '2px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {col.isPrimaryKey && (
                          <span
                            title="Identifiant unique"
                            style={{
                              fontSize: '10px',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-text)',
                              border: '1px solid var(--accent-border)',
                              borderRadius: '3px',
                              padding: '0 4px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              flexShrink: 0,
                            }}
                          >
                            CLÉ
                          </span>
                        )}

                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isFocused ? 'var(--accent-text)' : 'var(--text)',
                        }}>
                          {col.name}
                        </span>

                        <span style={{
                          fontSize: '10px',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 500,
                          background: badge.bg,
                          color: badge.color,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          flexShrink: 0,
                        }}>
                          {col.type}
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
                      <td key={cellIndex} style={{
                        padding: '8px 14px',
                        background: isFocused
                          ? 'var(--row-hover)'
                          : rowIndex % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)',
                        color: isEmpty ? 'var(--border-strong)' : 'var(--cell-text)',
                        fontStyle: isEmpty ? 'italic' : 'normal',
                        whiteSpace: 'nowrap',
                        transition: 'background .15s',
                        borderRight:  '1px solid var(--line)',
                        borderBottom: '1px solid var(--line)',
                      }}>
                        {isEmpty ? 'vide' : String(cell)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contour continu + lueur externe, dessiné en une seule pièce */}
        {rect && (
          <div style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: `2px solid ${ACCENT}`,
            borderRadius: '6px',
            boxShadow: '0 0 0 3px var(--glow-soft), 0 0 16px 3px var(--glow)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: 2,
            transition: 'left .12s ease, width .12s ease',
          }} />
        )}

      </div>
    </div>
  )
}

export default TablePreview
