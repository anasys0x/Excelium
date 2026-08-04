import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import StepQuestionnaire from './StepQuestionnaire'
import type { Question } from '../../lib/questions'

const questions: Question[] = [
  {
    id: 'q1', category: 'usage', summaryLabel: 'Q1', text: 'Question 1',
    options: [{ id: 'a', label: 'Option A', delta: {} }, { id: 'b', label: 'Option B', delta: {} }],
  },
  {
    id: 'q2', category: 'usage', summaryLabel: 'Q2', text: 'Question 2',
    options: [{ id: 'c', label: 'Option C', delta: {} }],
  },
]

function renderStep(props: Partial<Parameters<typeof StepQuestionnaire>[0]> = {}) {
  const onAnswer = props.onAnswer ?? vi.fn()
  const onBack = props.onBack ?? vi.fn()
  const onCreateWebApp = props.onCreateWebApp ?? vi.fn()
  const onIndexChange = props.onIndexChange ?? vi.fn()
  render(
    <LanguageProvider>
      <StepQuestionnaire
        questions={questions}
        answers={{}}
        onAnswer={onAnswer}
        onBack={onBack}
        onCreateWebApp={onCreateWebApp}
        isCreating={false}
        error={null}
        liveProposals={[]}
        previewTable={null}
        index={0}
        onIndexChange={onIndexChange}
        {...props}
      />
    </LanguageProvider>,
  )
  return { onAnswer, onBack, onCreateWebApp, onIndexChange }
}

describe('StepQuestionnaire', () => {
  it('affiche la question courante', () => {
    renderStep()
    expect(screen.getByText('Question 1')).toBeInTheDocument()
  })

  it('appelle onAnswer au choix d\'une option', () => {
    const { onAnswer } = renderStep()
    fireEvent.click(screen.getByText('Option A'))
    expect(onAnswer).toHaveBeenCalledWith({ questionId: 'q1', optionId: 'a', delta: {} })
  })

  it('appelle onBack quand on revient depuis la première question', () => {
    const { onBack } = renderStep({ index: 0 })
    fireEvent.click(screen.getByText(/retour/i))
    expect(onBack).toHaveBeenCalled()
  })

  it('appelle onIndexChange pour passer à la question suivante', () => {
    const { onIndexChange } = renderStep({ index: 0 })
    fireEvent.click(screen.getByText(/suivant/i))
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  it('affiche le compte de réponses données', () => {
    renderStep({ answers: { q1: { questionId: 'q1', optionId: 'a', delta: {} } } })
    expect(document.querySelector('.questionnaire-count')?.textContent).toContain('1/2')
  })

  it('affiche le message d\'erreur fourni', () => {
    renderStep({ error: 'Erreur de génération' })
    expect(screen.getByText('Erreur de génération')).toBeInTheDocument()
  })
})
