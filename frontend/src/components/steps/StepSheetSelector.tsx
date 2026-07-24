import type { SheetData } from '../../App'
import TablePreview from '../table/TablePreview'

interface Props {
  sheets: SheetData[]
  selected: string[]
  onToggle: (name: string) => void
  onToggleAll: () => void
  onBack: () => void
  onConfirm: () => void
}

function StepSheetSelector({ sheets, selected, onToggle, onToggleAll, onBack, onConfirm }: Props) {
  const count = selected.length
  const allSelected = count === sheets.length && sheets.length > 0

  return (
    <div className="sheet-selector">
      <h1>Choisissez les feuilles à importer</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
        {sheets.length} feuilles ont été détectées. Cochez celles à transformer en tables : leur aperçu s'affiche en dessous.
      </p>

      <div className="sheet-list-head">
        <span className="sheet-list-count">{count} / {sheets.length} sélectionnée{count > 1 ? 's' : ''}</span>
        <button type="button" className="sheet-select-all" onClick={onToggleAll}>
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>

      <div className="sheet-list">
        {sheets.map((sheet) => {
          const isSelected = selected.includes(sheet.name)
          const tableCount = sheet.tables.length
          const rowCount   = sheet.tables.reduce((sum, t) => sum + t.rows.length, 0)
          const table      = sheet.tables[0]
          return (
            <div key={sheet.name} className={`sheet-item${isSelected ? ' selected' : ''}`}>
              <label className="sheet-item-head">
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

              {isSelected && table && (
                <div className="sheet-item-preview">
                  <TablePreview
                    columns={table.columns}
                    rows={table.rows.slice(0, 3)}
                    showMeta={false}
                  />
                  {table.rows.length > 3 && (
                    <p className="sheet-preview-note">Aperçu des 3 premières lignes.</p>
                  )}
                </div>
              )}
            </div>
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
