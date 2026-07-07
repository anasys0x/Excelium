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

function Empty() {
  return <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>—</span>
}

function Badge({ children }: { children: ReactNode }) {
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

function Stars({ value }: { value: number }) {
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
  if (isEmpty(value) && role !== 'boolean') return <Empty />

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
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{nf.format(Number(value))} %</span>

    case 'date':
      return <span>{formatDate(value)}</span>

    case 'boolean': {
      const truthy = value === true || value === 1 || /^(true|1|oui|yes|vrai)$/i.test(String(value))
      return truthy
        ? <span style={{ color: 'var(--badge-green-text)', fontWeight: 600 }}>✓</span>
        : <span style={{ color: 'var(--text-faint)' }}>✗</span>
    }

    case 'category':
      return <Badge>{String(value)}</Badge>

    case 'rating':
      return <Stars value={Number(value)} />

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
