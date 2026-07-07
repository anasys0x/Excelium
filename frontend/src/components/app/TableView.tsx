import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
}

function TableView({ columns, rows, onRowClick }: Props) {
  return (
    <div style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.index} style={{
                  textAlign: isMetricRole(c.role) ? 'right' : 'left',
                  padding: '10px 14px',
                  background: 'var(--surface-alt)',
                  borderBottom: '2px solid var(--border)',
                  whiteSpace: 'nowrap',
                  color: 'var(--text)',
                  fontWeight: 600,
                }}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const base = ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)'
              return (
                <tr
                  key={ri}
                  onClick={() => onRowClick(ri)}
                  style={{ cursor: 'pointer', background: base, transition: 'background .12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = base }}
                >
                  {columns.map((c) => (
                    <td key={c.index} style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid var(--line)',
                      textAlign: isMetricRole(c.role) ? 'right' : 'left',
                      whiteSpace: 'nowrap',
                      color: 'var(--cell-text)',
                    }}>
                      {renderCell(c.role, row[c.index])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableView
