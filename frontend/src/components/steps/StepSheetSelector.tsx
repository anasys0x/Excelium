import type { SheetData } from '../../App'
import TablePreview from '../table/TablePreview'
import { useI18n } from '../../lib/i18n'

interface Props {
  sheets: SheetData[]
  selected: string[]
  onToggle: (name: string) => void
  onToggleAll: () => void
  onBack: () => void
  onConfirm: () => void
}

function StepSheetSelector({ sheets, selected, onToggle, onToggleAll, onBack, onConfirm }: Props) {
  const { t } = useI18n()
  const count = selected.length
  const allSelected = count === sheets.length && sheets.length > 0

  return (
    <div className="sheet-selector">
      <h1>{t('sheets.title')}</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
        {t('sheets.desc', { n: sheets.length })}
      </p>

      <div className="sheet-list-head">
        <span className="sheet-list-count">{t('sheets.selectedCount', { n: count, total: sheets.length, count })}</span>
        <button type="button" className="sheet-select-all" onClick={onToggleAll}>
          {t(allSelected ? 'sheets.deselectAll' : 'sheets.selectAll')}
        </button>
      </div>

      <div className="sheet-list">
        {sheets.map((sheet) => {
          const isSelected = selected.includes(sheet.name)
          const tableCount = sheet.tables.length
          const rowCount   = sheet.tables.reduce((sum, tb) => sum + tb.rows.length, 0)
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
                    {tableCount} {t('word.table', { count: tableCount })} · {rowCount} {t('word.row', { count: rowCount })}
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
                    <p className="sheet-preview-note">{t('sheets.previewNote')}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onBack}>← {t('sheets.changeFile')}</button>
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={count === 0}
        >
          {t('sheets.configureN', { n: count, count })} →
        </button>
      </div>
    </div>
  )
}

export default StepSheetSelector
