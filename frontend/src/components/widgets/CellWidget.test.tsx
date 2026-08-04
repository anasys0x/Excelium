import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderCell } from './CellWidget'

function renderRole(role: Parameters<typeof renderCell>[0], value: unknown) {
  return render(<>{renderCell(role, value)}</>)
}

describe('renderCell', () => {
  it('affiche un tiret pour une valeur vide', () => {
    const { container } = renderRole('title', null)
    expect(container.textContent).toBe('—')
  })

  it('formate un nombre avec le séparateur français', () => {
    const { container } = renderRole('number', 1234)
    expect(container.textContent).toContain('234')
  })

  it('formate une devise en euros', () => {
    const { container } = renderRole('currency', 10)
    expect(container.textContent).toContain('€')
  })

  it('affiche une coche pour un booléen vrai', () => {
    const { container } = renderRole('boolean', true)
    expect(container.textContent).toBe('✓')
  })

  it('affiche une croix pour un booléen faux', () => {
    const { container } = renderRole('boolean', false)
    expect(container.textContent).toBe('✗')
  })

  it('affiche une barre de progression pour un pourcentage', () => {
    const { container } = renderRole('percent', 42)
    expect(container.textContent).toContain('42')
    expect(container.textContent).toContain('%')
  })

  it('affiche des étoiles pour une note', () => {
    const { container } = renderRole('rating', 3)
    const text = container.textContent ?? ''
    expect(text.match(/★/g)?.length).toBe(5)
  })

  it('affiche la valeur brute par défaut', () => {
    const { container } = renderRole('text', 'bonjour')
    expect(container.textContent).toBe('bonjour')
  })
})
