import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][]; onRowClick: (rowIndex: number) => void }

function GalleryView({ columns, rows, onRowClick }: Props) {
  const imageCol = columns.find((c) => c.role === 'image')
  const titleCol = columns.find((c) => c.role === 'title') ?? columns.find((c) => c.role === 'text')
  const infoCols = columns.filter((c) => c !== imageCol && c !== titleCol).slice(0, 3)

  return (
    <div className="gallery-grid">
      {rows.map((row, ri) => (
        <div key={ri} onClick={() => onRowClick(ri)} className="gallery-card">
          {imageCol && (
            <div className="gallery-image">
              <img src={String(row[imageCol.index] ?? '')} alt="" />
            </div>
          )}
          <div className="gallery-body">
            {titleCol && <div className="gallery-title">{String(row[titleCol.index] ?? '')}</div>}
            {infoCols.map((c) => (
              <div key={c.index} className="gallery-info">
                <span className="gallery-info-label">{c.name}</span>
                <span className="gallery-info-value">{renderCell(c.role, row[c.index])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default GalleryView
