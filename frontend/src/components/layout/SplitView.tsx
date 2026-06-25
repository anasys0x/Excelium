import type { ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
}

function SplitView({ left, right }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start' }}>

      {/* Gauche : prévisualisation */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingRight: '32px',
        borderRight: '1px solid var(--border)',
      }}>
        {left}
      </div>

      {/* Droite : configuration */}
      <div style={{
        width: '300px',
        flexShrink: 0,
        paddingLeft: '32px',
        position: 'sticky',
        top: '24px',
      }}>
        {right}
      </div>

    </div>
  )
}

export default SplitView
