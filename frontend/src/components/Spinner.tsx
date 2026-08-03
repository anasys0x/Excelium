interface Props { label?: string }

function Spinner({ label }: Props) {
  return (
    <div className="spinner-row">
      <span className="spinner" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  )
}

export default Spinner
