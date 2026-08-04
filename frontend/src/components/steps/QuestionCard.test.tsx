import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import QuestionCard from './QuestionCard'
import type { Question } from '../../lib/questions'

const question: Question = {
  id: 'q1',
  category: 'usage',
  summaryLabel: 'Usage',
  text: 'Quel est l\'usage principal ?',
  options: [
    { id: 'opt-a', label: 'Option A', delta: {} },
    { id: 'opt-b', label: 'Option B', delta: {} },
  ],
}

function renderQuestionCard(selectedOptionId: string | null = null, onSelect = vi.fn()) {
  render(
    <LanguageProvider>
      <QuestionCard question={question} selectedOptionId={selectedOptionId} onSelect={onSelect} />
    </LanguageProvider>,
  )
  return onSelect
}

describe('QuestionCard', () => {
  it('affiche le texte de la question et toutes les options', () => {
    renderQuestionCard()
    expect(screen.getByText('Quel est l\'usage principal ?')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('marque l\'option sélectionnée comme active', () => {
    renderQuestionCard('opt-b')
    const buttonB = screen.getByText('Option B').closest('button')
    const buttonA = screen.getByText('Option A').closest('button')
    expect(buttonB).toHaveAttribute('aria-pressed', 'true')
    expect(buttonA).toHaveAttribute('aria-pressed', 'false')
  })

  it('appelle onSelect avec l\'option cliquée', () => {
    const onSelect = renderQuestionCard()
    fireEvent.click(screen.getByText('Option A'))
    expect(onSelect).toHaveBeenCalledWith(question.options[0])
  })
})
