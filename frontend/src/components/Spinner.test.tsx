import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('affiche le spinner sans label par défaut', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.spinner')).toBeInTheDocument()
    expect(container.querySelector('.spinner-label')).not.toBeInTheDocument()
  })

  it('affiche le label quand il est fourni', () => {
    render(<Spinner label="Chargement…" />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })
})
