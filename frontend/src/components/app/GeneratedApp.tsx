import { useMemo, useState } from 'react'
import type { TableConfig } from '../../App'
import { analyzeColumns, suggestLayouts } from '../../lib/semantic'
import type { LayoutKind } from '../../lib/semantic'
import { ARCHETYPE_ORDER, ARCHETYPE_PRESETS, applyPresetSort, detectArchetype } from '../../lib/archetype'
import type { TableArchetype } from '../../lib/archetype'
import TableView from './TableView'
import GalleryView from './GalleryView'
import DashboardView from './DashboardView'
import CardListView from './CardListView'
import CustomView from './CustomView'
import DetailPanel from './DetailPanel'

const LAYOUT_LABELS: Record<LayoutKind, string> = {
  table: 'Table',
  gallery: 'Galerie',
  dashboard: 'Tableau de bord',
  cards: 'Cartes',
}

interface Props {
  tables: TableConfig[]
  onBack: () => void
}

function GeneratedApp({ tables, onBack }: Props) {
  // Onglet actif : index de table, ou 'custom' pour « Ma vue »
  const [activeTab, setActiveTab] = useState<number | 'custom'>(0)
  const activeIndex = typeof activeTab === 'number' ? activeTab : 0
  // Choix manuels de l'utilisateur, par table (null = suivre la suggestion)
  const [archetypeOverrides, setArchetypeOverrides] = useState<Record<string, TableArchetype>>({})
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, LayoutKind>>({})
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  const active = tables[activeIndex]
  const analyzed = useMemo(() => analyzeColumns(active.columns, active.rows), [active])

  // Archétype : détecté, sauf si l'utilisateur a choisi manuellement
  const detected = useMemo(() => detectArchetype(analyzed, active.tableName), [analyzed, active.tableName])
  const archetype = archetypeOverrides[active.id] ?? detected
  const preset = ARCHETYPE_PRESETS[archetype]

  // Layouts : suggérés par le contenu + apportés par le template (sans doublon)
  const layouts = useMemo(() => {
    const suggested = suggestLayouts(analyzed)
    return [...new Set([...suggested, ...preset.extraLayouts])]
  }, [analyzed, preset])

  const chosenLayout = layoutOverrides[active.id]
  const effectiveLayout = chosenLayout && layouts.includes(chosenLayout)
    ? chosenLayout
    : layouts.includes(preset.defaultLayout) ? preset.defaultLayout : layouts[0]

  // Tri par défaut du template (copie triée, les données d'origine restent intactes)
  const displayRows = useMemo(
    () => applyPresetSort(active.rows, analyzed, preset),
    [active.rows, analyzed, preset],
  )

  // Clé de persistance de « Ma vue », propre au fichier importé
  const storageKey = useMemo(
    () => `tablr:ma-vue:${tables.map((t) => t.tableName).join(',')}`,
    [tables],
  )

  const selectTable = (i: number) => {
    setActiveTab(i)
    setSelectedRow(null)
  }

  const selectArchetype = (a: TableArchetype) => {
    setArchetypeOverrides((prev) => ({ ...prev, [active.id]: a }))
    // Changer de template réinitialise le choix de layout pour cette table
    setLayoutOverrides((prev) => {
      const next = { ...prev }
      delete next[active.id]
      return next
    })
    setSelectedRow(null)
  }

  return (
    <div>
      {/* Onglets : tables + « Ma vue » */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        {tables.map((t, i) => (
          <button
            key={t.id}
            onClick={() => selectTable(i)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === i ? 'var(--accent)' : 'transparent'}`,
              color: activeTab === i ? 'var(--accent-text)' : 'var(--text-muted)',
              fontWeight: activeTab === i ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-1px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
            }}
          >
            {t.tableName}
          </button>
        ))}
        <button
          onClick={() => { setActiveTab('custom'); setSelectedRow(null) }}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'custom' ? 'var(--accent)' : 'transparent'}`,
            color: activeTab === 'custom' ? 'var(--accent-text)' : 'var(--text-muted)',
            fontWeight: activeTab === 'custom' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-1px',
            fontSize: '13px',
            marginLeft: 'auto',
          }}
        >
          ✦ Ma vue
        </button>
      </div>

      {/* « Ma vue » : dashboard personnalisé multi-tables */}
      {activeTab === 'custom' && (
        <CustomView tables={tables} storageKey={storageKey} />
      )}

      {activeTab !== 'custom' && (
      <>


      {/* En-tête : titre + template + bascule de layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            {active.tableName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
            {active.rows.length} enregistrement{active.rows.length > 1 ? 's' : ''}
            {detected !== 'generic' && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· détecté : {ARCHETYPE_PRESETS[detected].label}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sélecteur de template (suggestion appliquée, choix toujours libre) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Template
            <select
              value={archetype}
              onChange={(e) => selectArchetype(e.target.value as TableArchetype)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {ARCHETYPE_ORDER.map((a) => (
                <option key={a} value={a}>
                  {ARCHETYPE_PRESETS[a].label}{a === detected ? ' (suggéré)' : ''}
                </option>
              ))}
            </select>
          </label>

          {layouts.length > 1 && (
            <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: '6px', overflow: 'hidden' }}>
              {layouts.map((l) => (
                <button
                  key={l}
                  onClick={() => setLayoutOverrides((prev) => ({ ...prev, [active.id]: l }))}
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
      </div>

      {/* Vue */}
      {effectiveLayout === 'table' && (
        <TableView columns={analyzed} rows={displayRows} onRowClick={setSelectedRow} />
      )}
      {effectiveLayout === 'gallery' && (
        <GalleryView columns={analyzed} rows={displayRows} onRowClick={setSelectedRow} />
      )}
      {effectiveLayout === 'cards' && (
        <CardListView columns={analyzed} rows={displayRows} onRowClick={setSelectedRow} />
      )}
      {effectiveLayout === 'dashboard' && (
        <DashboardView columns={analyzed} rows={displayRows} />
      )}
      </>
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

      {/* Fiche détail (index dans displayRows, les lignes affichées) */}
      {selectedRow !== null && displayRows[selectedRow] && (
        <DetailPanel columns={analyzed} row={displayRows[selectedRow]} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  )
}

export default GeneratedApp
