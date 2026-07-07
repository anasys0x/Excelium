import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
}

function GalleryView({ columns, rows, onRowClick }: Props) {
  const imageCol = columns.find((c) => c.role === 'image')
  const titleCol = columns.find((c) => c.role === 'title') ?? columns.find((c) => c.role === 'text')
  const infoCols = columns.filter((c) => c !== imageCol && c !== titleCol).slice(0, 3)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          onClick={() => onRowClick(ri)}
          style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', overflow: 'hidden', cursor: 'pointer' }}
        >
          {imageCol && (
            <div style={{ height: '140px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
              <img src={String(row[imageCol.index] ?? '')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ padding: '12px 14px' }}>
            {titleCol && (
              <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text)' }}>
                {String(row[titleCol.index] ?? '')}
              </div>
            )}
            {infoCols.map((c) => (
              <div key={c.index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '3px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                <span style={{ color: 'var(--text-2)' }}>{renderCell(c.role, row[c.index])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default GalleryView
