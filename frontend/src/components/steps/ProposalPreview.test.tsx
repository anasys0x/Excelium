import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ProposalPreview from './ProposalPreview'
import type { TableConfig } from '../../App'
import type { UiProposal, UiConfiguration } from '../../lib/uiProposals'

const table: TableConfig = {
  id: 't1',
  sheetName: 'Feuille1',
  tableName: 'Clients',
  columns: [
    { originalName: 'nom', name: 'nom', type: 'STRING', isPrimaryKey: false },
    { originalName: 'ville', name: 'ville', type: 'STRING', isPrimaryKey: false },
  ],
  rows: [['Alice', 'Paris'], ['Bob', 'Lyon']],
}

function makeConfig(overrides: Partial<UiConfiguration> = {}): UiConfiguration {
  return {
    layout: 'table', density: 'comfortable', navigation: 'none', searchEnabled: false,
    sortMode: 'default', exportMode: 'none', theme: 'light', canEdit: false,
    showStats: false, showChart: false,
    ...overrides,
  }
}

function makeProposal(config: UiConfiguration): UiProposal {
  return { id: 'p1', title: 'Aperçu', description: 'desc', recommended: false, config }
}

describe('ProposalPreview', () => {
  it('affiche le nom de la table', () => {
    const { container } = render(<ProposalPreview proposal={makeProposal(makeConfig())} table={table} />)
    expect(container.textContent).toContain('Clients')
  })

  it('affiche les statistiques quand showStats est actif', () => {
    const { container } = render(<ProposalPreview proposal={makeProposal(makeConfig({ showStats: true }))} table={table} />)
    expect(container.querySelector('.proposal-preview-stats')).toBeInTheDocument()
  })

  it('n\'affiche pas les statistiques quand showStats est inactif', () => {
    const { container } = render(<ProposalPreview proposal={makeProposal(makeConfig({ showStats: false }))} table={table} />)
    expect(container.querySelector('.proposal-preview-stats')).not.toBeInTheDocument()
  })

  it('applique la classe de thème correspondante', () => {
    const { container } = render(<ProposalPreview proposal={makeProposal(makeConfig({ theme: 'dark' }))} table={table} />)
    expect(container.querySelector('.theme-dark')).toBeInTheDocument()
  })

  it('surligne les clés changées avec la classe hl-pulse', () => {
    const { container } = render(
      <ProposalPreview proposal={makeProposal(makeConfig())} table={table} changedKeys={new Set(['theme'])} />,
    )
    expect(container.querySelector('.hl-pulse')).toBeInTheDocument()
  })

  it('affiche la mise en page cartes quand layout=cards', () => {
    const { container } = render(<ProposalPreview proposal={makeProposal(makeConfig({ layout: 'cards' }))} table={table} />)
    expect(container.querySelector('.proposal-mini-cards')).toBeInTheDocument()
  })
})
