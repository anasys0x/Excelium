import { useEffect, useMemo, useState } from 'react'
import GridLayout, { useContainerWidth } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import type { TableConfig } from '../../App'
import { describeWidget, evaluate } from '../../lib/formulas'
import type { FormulaWidget } from '../../lib/formulas'
import WidgetEditor from './WidgetEditor'

const COLS = 12
const ROW_HEIGHT = 90
const DEFAULT_W = 3
const DEFAULT_H = 1

interface Persisted {
  widgets: FormulaWidget[]
  layout: LayoutItem[]
}

function loadPersisted(key: string): Persisted {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Persisted
  } catch {
    // stockage corrompu → on repart de zéro
  }
  return { widgets: [], layout: [] }
}

// Premier emplacement libre : sous le widget le plus bas
function nextPosition(layout: LayoutItem[]): { x: number; y: number } {
  if (layout.length === 0) return { x: 0, y: 0 }
  const maxY = Math.max(...layout.map((l) => l.y + l.h))
  return { x: ((layout.length * DEFAULT_W) % COLS), y: maxY }
}

interface Props {
  tables: TableConfig[]
  storageKey: string
}

// « Ma vue » : dashboard personnalisé — widgets de formules librement
// positionnables sur une grille aimantée (react-grid-layout).
function CustomView({ tables, storageKey }: Props) {
  const [{ widgets, layout }, setState] = useState<Persisted>(() => loadPersisted(storageKey))
  const [editing, setEditing] = useState<FormulaWidget | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  // RGL v2 : le hook mesure la largeur du conteneur (remplace l'ancien WidthProvider)
  const { width, containerRef, mounted } = useContainerWidth()

  // Persistance : chaque changement est sauvé (clé propre au fichier importé)
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ widgets, layout }))
  }, [widgets, layout, storageKey])

  const results = useMemo(
    () => new Map(widgets.map((w) => [w.id, evaluate(w, tables)])),
    [widgets, tables],
  )

  const saveWidget = (widget: FormulaWidget) => {
    setState((prev) => {
      const exists = prev.widgets.some((w) => w.id === widget.id)
      return {
        widgets: exists
          ? prev.widgets.map((w) => (w.id === widget.id ? widget : w))
          : [...prev.widgets, widget],
        layout: exists
          ? prev.layout
          : [...prev.layout, { i: widget.id, ...nextPosition(prev.layout), w: DEFAULT_W, h: DEFAULT_H }],
      }
    })
    setShowEditor(false)
    setEditing(null)
  }

  const removeWidget = (id: string) => {
    setState((prev) => ({
      widgets: prev.widgets.filter((w) => w.id !== id),
      layout: prev.layout.filter((l) => l.i !== id),
    }))
  }

  const onLayoutChange = (next: Layout) => {
    setState((prev) => ({ ...prev, layout: next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) }))
  }

  return (
    <div>
      {/* Barre d'action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          onClick={() => { setEditing(null); setShowEditor(true) }}
          style={{
            padding: '8px 16px', background: 'var(--accent)', color: '#FFFFFF',
            border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Widget
        </button>
      </div>

      {/* État vide */}
      {widgets.length === 0 && (
        <div style={{
          border: '1px dashed var(--border-strong)', borderRadius: '12px',
          padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-2)' }}>
            Compose ta propre vue
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
            Ajoute des widgets de formules (somme, moyenne, comptage…) et
            place-les librement sur la grille.
          </p>
        </div>
      )}

      {/* Grille aimantée */}
      {widgets.length > 0 && (
        <div ref={containerRef}>
        {mounted && (
        <GridLayout
          className="layout"
          layout={layout}
          width={width}
          gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [12, 12] }}
          dragConfig={{ cancel: '.widget-action' }}
          onLayoutChange={onLayoutChange}
        >
          {widgets.map((w) => {
            const result = results.get(w.id)
            return (
              <div
                key={w.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px 16px', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', cursor: 'grab',
                }}
              >
                {/* En-tête : titre + actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                    {w.label || describeWidget(w, tables).split(' · ')[0]}
                  </span>
                  <span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      className="widget-action"
                      onClick={() => { setEditing(w); setShowEditor(true) }}
                      title="Modifier"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '2px' }}
                    >
                      ✎
                    </button>
                    <button
                      className="widget-action"
                      onClick={() => removeWidget(w.id)}
                      title="Supprimer"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '2px' }}
                    >
                      ✕
                    </button>
                  </span>
                </div>

                {/* Valeur */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  {result?.ok ? (
                    <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {result.formatted}
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--amber-text)' }} title={result?.ok === false ? result.reason : ''}>
                      ⚠ {result?.ok === false ? result.reason : '—'}
                    </span>
                  )}
                </div>

                {/* Sous-titre */}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {describeWidget(w, tables)}
                </span>
              </div>
            )
          })}
        </GridLayout>
        )}
        </div>
      )}

      {/* Éditeur */}
      {showEditor && (
        <WidgetEditor
          tables={tables}
          initial={editing ?? undefined}
          onSave={saveWidget}
          onCancel={() => { setShowEditor(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

export default CustomView
