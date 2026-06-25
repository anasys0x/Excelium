import type { SheetData } from '../../App'

const ACCENT = 'var(--accent)'

interface Props {
  sheets: SheetData[]
  selected: string[]
  onToggle: (name: string) => void
  onBack: () => void
  onConfirm: () => void
}

function StepSheetSelector({ sheets, selected, onToggle, onBack, onConfirm }: Props) {
  const count = selected.length

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
        Choisissez les feuilles à importer
      </h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
        {sheets.length} feuilles ont été détectées. Sélectionnez celles que vous souhaitez transformer en tables.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {sheets.map((sheet) => {
          const isSelected = selected.includes(sheet.name)
          const tableCount = sheet.tables.length
          const rowCount   = sheet.tables.reduce((sum, t) => sum + t.rows.length, 0)

          return (
            <label
              key={sheet.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                borderRadius: '8px',
                border: `1.5px solid ${isSelected ? ACCENT : 'var(--border)'}`,
                background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(sheet.name)}
                style={{ width: '17px', height: '17px', accentColor: ACCENT, cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                  {sheet.name}
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {tableCount} tableau{tableCount > 1 ? 'x' : ''} · {rowCount} ligne{rowCount > 1 ? 's' : ''}
                </p>
              </div>
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '9px 18px',
            background: 'var(--surface)',
            color: 'var(--text-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ← Changer de fichier
        </button>
        <button
          onClick={onConfirm}
          disabled={count === 0}
          style={{
            padding: '9px 20px',
            background: count > 0 ? ACCENT : 'var(--border)',
            color: count > 0 ? '#FFFFFF' : 'var(--text-faint)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: count > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Configurer {count} feuille{count > 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  )
}

export default StepSheetSelector
