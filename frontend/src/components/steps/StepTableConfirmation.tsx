import type { TableConfig } from '../../App'

const ACCENT = 'var(--accent)'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  FLOAT:  { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' },
  STRING: { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
  DATE:   { bg: 'var(--badge-amber-bg)', color: 'var(--amber-text)' },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

interface Props {
  tables: TableConfig[]
  onBack: () => void
  onConfirm: () => void
  isCreating?: boolean
  error?: string | null
}

function StepTableConfirmation({ tables, onBack, onConfirm, isCreating = false, error = null }: Props) {
  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0)

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
        Récapitulatif
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
        {tables.length} table{tables.length > 1 ? 's' : ''} seront créées · {totalRows} ligne{totalRows > 1 ? 's' : ''} au total.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {tables.map((table) => {
          const pk = table.columns.find((col) => col.isPrimaryKey)

          return (
            <div key={table.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {/* En-tête de la table */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--surface-alt)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                    {table.tableName}
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    feuille : {table.sheetName} · {table.rows.length} lignes
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: pk ? 'var(--accent-text)' : 'var(--amber-text)' }}>
                  {pk ? <>clé : <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pk.name}</strong></> : 'aucune clé'}
                </span>
              </div>

              {/* Colonnes */}
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {table.columns.map((col) => {
                  const badge = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  return (
                    <span
                      key={col.originalName}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '4px 6px 4px 10px',
                        borderRadius: '6px',
                        background: 'var(--surface)',
                        border: col.isPrimaryKey ? `1px solid ${ACCENT}` : '1px solid var(--border)',
                      }}
                    >
                      {col.isPrimaryKey && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          color: 'var(--accent-text)',
                          background: 'var(--accent-soft)',
                          border: '1px solid var(--accent-border)',
                          borderRadius: '3px',
                          padding: '0 4px',
                        }}>
                          CLÉ
                        </span>
                      )}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>
                        {col.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: badge.bg,
                        color: badge.color,
                      }}>
                        {col.type}
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          borderRadius: '6px',
          background: 'var(--warn-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger-text)',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onBack}
          disabled={isCreating}
          style={{
            padding: '10px 18px',
            background: 'var(--surface)',
            color: 'var(--text-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.6 : 1,
          }}
        >
          ← Retour
        </button>
        <button
          onClick={onConfirm}
          disabled={isCreating}
          style={{
            padding: '10px 24px',
            background: ACCENT,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.7 : 1,
          }}
        >
          {isCreating ? 'Création…' : 'Créer la base de données'}
        </button>
      </div>
    </div>
  )
}

export default StepTableConfirmation
