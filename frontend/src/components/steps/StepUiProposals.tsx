import type { TableConfig } from '../../App'
import type { UiProposal } from '../../lib/uiProposals'
import ProposalPreview from './ProposalPreview'

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
  return (
    <section className="proposals-section">
      <div className="proposals-heading">
        <p className="questionnaire-kicker">Dernière étape</p>
        <h1>Choisis ton interface</h1>
        <p>Voici trois propositions générées à partir de tes réponses et de tes données.</p>
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
                  {proposal.id === 'recommended' && <small>Recommandée</small>}
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
          ← Modifier mes réponses
        </button>
        <button className="btn-primary" onClick={onConfirm} disabled={!selectedId || isCreating}>
          {isCreating ? 'Création en cours…' : 'Confirmer et créer'}
        </button>
      </div>
    </section>
  )
}

export default StepUiProposals
