import { useState } from 'react'
import type { Question, QuestionOption } from '../../lib/questions'
import type { QuestionAnswer } from '../../lib/preferenceEngine'
import QuestionCard from './QuestionCard'

interface Props {
  questions: Question[]
  answers: Record<string, QuestionAnswer>
  onAnswer: (answer: QuestionAnswer) => void
  onBack: () => void
  onCreateWebApp: () => void
  isCreating: boolean
  error: string | null
}

function StepQuestionnaire({ questions, answers, onAnswer, onBack, onCreateWebApp, isCreating, error }: Props) {
  const [index, setIndex] = useState(0)
  const question = questions[index]
  const total = questions.length
  const selected = answers[question.id]

  const selectOption = (option: QuestionOption) => {
    onAnswer({ questionId: question.id, optionId: option.id, delta: option.delta })
  }

  return (
    <div className="questionnaire-section">
      <div className="questionnaire-progress">
        <div className="questionnaire-progress-bar">
          <div
            className="questionnaire-progress-fill"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="questionnaire-progress-label">Question {index + 1}/{total}</span>
      </div>

      <QuestionCard
        question={question}
        selectedOptionId={selected?.optionId ?? null}
        onSelect={selectOption}
      />

      {error && <div className="confirm-error">{error}</div>}

      <div className="questionnaire-actions">
        <button
          className="btn btn-secondary"
          onClick={index === 0 ? onBack : () => setIndex((i) => i - 1)}
          disabled={isCreating}
        >
          ← {index === 0 ? 'Retour' : 'Précédent'}
        </button>
        {index < total - 1 && (
          <button
            className="btn btn-secondary"
            onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            disabled={isCreating}
          >
            Suivant →
          </button>
        )}
        <button className="btn-primary btn-ml-auto" onClick={onCreateWebApp} disabled={isCreating}>
          {isCreating ? 'Création en cours…' : 'Créer WebApp'}
        </button>
      </div>
    </div>
  )
}

export default StepQuestionnaire
