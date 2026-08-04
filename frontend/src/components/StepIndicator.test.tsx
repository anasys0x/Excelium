import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepIndicator from './StepIndicator'

const steps = [
  { key: 'a', label: 'Étape A' },
  { key: 'b', label: 'Étape B' },
  { key: 'c', label: 'Étape C' },
]

describe('StepIndicator', () => {
  it('affiche toutes les étapes', () => {
    render(<StepIndicator steps={steps} currentKey="b" />)
    expect(screen.getByText('Étape A')).toBeInTheDocument()
    expect(screen.getByText('Étape B')).toBeInTheDocument()
    expect(screen.getByText('Étape C')).toBeInTheDocument()
  })

  it('marque les étapes précédentes comme terminées', () => {
    render(<StepIndicator steps={steps} currentKey="c" />)
    expect(screen.getByText('Étape A').className).toContain('done')
    expect(screen.getByText('Étape B').className).toContain('done')
  })

  it('marque l\'étape courante comme active', () => {
    render(<StepIndicator steps={steps} currentKey="b" />)
    expect(screen.getByText('Étape B').className).toContain('active')
  })

  it('ne marque pas les étapes futures', () => {
    render(<StepIndicator steps={steps} currentKey="a" />)
    expect(screen.getByText('Étape B').className).not.toContain('done')
    expect(screen.getByText('Étape B').className).not.toContain('active')
    expect(screen.getByText('Étape C').className).not.toContain('done')
  })

  it('affiche un check sur les étapes terminées', () => {
    const { container } = render(<StepIndicator steps={steps} currentKey="c" />)
    const circles = container.querySelectorAll('.step-circle')
    expect(circles[0].textContent).toBe('✓')
    expect(circles[1].textContent).toBe('✓')
    expect(circles[2].textContent).toBe('3')
  })
})
