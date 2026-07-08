import type { ReactNode } from 'react'

interface Props { left: ReactNode; right: ReactNode }

function SplitView({ left, right }: Props) {
  return (
    <div className="split-view">
      <div className="split-left">{left}</div>
      <div className="split-right">{right}</div>
    </div>
  )
}

export default SplitView
