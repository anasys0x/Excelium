import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
}

// Vue en cartes sans image : titre mis en avant, badges (statut/catégorie)
// dans l'en-tête, puis champs d'information. Pensée pour Contacts et Inventaire.
function CardListView({ columns, rows, onRowClick }: Props) {
  const titleCol = columns.find((c) => c.role === 'title') ?? columns.find((c) => c.role === 'text')
  const badgeCols = columns.filter((c) => c.role === 'status' || c.role === 'category').slice(0, 2)
  const infoCols = columns
    .filter((c) => c !== titleCol && !badgeCols.includes(c) && c.role !== 'image')
    .slice(0, 5)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          onClick={() => onRowClick(ri)}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '10px',
            background: 'var(--surface)',
            padding: '14px 16px',
            cursor: 'pointer',
          }}
        >
          {/* En-tête : titre + badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
              {titleCol ? String(row[titleCol.index] ?? '') : `Ligne ${ri + 1}`}
            </span>
            <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {badgeCols.map((c) => (
                <span key={c.index}>{renderCell(c.role, row[c.index])}</span>
              ))}
            </span>
          </div>

          {/* Champs d'information */}
          {infoCols.map((c) => (
            <div key={c.index} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ color: 'var(--text-2)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {renderCell(c.role, row[c.index])}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default CardListView
