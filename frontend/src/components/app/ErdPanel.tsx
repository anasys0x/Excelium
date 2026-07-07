import type { TableConfig } from '../../App'

interface Props {
  tables: TableConfig[]
  onClose: () => void
}

const BOX_W    = 210
const HEADER_H = 36
const COL_H    = 22
const PAD      = 32
const GAP_X    = 80
const GAP_Y    = 36

function visibleCols(t: TableConfig) {
  return t.columns.filter((c) => !c.excluded)
}

function boxH(t: TableConfig) {
  return HEADER_H + visibleCols(t).length * COL_H + 12
}

type Pos = { x: number; y: number; w: number; h: number }

function computeLayout(tables: TableConfig[]): Record<string, Pos> {
  // Referenced tables (parents) on left column, others on right
  const referencedNames = new Set(
    tables.flatMap((t) =>
      visibleCols(t)
        .filter((c) => c.foreignKey && c.foreignKeyConfirmed)
        .map((c) => c.foreignKey!.refTable)
    )
  )
  const hasOutgoing = (t: TableConfig) =>
    visibleCols(t).some((c) => c.foreignKey && c.foreignKeyConfirmed)

  const left  = tables.filter((t) => referencedNames.has(t.tableName) && !hasOutgoing(t))
  const right  = tables.filter((t) => !referencedNames.has(t.tableName) && hasOutgoing(t))
  const middle = tables.filter(
    (t) =>
      (referencedNames.has(t.tableName) && hasOutgoing(t)) ||
      (!referencedNames.has(t.tableName) && !hasOutgoing(t))
  )

  // Place in 2-column grid: left col = parents, right col = children + others
  const leftTables  = [...left, ...middle.filter((_, i) => i % 2 === 0)]
  const rightTables = [...right, ...middle.filter((_, i) => i % 2 !== 0)]

  const positions: Record<string, Pos> = {}
  let y0 = PAD, y1 = PAD
  const x0 = PAD
  const x1 = PAD + BOX_W + GAP_X

  leftTables.forEach((t) => {
    positions[t.tableName] = { x: x0, y: y0, w: BOX_W, h: boxH(t) }
    y0 += boxH(t) + GAP_Y
  })
  rightTables.forEach((t) => {
    positions[t.tableName] = { x: x1, y: y1, w: BOX_W, h: boxH(t) }
    y1 += boxH(t) + GAP_Y
  })
  // Fallback: tables not placed yet
  tables.forEach((t) => {
    if (!positions[t.tableName]) {
      positions[t.tableName] = { x: x0, y: y0, w: BOX_W, h: boxH(t) }
      y0 += boxH(t) + GAP_Y
    }
  })

  return positions
}

function ErdPanel({ tables, onClose }: Props) {
  const positions = computeLayout(tables)
  const totalW = PAD + BOX_W + GAP_X + BOX_W + PAD
  const totalH = Math.max(
    ...Object.values(positions).map((p) => p.y + p.h)
  ) + PAD

  // Build FK arrows
  const arrows: { id: string; d: string; midX: number; midY: number; label: string }[] = []

  tables.forEach((t) => {
    const srcBox = positions[t.tableName]
    if (!srcBox) return
    const cols = visibleCols(t)

    cols.forEach((col, colIdx) => {
      if (!col.foreignKey || !col.foreignKeyConfirmed) return
      const refTable = tables.find((tt) => tt.tableName === col.foreignKey!.refTable)
      const tgtBox   = positions[col.foreignKey!.refTable]
      if (!refTable || !tgtBox) return

      const refCols   = visibleCols(refTable)
      const pkIdx     = refCols.findIndex((c) => c.name === col.foreignKey!.refColumn)
      const effectivePkIdx = pkIdx >= 0 ? pkIdx : 0

      const srcX = srcBox.x + BOX_W
      const srcY = srcBox.y + HEADER_H + colIdx * COL_H + COL_H / 2
      const tgtX = tgtBox.x
      const tgtY = tgtBox.y + HEADER_H + effectivePkIdx * COL_H + COL_H / 2

      const dx   = Math.max(40, Math.abs(tgtX - srcX) * 0.5)
      const d    = `M ${srcX} ${srcY} C ${srcX + dx} ${srcY} ${tgtX - dx} ${tgtY} ${tgtX} ${tgtY}`
      const midX = (srcX + tgtX) / 2
      const midY = (srcY + tgtY) / 2

      arrows.push({ id: `${t.tableName}-${col.name}`, d, midX, midY, label: col.name })
    })
  })

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="erd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2 className="detail-title">Schéma des relations</h2>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="erd-scroll">
          <svg
            viewBox={`0 0 ${totalW} ${totalH}`}
            width={totalW}
            height={totalH}
            style={{ display: 'block' }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="var(--accent)" />
              </marker>
            </defs>

            {/* FK arrows */}
            {arrows.map((a) => (
              <g key={a.id}>
                <path
                  d={a.d}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                  markerEnd="url(#arrow)"
                  opacity={0.7}
                />
                <text
                  x={a.midX}
                  y={a.midY - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {a.label}
                </text>
              </g>
            ))}

            {/* Table boxes */}
            {tables.map((t) => {
              const pos  = positions[t.tableName]
              if (!pos) return null
              const cols = visibleCols(t)

              return (
                <g key={t.tableName}>
                  {/* Box shadow */}
                  <rect
                    x={pos.x + 2} y={pos.y + 2}
                    width={pos.w} height={pos.h}
                    rx="6" ry="6"
                    fill="rgba(0,0,0,.15)"
                  />
                  {/* Box bg */}
                  <rect
                    x={pos.x} y={pos.y}
                    width={pos.w} height={pos.h}
                    rx="6" ry="6"
                    fill="var(--surface)"
                    stroke="var(--border)"
                    strokeWidth="1.5"
                  />
                  {/* Header */}
                  <rect
                    x={pos.x} y={pos.y}
                    width={pos.w} height={HEADER_H}
                    rx="6" ry="6"
                    fill="var(--surface-alt)"
                  />
                  <rect
                    x={pos.x} y={pos.y + HEADER_H - 6}
                    width={pos.w} height={6}
                    fill="var(--surface-alt)"
                  />
                  <rect
                    x={pos.x} y={pos.y + HEADER_H - 1}
                    width={pos.w} height={1}
                    fill="var(--border)"
                  />
                  <text
                    x={pos.x + 12} y={pos.y + HEADER_H / 2 + 5}
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono', monospace"
                    fill="var(--accent-text)"
                  >
                    {t.tableName}
                  </text>

                  {/* Columns */}
                  {cols.map((col, i) => {
                    const cy = pos.y + HEADER_H + i * COL_H
                    const isFk = col.foreignKey && col.foreignKeyConfirmed
                    return (
                      <g key={col.name}>
                        {i > 0 && (
                          <line
                            x1={pos.x} y1={cy}
                            x2={pos.x + pos.w} y2={cy}
                            stroke="var(--line)" strokeWidth="0.5"
                          />
                        )}
                        {col.isPrimaryKey && (
                          <text
                            x={pos.x + 10} y={cy + COL_H / 2 + 4}
                            fontSize="9" fontWeight="700"
                            fill="var(--accent-text)"
                            fontFamily="'JetBrains Mono', monospace"
                          >PK</text>
                        )}
                        {isFk && !col.isPrimaryKey && (
                          <text
                            x={pos.x + 10} y={cy + COL_H / 2 + 4}
                            fontSize="9" fontWeight="700"
                            fill="var(--badge-green-text)"
                            fontFamily="'JetBrains Mono', monospace"
                          >FK</text>
                        )}
                        <text
                          x={pos.x + 34} y={cy + COL_H / 2 + 4}
                          fontSize="11"
                          fontFamily="'JetBrains Mono', monospace"
                          fill={col.isPrimaryKey ? 'var(--accent-text)' : isFk ? 'var(--badge-green-text)' : 'var(--cell-text)'}
                        >
                          {col.name}
                        </text>
                        <text
                          x={pos.x + pos.w - 8} y={cy + COL_H / 2 + 4}
                          fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          fill="var(--text-muted)"
                          textAnchor="end"
                        >
                          {col.type}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

export default ErdPanel
