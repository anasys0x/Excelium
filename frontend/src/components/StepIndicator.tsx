interface StepDef {
  key: string
  label: string
}

interface Props {
  steps: StepDef[]
  currentKey: string
}

function StepIndicator({ steps, currentKey }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '36px' }}>
      {steps.map(({ key, label }, i) => {
        const done   = i < currentIndex
        const active = i === currentIndex

        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                background: done ? 'var(--accent)' : active ? 'var(--accent-soft)' : 'var(--bg-app)',
                color:      done ? '#FFFFFF' : active ? 'var(--accent-text)' : 'var(--text-muted)',
                border:     active ? '2px solid var(--accent)' : done ? 'none' : '2px solid var(--border-strong)',
                flexShrink: 0,
                transition: 'all .2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent-text)' : done ? 'var(--text-2)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: done ? 'var(--accent)' : 'var(--border)',
                marginBottom: '18px',
                marginLeft: '8px',
                marginRight: '8px',
                transition: 'background .3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default StepIndicator
