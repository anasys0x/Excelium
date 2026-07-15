import { CATEGORY_LABELS } from '../../lib/questions'
import type { Question, QuestionOption } from '../../lib/questions'

interface Props {
  question: Question
  selectedOptionId: string | null
  onSelect: (option: QuestionOption) => void
}

function QuestionCard({ question, selectedOptionId, onSelect }: Props) {
  return (
    <div className="question-card">
      <p className="question-card-category">{CATEGORY_LABELS[question.category]}</p>
      <h2 className="question-card-text">{question.text}</h2>
      <div className="question-card-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`question-option${selectedOptionId === option.id ? ' selected' : ''}`}
            onClick={() => onSelect(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuestionCard
