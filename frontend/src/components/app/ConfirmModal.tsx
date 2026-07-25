import { useI18n } from '../../lib/i18n'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  const { t } = useI18n()
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-modal-msg">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="confirm-btn-ok" onClick={onConfirm}>{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
