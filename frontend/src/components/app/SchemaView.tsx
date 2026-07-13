import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import type { TableConfig } from '../../App'

interface FK { fromTable: string; fromCol: string; toTable: string; toCol: string }
interface Pos { x: number; y: number }

const NODE_W = 170
const NODE_HEAD = 36

function rowHeight(cols: number) { return NODE_HEAD + cols * 22 + 8 }

function edgePoint(from: Pos, to: Pos, fromH: number): Pos {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const angle = Math.atan2(dy, dx)
  const hw = NODE_W / 2
  const hh = fromH / 2
  const absX = Math.abs(Math.cos(angle))
  const absY = Math.abs(Math.sin(angle))
  const t = Math.min(hw / (absX || 0.001), hh / (absY || 0.001))
  return { x: from.x + Math.cos(angle) * t, y: from.y + Math.sin(angle) * t }
}

function circleLayout(tables: TableConfig[], w: number, h: number): Record<string, Pos> {
  const n = tables.length
  const cx = w / 2
  const cy = h / 2
  const rx = Math.min(cx - NODE_W / 2 - 24, 280)
  const ry = Math.min(cy - 80, 200)
  const pos: Record<string, Pos> = {}
  if (n === 1) { pos[tables[0].tableName] = { x: cx, y: cy }; return pos }
  tables.forEach((t, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    pos[t.tableName] = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
  })
  return pos
}

function SchemaView({ tables }: { tables: TableConfig[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, Pos>>({})
  const [size, setSize] = useState({ w: 800, h: 680 })

  const fks: FK[] = tables.flatMap((t) =>
    t.columns
      .filter((c) => !c.excluded && c.foreignKey)
      .map((c) => ({
        fromTable: t.tableName,
        fromCol: c.name,
        toTable: c.foreignKey!.refTable,
        toCol: c.foreignKey!.refColumn,
      }))
  )

  const compute = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth || 800
    const h = 680
    setSize({ w, h })
    setPositions(circleLayout(tables, w, h))
  }, [tables])

  useLayoutEffect(() => {
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [compute])

  const nodeHeight = (t: TableConfig) => rowHeight(t.columns.filter((c) => !c.excluded).length)

  const relatedTables = hovered
    ? new Set(fks.flatMap((fk) => {
        if (fk.fromTable === hovered) return [fk.toTable]
        if (fk.toTable === hovered) return [fk.fromTable]
        return []
      }))
    : new Set<string>()

  return (
    <div className="schema-view" ref={containerRef} style={{ height: size.h }}>
      <svg className="schema-svg" width={size.w} height={size.h} style={{ pointerEvents: 'none' }}>
        <defs>
          <marker id="arr-default" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--text-muted)" opacity="0.5" />
          </marker>
          <marker id="arr-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--accent)" />
          </marker>
        </defs>

        {fks.map((fk, i) => {
          const from = positions[fk.fromTable]
          const to   = positions[fk.toTable]
          if (!from || !to || fk.fromTable === fk.toTable) return null

          const fromH = nodeHeight(tables.find((t) => t.tableName === fk.fromTable)!)
          const toH   = nodeHeight(tables.find((t) => t.tableName === fk.toTable)!)

          const p1 = edgePoint(from, to, fromH)
          const p2 = edgePoint(to, from, toH)

          const mx = (p1.x + p2.x) / 2 + (p2.y - p1.y) * 0.25
          const my = (p1.y + p2.y) / 2 - (p2.x - p1.x) * 0.25

          const isActive = hovered === fk.fromTable || hovered === fk.toTable
          const isDim    = hovered !== null && !isActive

          return (
            <g key={i} style={{ transition: 'opacity .2s' }} opacity={isDim ? 0.08 : 1}>
              <path
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke={isActive ? 'var(--accent)' : 'var(--border-strong)'}
                strokeWidth={isActive ? 2 : 1.5}
                strokeDasharray={isActive ? undefined : '6 3'}
                markerEnd={isActive ? 'url(#arr-active)' : 'url(#arr-default)'}
                style={{ transition: 'stroke .2s, stroke-width .2s' }}
              />
              {/* label on the middle of the arc */}
              <text
                x={mx} y={my}
                textAnchor="middle"
                fontSize="10"
                fill={isActive ? 'var(--accent)' : 'var(--text-faint)'}
                fontFamily="'JetBrains Mono', monospace"
                style={{ transition: 'fill .2s' }}
              >
                {fk.fromCol} → {fk.toCol}
              </text>
            </g>
          )
        })}
      </svg>

      {tables.map((t) => {
        const pos  = positions[t.tableName]
        if (!pos) return null
        const cols    = t.columns.filter((c) => !c.excluded)
        const isHov   = hovered === t.tableName
        const isRel   = relatedTables.has(t.tableName)
        const isDim   = hovered !== null && !isHov && !isRel

        return (
          <div
            key={t.id}
            className={[
              'schema-node',
              isHov  ? 'schema-node-active'  : '',
              isRel  ? 'schema-node-related' : '',
              isDim  ? 'schema-node-dim'     : '',
            ].filter(Boolean).join(' ')}
            style={{ left: pos.x, top: pos.y }}
            onMouseEnter={() => setHovered(t.tableName)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="schema-node-title">{t.tableName}</div>
            <div className="schema-node-cols">
              {cols.map((c) => (
                <div
                  key={c.originalName}
                  className={[
                    'schema-col-row',
                    c.isPrimaryKey ? 'col-pk' : '',
                    c.foreignKey   ? 'col-fk' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="schema-col-badge">
                    {c.isPrimaryKey ? 'PK' : c.foreignKey ? 'FK' : ''}
                  </span>
                  <span className="schema-col-name">{c.name}</span>
                  <span className="schema-col-type">{c.type}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {fks.length === 0 && (
        <div className="schema-empty">Aucune relation détectée entre les tables</div>
      )}
    </div>
  )
}

export default SchemaView
