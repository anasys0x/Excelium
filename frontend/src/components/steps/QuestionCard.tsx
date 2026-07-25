import type { Question, QuestionOption } from '../../lib/questions'
import { useI18n } from '../../lib/i18n'

interface Props {
  question: Question
  selectedOptionId: string | null
  onSelect: (option: QuestionOption) => void
}

function QuestionCard({ question, selectedOptionId, onSelect }: Props) {
  const { t } = useI18n()
  return (
    <div className="question-card">
      <p className="question-card-category">{t(`qb.cat.${question.category}`)}</p>
      <h2 className="question-card-text">{question.text}</h2>
      <div className="question-card-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`question-option${selectedOptionId === option.id ? ' selected' : ''}`}
            onClick={() => onSelect(option)}
            aria-pressed={selectedOptionId === option.id}
          >
            <span className="question-option-marker" aria-hidden="true" />
            <span className="question-option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuestionCard
