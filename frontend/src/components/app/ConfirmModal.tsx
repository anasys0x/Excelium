interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-modal-msg">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>Annuler</button>
          <button className="confirm-btn-ok" onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
