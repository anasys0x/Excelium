import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'

interface Props {
  columns: AnalyzedColumn[]
  row: unknown[]
  onClose: () => void
}

function DetailPanel({ columns, row, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          maxWidth: '90vw',
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Détail</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {columns.map((c) => (
            <div key={c.index}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: '3px' }}>
                {c.name}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                {renderCell(c.role, row[c.index])}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DetailPanel
