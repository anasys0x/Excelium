import { useEffect, useRef } from 'react'
import type { TableConfig } from '../../App'
import type { Question, QuestionOption } from '../../lib/questions'
import type { QuestionAnswer } from '../../lib/preferenceEngine'
import type { UiConfiguration, UiProposal } from '../../lib/uiProposals'
import QuestionCard from './QuestionCard'
import ProposalPreview from './ProposalPreview'
import { useI18n } from '../../lib/i18n'

const TRACKED_KEYS = [
  'layout', 'density', 'navigation', 'searchEnabled',
  'sortMode', 'exportMode', 'theme', 'canEdit', 'showStats', 'showChart',
] as const

function diffConfig(prev: UiConfiguration | undefined, next: UiConfiguration): Set<string> {
  const changed = new Set<string>()
  if (!prev) return changed
  for (const key of TRACKED_KEYS) {
    if (prev[key] !== next[key]) changed.add(key)
  }
  return changed
}

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
  const { t } = useI18n()
  const prevProposalsRef = useRef<Record<string, UiConfiguration>>({})
  const changedKeysByProposal: Record<string, Set<string>> = {}
  for (const proposal of liveProposals) {
    changedKeysByProposal[proposal.id] = diffConfig(prevProposalsRef.current[proposal.id], proposal.config)
  }
  useEffect(() => {
    const next: Record<string, UiConfiguration> = {}
    for (const proposal of liveProposals) next[proposal.id] = proposal.config
    prevProposalsRef.current = next
  }, [liveProposals])

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
    if (!answer) return t('q.toDefine')
    return item.options.find((option) => option.id === answer.optionId)?.label ?? t('q.toDefine')
  }

  return (
    <div className="questionnaire-section">
      <div className="questionnaire-heading">
        <div>
          <p className="questionnaire-kicker">{t('q.kicker')}</p>
          <h1 className="questionnaire-title">{t('q.title')}</h1>
          <p className="questionnaire-intro">{t('q.intro')}</p>
        </div>
        <span className="questionnaire-count">{answeredCount}/{total} {t('q.answersLabel')}</span>
      </div>

      {previewTable && liveProposals.length > 0 && (
        <div className="questionnaire-live-proposals" aria-label={t('q.liveAria')}>
          {liveProposals.map((proposal) => {
            const changedKeys = changedKeysByProposal[proposal.id]
            return (
              <div
                key={proposal.id}
                className={`questionnaire-live-proposal${changedKeys.size > 0 ? ' just-updated' : ''}`}
              >
                <ProposalPreview proposal={proposal} table={previewTable} changedKeys={changedKeys} />
                <span className="questionnaire-live-proposal-title">
                  {proposal.title}
                  {proposal.recommended && <small>{t('q.recommended')}</small>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="questionnaire-layout">
        <div className="questionnaire-main">
          <div className="questionnaire-progress">
            <div className="questionnaire-progress-copy">
              <span>{t('q.questionOf', { n: index + 1, total })}</span>
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
              ← {index === 0 ? t('common.back') : t('q.previous')}
            </button>

            {!isLastQuestion && (
              <button
                className="btn btn-secondary"
                onClick={() => setIndex((current) => Math.min(current + 1, total - 1))}
                disabled={isCreating}
              >
                {t('q.next')} →
              </button>
            )}

            <button
              className="btn-primary btn-ml-auto"
              onClick={onCreateWebApp}
              disabled={isCreating}
              title={isComplete ? undefined : t('q.unansweredHint')}
            >
              {t('q.chooseProposal')} →
            </button>
          </div>

          {!selected && (
            <p className="questionnaire-help">{t('q.help')}</p>
          )}
        </div>

        <aside className="questionnaire-summary" aria-label={t('q.summaryAria')}>
          <p className="questionnaire-summary-eyebrow">{t('q.summaryEyebrow')}</p>
          <h2>{t('q.yourWebapp')}</h2>
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
          <p className="questionnaire-summary-note">{t('q.summaryNote')}</p>
        </aside>
      </div>
    </div>
  )
}

export default StepQuestionnaire
