import type { TableConfig } from '../../App'
import type { Question, QuestionOption } from '../../lib/questions'
import type { QuestionAnswer } from '../../lib/preferenceEngine'
import type { UiProposal } from '../../lib/uiProposals'
import QuestionCard from './QuestionCard'
import ProposalPreview from './ProposalPreview'

interface Props {
  questions: Question[]
  answers: Record<string, QuestionAnswer>
  onAnswer: (answer: QuestionAnswer) => void
  onBack: () => void
  onCreateWebApp: () => void
  isCreating: boolean
  error: string | null
  liveProposals: UiProposal[]
  previewTable: TableConfig | null
  index: number
  onIndexChange: (index: number) => void
}

function StepQuestionnaire({
  questions, answers, onAnswer, onBack, onCreateWebApp, isCreating, error,
  liveProposals, previewTable, index: rawIndex, onIndexChange,
}: Props) {
  const total = questions.length
  const index = Math.min(rawIndex, total - 1)
  const setIndex = (updater: number | ((current: number) => number)) => {
    onIndexChange(typeof updater === 'function' ? updater(index) : updater)
  }
  const question = questions[index]
  const validAnswer = (item: Question): QuestionAnswer | undefined => {
    const answer = answers[item.id]
    return item.options.some((option) => option.id === answer?.optionId) ? answer : undefined
  }
  const selected = validAnswer(question)
  const answeredCount = questions.filter((item) => validAnswer(item)).length
  const isLastQuestion = index === total - 1
  const isComplete = answeredCount === total

  const selectOption = (option: QuestionOption) => {
    onAnswer({ questionId: question.id, optionId: option.id, delta: option.delta })
  }

  const answerImpact = (item: Question): string => {
    const answer = validAnswer(item)
    if (!answer) return 'À définir'
    return item.options.find((option) => option.id === answer.optionId)?.impact ?? 'À définir'
  }

  return (
    <div className="questionnaire-section">
      <div className="questionnaire-heading">
        <div>
          <p className="questionnaire-kicker">Personnalisation</p>
          <h1 className="questionnaire-title">Construisons ta webapp</h1>
          <p className="questionnaire-intro">
            Chaque réponse configure directement le rendu généré.
          </p>
        </div>
        <span className="questionnaire-count">{answeredCount}/{total} réponses</span>
      </div>

      {previewTable && liveProposals.length > 0 && (
        <div className="questionnaire-live-proposals" aria-label="Les 3 propositions, mises à jour en direct">
          {liveProposals.map((proposal) => (
            <div key={proposal.id} className="questionnaire-live-proposal">
              <ProposalPreview proposal={proposal} table={previewTable} />
              <span className="questionnaire-live-proposal-title">
                {proposal.title}
                {proposal.id === 'recommended' && <small>Recommandée</small>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="questionnaire-layout">
        <div className="questionnaire-main">
          <div className="questionnaire-progress">
            <div className="questionnaire-progress-copy">
              <span>Question {index + 1} sur {total}</span>
              <span>{Math.round(((index + 1) / total) * 100)} %</span>
            </div>
            <div className="questionnaire-progress-bar">
              <div
                className="questionnaire-progress-fill"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
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
              onClick={index === 0 ? onBack : () => setIndex((current) => current - 1)}
              disabled={isCreating}
            >
              ← {index === 0 ? 'Retour' : 'Précédent'}
            </button>

            {!isLastQuestion && (
              <button
                className="btn btn-secondary"
                onClick={() => setIndex((current) => Math.min(current + 1, total - 1))}
                disabled={isCreating}
              >
                Suivant →
              </button>
            )}

            <button
              className="btn-primary btn-ml-auto"
              onClick={onCreateWebApp}
              disabled={isCreating}
              title={isComplete ? undefined : 'Les questions sans réponse gardent la détection automatique'}
            >
              Choisir une proposition →
            </button>
          </div>

          {!selected && (
            <p className="questionnaire-help">
              Choisis une réponse, ou passe directement à la suite — les questions laissées
              de côté gardent la détection automatique.
            </p>
          )}
        </div>

        <aside className="questionnaire-summary" aria-label="Résumé de la webapp">
          <p className="questionnaire-summary-eyebrow">Aperçu de la configuration</p>
          <h2>Ta webapp</h2>
          <div className="questionnaire-summary-list">
            {questions.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                className={`questionnaire-summary-item${itemIndex === index ? ' active' : ''}`}
                onClick={() => setIndex(itemIndex)}
                disabled={isCreating}
              >
                <span>{item.summaryLabel}</span>
                <strong className={validAnswer(item) ? '' : 'pending'}>{answerImpact(item)}</strong>
              </button>
            ))}
          </div>
          <p className="questionnaire-summary-note">
            Tu pourras revenir modifier ces choix après la génération.
          </p>
        </aside>
      </div>
    </div>
  )
}

export default StepQuestionnaire
