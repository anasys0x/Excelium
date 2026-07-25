import type { AnalyzedColumn } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'
import { useI18n } from '../../lib/i18n'

interface Props {
  columns: AnalyzedColumn[]
  row: unknown[]
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function DetailPanel({ columns, row, onClose, onEdit, onDelete }: Props) {
  const { t } = useI18n()
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2 className="detail-title">{t('app.detailTitle')}</h2>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-fields">
          {columns.map((c) => (
            <div key={c.index}>
              <div className="detail-field-label">{c.name}</div>
              <div className="detail-field-value">{renderCell(c.role, row[c.index])}</div>
            </div>
          ))}
        </div>

        {(onEdit || onDelete) && (
          <div className="detail-actions">
            {onEdit   && <button className="detail-btn-edit"   onClick={onEdit}>✎ {t('common.edit')}</button>}
            {onDelete && <button className="detail-btn-delete" onClick={onDelete}>{t('common.delete')}</button>}
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailPanel
