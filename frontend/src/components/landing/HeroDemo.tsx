import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../lib/i18n'

type Phase = 'excel' | 'table' | 'gallery' | 'dashboard' | 'schema'
type Status = 'active' | 'inactive' | 'suspended'

interface DemoRow {
  name: string
  email: string
  city: string
  status: Status
}

const ROWS: DemoRow[] = [
  { name: 'Alice Tremblay', email: 'alice@mail.com', city: 'Montréal', status: 'active' },
  { name: 'Bob Gagnon', email: 'bob@mail.com', city: 'Québec', status: 'active' },
  { name: 'Chloé Lavoie', email: 'chloe@mail.com', city: 'Laval', status: 'inactive' },
  { name: 'Félix Martin', email: 'felix@mail.com', city: 'Gatineau', status: 'suspended' },
  { name: 'Grace Leblanc', email: 'grace@mail.com', city: 'Sherbrooke', status: 'active' },
]
const ACTIVE_COUNT = ROWS.filter((r) => r.status === 'active').length
const INACTIVE_COUNT = ROWS.filter((r) => r.status === 'inactive').length
const SUSPENDED_COUNT = ROWS.filter((r) => r.status === 'suspended').length
const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

// Table réelle mise en avant + les autres onglets du produit (décoratifs, non cliquables).
const OTHER_TABS = ['produits', 'commandes']

// Hauteurs d'un mini graphique décoratif (inscriptions par mois).
const CHART_BARS = [38, 55, 46, 72, 60, 90, 68]

// ─── Schéma relationnel : positions fixes (viewBox 484×300) + relations ────────
interface SchemaNode {
  id: string
  title: string
  x: number
  y: number
  w: number
  h: number
  fields: { name: string; pk?: boolean; fk?: boolean }[]
}
const SCHEMA_NODES: SchemaNode[] = [
  { id: 'clients', title: 'clients', x: 8, y: 8, w: 132, h: 92, fields: [
    { name: 'id', pk: true }, { name: 'nom' }, { name: 'email' },
  ] },
  { id: 'categories', title: 'categories', x: 352, y: 8, w: 124, h: 76, fields: [
    { name: 'code', pk: true }, { name: 'libelle' },
  ] },
  { id: 'commandes', title: 'commandes', x: 172, y: 118, w: 140, h: 100, fields: [
    { name: 'id', pk: true }, { name: 'client_id', fk: true }, { name: 'produit_id', fk: true }, { name: 'total' },
  ] },
  { id: 'produits', title: 'produits', x: 352, y: 148, w: 124, h: 100, fields: [
    { name: 'id', pk: true }, { name: 'categorie_code', fk: true }, { name: 'fournisseur_id', fk: true },
  ] },
  { id: 'fournisseurs', title: 'fournisseurs', x: 8, y: 220, w: 132, h: 76, fields: [
    { name: 'id', pk: true }, { name: 'pays' },
  ] },
]
const SCHEMA_RELATIONS: { from: string; to: string; path: string }[] = [
  { from: 'commandes', to: 'clients', path: 'M242,118 C242,90 200,80 138,55' },
  { from: 'commandes', to: 'produits', path: 'M312,155 C335,155 335,180 352,190' },
  { from: 'produits', to: 'categories', path: 'M414,148 C414,120 414,105 414,84' },
  { from: 'produits', to: 'fournisseurs', path: 'M352,225 C260,255 200,245 140,245' },
]
const SCHEMA_ORDER = ['commandes', 'clients', 'produits', 'categories', 'fournisseurs']

// Durées du cycle (ms) : temps de frappe géré par la longueur réelle du texte.
const HOLD_EXCEL = 1400
const TYPE_SPEED = 45
const HOLD_AFTER_TYPE = 350
const HOLD_TABLE = 3200
const HOLD_GALLERY = 3000
const HOLD_DASHBOARD = 3200
const SCHEMA_HOVER_INTERVAL = 1350
const HOLD_SCHEMA = SCHEMA_HOVER_INTERVAL * SCHEMA_ORDER.length
const RESET_PAUSE = 500

function HeroDemo() {
  const { t } = useI18n()
  const formula = t('landing.formula')

  const [phase, setPhase] = useState<Phase>('excel')
  const [typed, setTyped] = useState('')
  const [sweepKey, setSweepKey] = useState(0)
  const [schemaHover, setSchemaHover] = useState<string | null>(null)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Simule un survol qui parcourt les tables du schéma automatiquement (le hero n'a pas de vraie souris).
  useEffect(() => {
    if (phase !== 'schema' || reducedMotion.current) { setSchemaHover(null); return }
    let i = 0
    setSchemaHover(SCHEMA_ORDER[0])
    const id = setInterval(() => {
      i = (i + 1) % SCHEMA_ORDER.length
      setSchemaHover(SCHEMA_ORDER[i])
    }, SCHEMA_HOVER_INTERVAL)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (reducedMotion.current) {
      setTyped(formula)
      setPhase('table')
      return
    }

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const after = (ms: number, fn: () => void) => {
      const id = setTimeout(() => { if (!cancelled) fn() }, ms)
      timeouts.push(id)
    }
    const advance = (next: Phase, hold: number, then: () => void) => {
      setSweepKey((k) => k + 1)
      setPhase(next)
      after(hold, then)
    }

    const runCycle = () => {
      setPhase('excel')
      setTyped('')

      after(HOLD_EXCEL, () => {
        let i = 0
        const typeNext = () => {
          if (cancelled) return
          i += 1
          setTyped(formula.slice(0, i))
          if (i < formula.length) {
            after(TYPE_SPEED, typeNext)
          } else {
            after(HOLD_AFTER_TYPE, () => {
              advance('table', HOLD_TABLE, () => {
                advance('gallery', HOLD_GALLERY, () => {
                  advance('dashboard', HOLD_DASHBOARD, () => {
                    advance('schema', HOLD_SCHEMA, () => {
                      after(RESET_PAUSE, runCycle)
                    })
                  })
                })
              })
            })
          }
        }
        typeNext()
      })
    }

    runCycle()
    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [formula])

  const statusLabel = (s: Status) => t(`landing.demo.status.${s}`)
  const isSpreadsheet = phase === 'excel'

  const colName    = isSpreadsheet ? 'A' : t('landing.demo.col.name')
  const colEmail   = isSpreadsheet ? 'B' : t('landing.demo.col.email')
  const colCity    = isSpreadsheet ? 'C' : t('landing.demo.col.city')
  const colStatus  = isSpreadsheet ? 'D' : t('landing.demo.col.status')

  const relatedTo = (id: string) =>
    SCHEMA_RELATIONS.filter((r) => r.from === id || r.to === id).map((r) => (r.from === id ? r.to : r.from))
  const nodeState = (id: string): string => {
    if (!schemaHover) return ''
    if (id === schemaHover) return ' active'
    if (relatedTo(schemaHover).includes(id)) return ' connected'
    return ' dim'
  }
  const edgeState = (rel: { from: string; to: string }): string => {
    if (!schemaHover) return ''
    return rel.from === schemaHover || rel.to === schemaHover ? ' active' : ' dim'
  }

  return (
    <div className="hero-demo" aria-hidden="true">
      <div className={`hero-demo-card phase-${phase}${isSpreadsheet ? ' is-excel' : ' is-app'}`}>

        {isSpreadsheet && (
          <>
            <div className="hero-demo-chrome">
              <span className="hero-demo-dots"><i /><i /><i /></span>
              <span className="hero-demo-filename">{t('landing.demo.fileName')}</span>
              <span className="hero-demo-tag">{t('landing.demo.tagExcel')}</span>
            </div>
            <div className="hero-demo-formula">
              <span className="hero-demo-formula-fx">fx</span>
              <span className="hero-demo-formula-text">
                {typed}
                <span className="hero-demo-caret" />
              </span>
            </div>
          </>
        )}

        {!isSpreadsheet && (
          <>
            <div className="hero-demo-apptabs">
              <span className="hero-demo-apptab-list">
                <span className={`hero-demo-apptab${phase !== 'schema' ? ' active' : ''}`}>{t('landing.demo.tableName')}</span>
                {OTHER_TABS.map((tab) => <span key={tab} className="hero-demo-apptab">{tab}</span>)}
                <span className={`hero-demo-apptab${phase === 'schema' ? ' active' : ''}`}>{t('landing.demo.schemaName')}</span>
              </span>
              <span className="hero-demo-exports">
                <span className="hero-demo-export">↓ Excel</span>
                <span className="hero-demo-export">↓ SQL</span>
              </span>
            </div>

            <div className="hero-demo-tablehead">
              <div>
                <div className="hero-demo-tabletitle">
                  {phase === 'schema' ? t('landing.demo.schemaTitle') : t('landing.demo.tableName')}
                </div>
                <div className="hero-demo-tablesubtitle">
                  {phase === 'table' && t('landing.demo.detected')}
                  {phase === 'gallery' && t('landing.demo.tagGallery')}
                  {phase === 'dashboard' && t('landing.demo.tagDashboard')}
                  {phase === 'schema' && t('landing.demo.schemaSubtitle')}
                </div>
              </div>
              {phase === 'table' && (
                <div className="hero-demo-tablehead-right">
                  <span className="hero-demo-search">
                    <span className="hero-demo-search-icon">⌕</span>
                    {t('landing.demo.search')}
                  </span>
                  <span className="hero-demo-addbtn">+ {t('landing.demo.add')}</span>
                </div>
              )}
            </div>
          </>
        )}

        {(phase === 'excel' || phase === 'table') && (
          <>
            <div className="hero-demo-colheader">
              <span>{colName}</span>
              <span>{colEmail}</span>
              <span>{colCity}</span>
              <span>{colStatus}</span>
            </div>
            <div className="hero-demo-rows">
              {phase === 'table' && <div key={sweepKey} className="hero-demo-sweep" />}
              {ROWS.map((row, i) => (
                <div
                  key={row.name}
                  className={`hero-demo-row status-${row.status}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span className="hero-demo-name">{row.name}</span>
                  <span className="hero-demo-email">{row.email}</span>
                  <span className="hero-demo-city">{row.city}</span>
                  <span className={`hero-demo-status status-${row.status}`}>
                    <i className="hero-demo-status-dot" />
                    {statusLabel(row.status)}
                  </span>
                  {phase === 'table' && (
                    <span className="hero-demo-row-actions">
                      <span className="hero-demo-row-action">✎</span>
                      <span className="hero-demo-row-action danger">×</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'gallery' && (
          <div key={sweepKey} className="hero-demo-gallery">
            {ROWS.map((row, i) => (
              <div key={row.name} className="hero-demo-card-item" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className={`hero-demo-avatar status-${row.status}`}>{initials(row.name)}</span>
                <span className="hero-demo-card-name">{row.name}</span>
                <span className="hero-demo-card-email">{row.email}</span>
                <span className={`hero-demo-status status-${row.status}`}>
                  <i className="hero-demo-status-dot" />
                  {statusLabel(row.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {phase === 'dashboard' && (
          <div key={sweepKey} className="hero-demo-dashboard">
            <div className="hero-demo-stats">
              <div className="hero-demo-stat">
                <span className="hero-demo-stat-value">{ROWS.length}</span>
                <span className="hero-demo-stat-label">{t('landing.demo.statTotal')}</span>
              </div>
              <div className="hero-demo-stat stat-active">
                <span className="hero-demo-stat-value">{ACTIVE_COUNT}</span>
                <span className="hero-demo-stat-label">{statusLabel('active')}</span>
              </div>
              <div className="hero-demo-stat stat-suspended">
                <span className="hero-demo-stat-value">{SUSPENDED_COUNT}</span>
                <span className="hero-demo-stat-label">{statusLabel('suspended')}</span>
              </div>
              <div className="hero-demo-stat stat-inactive">
                <span className="hero-demo-stat-value">{INACTIVE_COUNT}</span>
                <span className="hero-demo-stat-label">{statusLabel('inactive')}</span>
              </div>
            </div>
            <div className="hero-demo-chart">
              {CHART_BARS.map((h, i) => (
                <div key={i} className="hero-demo-bar-wrap" style={{ transitionDelay: `${i * 60}ms` }}>
                  <div className="hero-demo-bar" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'schema' && (
          <div key={sweepKey} className="hero-demo-schema-canvas">
            <svg className="hero-demo-schema-svg" viewBox="0 0 484 300" aria-hidden="true">
              {SCHEMA_RELATIONS.map((rel) => (
                <path key={`${rel.from}-${rel.to}`} className={`hero-demo-schema-edge${edgeState(rel)}`} d={rel.path} />
              ))}
            </svg>
            {SCHEMA_NODES.map((node) => (
              <div
                key={node.id}
                className={`hero-demo-schema-node${nodeState(node.id)}`}
                style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
              >
                <div className="hero-demo-node-title">{node.title}</div>
                {node.fields.map((field) => (
                  <div key={field.name} className={`hero-demo-node-field${field.fk ? ' highlight' : ''}`}>
                    {field.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HeroDemo
