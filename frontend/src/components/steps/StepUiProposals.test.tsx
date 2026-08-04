import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import StepUiProposals from './StepUiProposals'
import type { TableConfig } from '../../App'
import type { UiProposal } from '../../lib/uiProposals'

const table: TableConfig = {
  id: 't1',
  sheetName: 'Feuille1',
  tableName: 'Clients',
  columns: [{ originalName: 'nom', name: 'nom', type: 'STRING', isPrimaryKey: false }],
  rows: [['Alice']],
}

function makeProposal(id: string, recommended = false): UiProposal {
  return {
    id,
    title: `Proposition ${id}`,
    description: `Description ${id}`,
    recommended,
    config: {
      layout: 'table', density: 'comfortable', navigation: 'sidebar', searchEnabled: false,
      sortMode: 'source', exportMode: 'none', theme: 'light', canEdit: false,
      showStats: false, showChart: false,
    },
  }
}

const proposals = [makeProposal('a', true), makeProposal('b')]

function renderStep(props: Partial<Parameters<typeof StepUiProposals>[0]> = {}) {
  const onSelect = props.onSelect ?? vi.fn()
  const onBack = props.onBack ?? vi.fn()
  const onConfirm = props.onConfirm ?? vi.fn()
  render(
    <LanguageProvider>
      <StepUiProposals
        proposals={proposals}
        table={table}
        selectedId={null}
        onSelect={onSelect}
        onBack={onBack}
        onConfirm={onConfirm}
        isCreating={false}
        error={null}
        {...props}
      />
    </LanguageProvider>,
  )
  return { onSelect, onBack, onConfirm }
}

describe('StepUiProposals', () => {
  it('affiche toutes les propositions', () => {
    renderStep()
    expect(screen.getByText('Proposition a')).toBeInTheDocument()
    expect(screen.getByText('Proposition b')).toBeInTheDocument()
  })

  it('appelle onSelect au clic sur une proposition', () => {
    const { onSelect } = renderStep()
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('désactive le bouton de confirmation tant qu\'aucune proposition n\'est sélectionnée', () => {
    renderStep()
    expect(screen.getByText(/confirmer et créer/i)).toBeDisabled()
  })

  it('active le bouton de confirmation une fois une proposition sélectionnée', () => {
    renderStep({ selectedId: 'a' })
    expect(screen.getByText(/confirmer et créer/i)).not.toBeDisabled()
  })

  it('affiche le message d\'erreur fourni', () => {
    renderStep({ error: 'Erreur de création' })
    expect(screen.getByText('Erreur de création')).toBeInTheDocument()
  })

  it('affiche l\'état de création en cours', () => {
    renderStep({ selectedId: 'a', isCreating: true })
    expect(screen.getByText(/création/i)).toBeInTheDocument()
  })
})
