import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
  onEdit?: (rowIndex: number) => void
  onDelete?: (rowIndex: number) => void
}

function TableView({ columns, rows, onRowClick, onEdit, onDelete }: Props) {
  const hasCrud = onEdit || onDelete

  return (
    <div className="table-view">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.index} className={`data-th${isMetricRole(c.role) ? ' right' : ''}`}>
                  {c.name}
                </th>
              ))}
              {hasCrud && <th className="data-th-actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const base = ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)'
              return (
                <tr
                  key={ri}
                  style={{ background: base, transition: 'background .12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = base }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.index}
                      onClick={() => onRowClick(ri)}
                      className={`data-td${isMetricRole(c.role) ? ' right' : ''}`}
                    >
                      {renderCell(c.role, row[c.index])}
                    </td>
                  ))}
                  {hasCrud && (
                    <td className="data-td-actions">
                      <div className="crud-actions">
                        {onEdit   && <button className="crud-btn-edit"   onClick={(e) => { e.stopPropagation(); onEdit(ri) }}   title="Modifier">✎</button>}
                        {onDelete && <button className="crud-btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(ri) }} title="Supprimer">✕</button>}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (hasCrud ? 1 : 0)} className="table-empty">
                  Aucune donnée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableView
