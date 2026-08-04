import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../lib/i18n'
import SessionResume from './SessionResume'

function renderSessionResume(props: Partial<Parameters<typeof SessionResume>[0]> = {}) {
  const onResume = props.onResume ?? vi.fn()
  render(
    <LanguageProvider>
      <SessionResume onResume={onResume} isLoading={false} error={null} {...props} />
    </LanguageProvider>,
  )
  return onResume
}

describe('SessionResume', () => {
  it('désactive le bouton tant qu\'aucun identifiant n\'est saisi', () => {
    renderSessionResume()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('active le bouton une fois un identifiant saisi', () => {
    renderSessionResume()
    fireEvent.change(screen.getByLabelText(/./), { target: { value: 'abc-123' } })
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('appelle onResume avec l\'identifiant nettoyé à la soumission', () => {
    const onResume = vi.fn()
    renderSessionResume({ onResume })
    const input = screen.getByLabelText(/./)
    fireEvent.change(input, { target: { value: '  abc-123  ' } })
    fireEvent.click(screen.getByRole('button'))
    expect(onResume).toHaveBeenCalledWith('abc-123')
  })

  it('n\'appelle pas onResume si l\'identifiant est vide ou blanc', () => {
    const onResume = vi.fn()
    renderSessionResume({ onResume })
    const input = screen.getByLabelText(/./)
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button'))
    expect(onResume).not.toHaveBeenCalled()
  })

  it('désactive le formulaire pendant le chargement', () => {
    renderSessionResume({ isLoading: true })
    expect(screen.getByLabelText(/./)).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('affiche le message d\'erreur fourni', () => {
    renderSessionResume({ error: 'Session introuvable' })
    expect(screen.getByText('Session introuvable')).toBeInTheDocument()
  })
})
