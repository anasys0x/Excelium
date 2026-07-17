import { useEffect, useState } from 'react'
import type { Reference } from './ImpactModal'
import type { TableConfig } from '../../App'

interface Props {
  row: Record<string, unknown>
  table: TableConfig
  allTables: TableConfig[]
  onClose: () => void
}

interface ParentRow {
  fkColName: string
  fkColOriginal: string
  refTable: string
  refColumn: string
  fkValue: unknown
  parentRow: Record<string, unknown> | null
  columns: string[]
}

const API = 'http://localhost:8000'

function val(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

function MiniTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  return (
    <table className="dep-mini-table">
      <thead>
        <tr>
          {columns.map((k) => <th key={k} className="dep-mini-th">{k}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="dep-mini-tr">
            {columns.map((k) => <td key={k} className="dep-mini-td">{val(r[k])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RowDependencyGraph({ row, table, onClose }: Props) {
  const [refs, setRefs]           = useState<Reference[]>([])
  const [parents, setParents]     = useState<ParentRow[]>([])
  const [loading, setLoading]     = useState(true)

  const pkCol   = table.columns.find((c) => c.isPrimaryKey)
  const pkValue = pkCol ? row[pkCol.originalName] ?? row[pkCol.name] : null

  // FK columns this row points TO (parents)
  const fkCols = table.columns.filter((c) => !c.excluded && c.foreignKey)

  useEffect(() => {
    const loads: Promise<void>[] = []

    // Fetch incoming references (children)
    if (pkCol && pkValue != null) {
      loads.push(
        fetch(`${API}/tables/${table.tableName}/rows/${pkValue}/references`)
          .then((r) => r.json())
          .then((d) => setRefs(d.references ?? []))
          .catch(() => {})
      )
    }

    // Fetch each parent row
    if (fkCols.length > 0) {
      const parentLoads = fkCols.map(async (c): Promise<ParentRow> => {
        const fkValue = row[c.originalName] ?? row[c.name]
        const refTable = c.foreignKey!.refTable
        const refColumn = c.foreignKey!.refColumn
        if (fkValue == null) {
          return { fkColName: c.name, fkColOriginal: c.originalName, refTable, refColumn, fkValue, parentRow: null, columns: [] }
        }
        try {
          const res = await fetch(`${API}/tables/${refTable}/rows/${fkValue}`)
          if (!res.ok) throw new Error()
          const d = await res.json()
          const cols = (d.columns ?? []).map((col: { name: string }) => col.name)
          return { fkColName: c.name, fkColOriginal: c.originalName, refTable, refColumn, fkValue, parentRow: d.row ?? null, columns: cols }
        } catch {
          return { fkColName: c.name, fkColOriginal: c.originalName, refTable, refColumn, fkValue, parentRow: null, columns: [] }
        }
      })
      loads.push(
        Promise.all(parentLoads).then((results) => setParents(results))
      )
    }

    Promise.all(loads).finally(() => setLoading(false))
  }, [table.tableName, pkValue])

  const hasParents  = fkCols.length > 0
  const hasChildren = refs.length > 0

  return (
    <div className="dep-panel">
      <div className="dep-panel-header">
        <span className="dep-panel-title">
          Dépendances de <strong>{val(pkValue)}</strong>
          <span className="dep-panel-sub"> · {table.tableName}</span>
        </span>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      {loading ? (
        <div className="dep-loading">Chargement…</div>
      ) : (
        <div className="dep-body">

          {/* ── Parents : tables que cette ligne référence ── */}
          {hasParents && (
            <div className="dep-section">
              <div className="dep-section-label dep-label-parent">Références sortantes</div>
              <div className="dep-children">
                {parents.map((p) => (
                  <div key={p.fkColOriginal} className="dep-child-block">
                    <div className="dep-child-title">
                      <span className="dep-child-table">{p.refTable}</span>
                      <span className="dep-child-count">1 ligne</span>
                      <span className="dep-child-col">via {p.fkColName} → {p.refColumn}</span>
                    </div>
                    {p.parentRow && p.columns.length > 0 ? (
                      <div className="dep-child-table-wrap">
                        <MiniTable columns={p.columns} rows={[p.parentRow]} />
                      </div>
                    ) : (
                      <div className="dep-loading" style={{ fontSize: '12px', padding: '8px 0' }}>
                        Valeur : {val(p.fkValue)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Children : lignes qui référencent cette ligne ── */}
          {hasChildren && (
            <div className="dep-section">
              <div className="dep-section-label dep-label-child">Références entrantes</div>
              <div className="dep-children">
                {refs.map((ref) => {
                  const previewKeys = ref.preview.length > 0 ? Object.keys(ref.preview[0]) : []
                  return (
                    <div key={ref.table} className="dep-child-block">
                      <div className="dep-child-title">
                        <span className="dep-child-table">{ref.table}</span>
                        <span className="dep-child-count">{ref.count} ligne{ref.count > 1 ? 's' : ''}</span>
                        <span className="dep-child-col">via {ref.column}</span>
                      </div>
                      {ref.preview.length > 0 && (
                        <div className="dep-child-table-wrap">
                          <MiniTable columns={previewKeys} rows={ref.preview} />
                          {ref.count > ref.preview.length && (
                            <div className="dep-more">
                              + {ref.count - ref.preview.length} ligne{ref.count - ref.preview.length > 1 ? 's' : ''} supplémentaire{ref.count - ref.preview.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!hasParents && !hasChildren && (
            <div className="dep-loading">Aucune dépendance pour cette ligne.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default RowDependencyGraph
