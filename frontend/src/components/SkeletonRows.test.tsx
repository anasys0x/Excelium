import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import SkeletonRows from './SkeletonRows'

describe('SkeletonRows', () => {
  it('affiche 6 lignes par défaut', () => {
    const { container } = render(<SkeletonRows />)
    expect(container.querySelectorAll('.skeleton-row')).toHaveLength(6)
  })

  it('affiche le nombre de lignes demandé', () => {
    const { container } = render(<SkeletonRows rows={3} />)
    expect(container.querySelectorAll('.skeleton-row')).toHaveLength(3)
  })

  it('est masqué aux lecteurs d\'écran', () => {
    const { container } = render(<SkeletonRows rows={1} />)
    expect(container.querySelector('.skeleton-rows')).toHaveAttribute('aria-hidden', 'true')
  })
})
