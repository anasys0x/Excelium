import { useEffect } from 'react'
import { useI18n } from '../../lib/i18n'

interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ message, confirmLabel, onConfirm, onCancel }: Props) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-modal-msg">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={onCancel} autoFocus>{t('common.cancel')}</button>
          <button className="confirm-btn-ok" onClick={onConfirm}>{confirmLabel ?? t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
