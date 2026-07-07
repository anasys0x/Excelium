interface StepDef { key: string; label: string }
interface Props   { steps: StepDef[]; currentKey: string }

function StepIndicator({ steps, currentKey }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey)
  return (
    <div className="step-indicator">
      {steps.map(({ key, label }, i) => {
        const done   = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={key} className={`step-item${i < steps.length - 1 ? ' flex' : ''}`}>
            <div className="step-body">
              <div className={`step-circle${done ? ' done' : active ? ' active' : ''}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`step-label${done ? ' done' : active ? ' active' : ''}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`step-connector${done ? ' done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default StepIndicator
