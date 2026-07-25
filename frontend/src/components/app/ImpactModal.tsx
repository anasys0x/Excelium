import { useI18n } from '../../lib/i18n'

export interface Reference {
  table: string
  column: string
  count: number
  preview: Record<string, unknown>[]
}

interface Props {
  references: Reference[]
  action: 'delete' | 'update-pk'
  onCancel: () => void
  onCascade: () => void
  onForce: () => void
}

function ImpactModal({ references, action, onCancel, onCascade, onForce }: Props) {
  const { t } = useI18n()
  const totalRows = references.reduce((s, r) => s + r.count, 0)

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <span className="modal-icon">⚠</span>
          <h2 className="modal-title">
            {action === 'delete' ? t('app.impactDeleteTitle') : t('app.impactPkTitle')}
          </h2>
          <button className="detail-close" onClick={onCancel}>✕</button>
        </div>

        {/* Description */}
        <p className="modal-desc">
          {action === 'delete' ? t('app.impactDeleteBody') : t('app.impactPkBody')}{' '}
          <strong>{totalRows} {t('word.row', { count: totalRows })}</strong>
          {' '}{t('app.impactInTables', { n: references.length, count: references.length })}.
          {' '}{action === 'delete' ? t('app.impactDeleteHint') : t('app.impactPkHint')}
        </p>

        {/* Impact list */}
        <div className="impact-list">
          {references.map((ref) => (
            <div key={ref.table} className="impact-item">
              <div className="impact-item-header">
                <span className="impact-item-table">{ref.table}</span>
                <span className="impact-item-col">via <code>{ref.column}</code></span>
                <span className="impact-item-count">{ref.count} {t('word.row', { count: ref.count })}</span>
              </div>
              {ref.preview.length > 0 && (
                <div className="impact-preview">
                  {ref.preview.map((row, i) => (
                    <div key={i} className="impact-preview-row">
                      {Object.entries(row).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="impact-preview-cell">
                          <span className="impact-preview-key">{k}:</span>
                          <span className="impact-preview-val">{String(v ?? '')}</span>
                        </span>
                      ))}
                      {Object.keys(row).length > 3 && <span className="impact-preview-more">…</span>}
                    </div>
                  ))}
                  {ref.count > 3 && (
                    <div className="impact-preview-extra">+ {ref.count - 3} {t('app.impactOther', { count: ref.count - 3 })}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <div style={{ flex: 1 }} />
          {action === 'delete' ? (
            <>
              <button className="modal-btn-force" onClick={onForce} title={t('app.forceTitle')}>
                {t('app.deleteOnly')}
              </button>
              <button className="modal-btn-cascade" onClick={onCascade}>
                {t('app.deleteCascade')} ({totalRows} {t('word.row', { count: totalRows })})
              </button>
            </>
          ) : (
            <>
              <button className="modal-btn-force" onClick={onForce}>
                {t('app.editAnyway')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImpactModal
