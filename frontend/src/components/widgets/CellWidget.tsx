import type { ReactNode } from 'react'
import type { SemanticRole } from '../../lib/semantic'

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

const nf = new Intl.NumberFormat('fr-FR')
const cf = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

function formatDate(value: unknown): string {
  const s = String(value)
  const d = new Date(s)
  if (!isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)) return d.toLocaleDateString('fr-FR')
  return s
}

function renderEmpty() {
  return <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
}

function renderBadge(children: ReactNode) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '12px',
      background: 'var(--accent-soft)',
      color: 'var(--accent-text)',
      border: '1px solid var(--accent-border)',
    }}>
      {children}
    </span>
  )
}

// Statut sémantique : la couleur reflète le sens de la valeur
const STATUS_POSITIVE_RE = /(actif|active|pay[ée]|valid|ok|termin|livr[ée]|confirm|dispo|en stock|approuv|accept|r[ée]ussi|complet|ouvert|oui|done|success)/i
const STATUS_NEGATIVE_RE = /(inactif|annul|refus|rupture|bloqu|erreur|rejet|expir[ée]|[ée]chou|ferm[ée]|suspend|non|failed|cancel)/i

function renderStatusBadge(value: string) {
  const positive = STATUS_POSITIVE_RE.test(value)
  const negative = !positive && STATUS_NEGATIVE_RE.test(value)

  const palette = positive
    ? { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }
    : negative
      ? { bg: 'var(--warn-bg)', color: 'var(--danger-text)' }
      : { bg: 'var(--badge-amber-bg)', color: 'var(--amber-text)' }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 500,
      background: palette.bg,
      color: palette.color,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
      {value}
    </span>
  )
}

// Barre de progression pour les pourcentages (0–100)
function renderProgressBar(value: number) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
      <span style={{
        flex: 1,
        height: '6px',
        minWidth: '60px',
        borderRadius: '999px',
        background: 'var(--line)',
        overflow: 'hidden',
        display: 'inline-block',
      }}>
        <span style={{
          display: 'block',
          height: '100%',
          width: `${pct}%`,
          borderRadius: '999px',
          background: 'var(--accent)',
        }} />
      </span>
      <span style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>
        {nf.format(value)} %
      </span>
    </span>
  )
}

function renderStars(value: number) {
  const n = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span style={{ letterSpacing: '1px', color: '#f5b301' }}>
      {'★'.repeat(n)}
      <span style={{ color: 'var(--text-faint)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

// Rend la valeur d'une cellule selon son rôle sémantique
export function renderCell(role: SemanticRole, value: unknown): ReactNode {
  if (isEmpty(value) && role !== 'boolean') return renderEmpty()

  switch (role) {
    case 'id':
      return <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>{String(value)}</span>

    case 'title':
      return <span style={{ fontWeight: 600, color: 'var(--text)' }}>{String(value)}</span>

    case 'number':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{nf.format(Number(value))}</span>

    case 'currency':
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{cf.format(Number(value))}</span>

    case 'percent':
      return renderProgressBar(Number(value))

    case 'date':
      return <span>{formatDate(value)}</span>

    case 'boolean': {
      const truthy = value === true || value === 1 || /^(true|1|oui|yes|vrai)$/i.test(String(value))
      return truthy
        ? <span style={{ color: 'var(--badge-green-text)', fontWeight: 600 }}>✓</span>
        : <span style={{ color: 'var(--text-faint)' }}>✗</span>
    }

    case 'category':
      return renderBadge(String(value))

    case 'status':
      return renderStatusBadge(String(value))

    case 'rating':
      return renderStars(Number(value))

    case 'image':
      return (
        <img
          src={String(value)}
          alt=""
          style={{ height: '36px', width: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
        />
      )

    default:
      return <span>{String(value)}</span>
  }
}
