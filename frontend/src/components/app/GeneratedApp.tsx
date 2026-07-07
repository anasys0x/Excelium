import { useMemo, useState } from 'react'
import type { TableConfig } from '../../App'
import { analyzeColumns, suggestLayouts } from '../../lib/semantic'
import type { LayoutKind } from '../../lib/semantic'
import TableView from './TableView'
import GalleryView from './GalleryView'
import DashboardView from './DashboardView'
import DetailPanel from './DetailPanel'

const LAYOUT_LABELS: Record<LayoutKind, string> = {
  table: 'Table',
  gallery: 'Galerie',
  dashboard: 'Tableau de bord',
}

interface Props {
  tables: TableConfig[]
  onBack: () => void
}

function GeneratedApp({ tables, onBack }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [layout, setLayout] = useState<LayoutKind>('table')
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  const active = tables[activeIndex]
  const analyzed = useMemo(() => analyzeColumns(active.columns, active.rows), [active])
  const layouts = useMemo(() => suggestLayouts(analyzed), [analyzed])

  // Si le layout courant n'existe pas pour cette table, on retombe sur le premier
  const effectiveLayout = layouts.includes(layout) ? layout : layouts[0]

  const selectTable = (i: number) => {
    setActiveIndex(i)
    setSelectedRow(null)
  }

  return (
    <div>
      {/* Onglets de tables */}
      {tables.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          {tables.map((t, i) => (
            <button
              key={t.id}
              onClick={() => selectTable(i)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${i === activeIndex ? 'var(--accent)' : 'transparent'}`,
                color: i === activeIndex ? 'var(--accent-text)' : 'var(--text-muted)',
                fontWeight: i === activeIndex ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-1px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
              }}
            >
              {t.tableName}
            </button>
          ))}
        </div>
      )}

      {/* En-tête + bascule de layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            {active.tableName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
            {active.rows.length} enregistrement{active.rows.length > 1 ? 's' : ''}
          </p>
        </div>

        {layouts.length > 1 && (
          <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: '6px', overflow: 'hidden' }}>
            {layouts.map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: effectiveLayout === l ? 'var(--accent)' : 'var(--surface)',
                  color: effectiveLayout === l ? '#FFFFFF' : 'var(--text-2)',
                }}
              >
                {LAYOUT_LABELS[l]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vue */}
      {effectiveLayout === 'table' && (
        <TableView columns={analyzed} rows={active.rows} onRowClick={setSelectedRow} />
      )}
      {effectiveLayout === 'gallery' && (
        <GalleryView columns={analyzed} rows={active.rows} onRowClick={setSelectedRow} />
      )}
      {effectiveLayout === 'dashboard' && (
        <DashboardView columns={analyzed} rows={active.rows} />
      )}

      <button
        onClick={onBack}
        style={{
          marginTop: '24px',
          padding: '9px 18px',
          background: 'var(--surface)',
          color: 'var(--text-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: '6px',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        ← Retour
      </button>

      {/* Fiche détail */}
      {selectedRow !== null && active.rows[selectedRow] && (
        <DetailPanel columns={analyzed} row={active.rows[selectedRow]} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  )
}

export default GeneratedApp
