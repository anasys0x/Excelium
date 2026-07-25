import type { TableConfig } from '../../App'
import type { UiProposal } from '../../lib/uiProposals'
import ProposalPreview from './ProposalPreview'
import { useI18n } from '../../lib/i18n'

interface Props {
  proposals: UiProposal[]
  table: TableConfig
  selectedId: string | null
  onSelect: (id: string) => void
  onBack: () => void
  onConfirm: () => void
  isCreating: boolean
  error: string | null
}

function StepUiProposals({
  proposals,
  table,
  selectedId,
  onSelect,
  onBack,
  onConfirm,
  isCreating,
  error,
}: Props) {
  const { t } = useI18n()
  return (
    <section className="proposals-section">
      <div className="proposals-heading">
        <p className="questionnaire-kicker">{t('prop.kicker')}</p>
        <h1>{t('prop.title')}</h1>
        <p>{t('prop.intro')}</p>
      </div>

      <div className="proposal-grid">
        {proposals.map((proposal) => {
          const selected = selectedId === proposal.id
          return (
            <label key={proposal.id} className={`proposal-card${selected ? ' selected' : ''}`}>
              <input
                type="radio"
                name="ui-proposal"
                value={proposal.id}
                checked={selected}
                onChange={() => onSelect(proposal.id)}
                disabled={isCreating}
              />
              <ProposalPreview proposal={proposal} table={table} />
              <span className="proposal-card-copy">
                <span>
                  <strong>{proposal.title}</strong>
                  {proposal.recommended && <small>{t('q.recommended')}</small>}
                </span>
                <span>{proposal.description}</span>
              </span>
            </label>
          )
        })}
      </div>

      {error && <div className="confirm-error">{error}</div>}

      <div className="proposal-actions">
        <button className="btn btn-secondary" onClick={onBack} disabled={isCreating}>
          ← {t('prop.editAnswers')}
        </button>
        <button className="btn-primary" onClick={onConfirm} disabled={!selectedId || isCreating}>
          {isCreating ? t('prop.creating') : t('prop.confirmCreate')}
        </button>
      </div>
    </section>
  )
}

export default StepUiProposals
