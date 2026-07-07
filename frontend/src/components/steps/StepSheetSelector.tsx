import type { SheetData } from '../../App'

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
    <div className="sheet-selector">
      <h1>Choisissez les feuilles à importer</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
        {sheets.length} feuilles ont été détectées. Sélectionnez celles que vous souhaitez transformer en tables.
      </p>

      <div className="sheet-list">
        {sheets.map((sheet) => {
          const isSelected = selected.includes(sheet.name)
          const tableCount = sheet.tables.length
          const rowCount   = sheet.tables.reduce((sum, t) => sum + t.rows.length, 0)
          return (
            <label key={sheet.name} className={`sheet-item${isSelected ? ' selected' : ''}`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(sheet.name)}
                className="sheet-item-checkbox"
              />
              <div className="sheet-item-body">
                <div className="sheet-item-name">{sheet.name}</div>
                <p className="sheet-item-meta">
                  {tableCount} tableau{tableCount > 1 ? 'x' : ''} · {rowCount} ligne{rowCount > 1 ? 's' : ''}
                </p>
              </div>
            </label>
          )
        })}
      </div>

      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onBack}>← Changer de fichier</button>
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={count === 0}
        >
          Configurer {count} feuille{count > 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  )
}

export default StepSheetSelector
