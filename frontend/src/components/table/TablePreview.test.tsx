import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import TablePreview from './TablePreview'
import type { ColumnConfig } from '../../App'

const columns: ColumnConfig[] = [
  { originalName: 'id', name: 'id', type: 'INT', isPrimaryKey: true, isAuto: true },
  { originalName: 'nom', name: 'nom', type: 'STRING', isPrimaryKey: false },
]

const rows: unknown[][] = [
  [1, 'Alice'],
  [2, null],
]

function renderTablePreview(props: Partial<Parameters<typeof TablePreview>[0]> = {}) {
  render(
    <LanguageProvider>
      <TablePreview columns={columns} rows={rows} {...props} />
    </LanguageProvider>,
  )
}

describe('TablePreview', () => {
  it('affiche les en-têtes de colonnes et les cellules', () => {
    renderTablePreview()
    expect(screen.getByText('nom')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('affiche "vide" pour les cellules nulles', () => {
    renderTablePreview()
    expect(screen.getByText('vide')).toBeInTheDocument()
  })

  it('appelle onNameChange à la modification du nom de colonne', () => {
    const onNameChange = vi.fn()
    renderTablePreview({ onNameChange })
    const input = screen.getByDisplayValue('nom')
    fireEvent.change(input, { target: { value: 'nom_complet' } })
    expect(onNameChange).toHaveBeenCalledWith('nom', 'nom_complet')
  })

  it('appelle onExcludeColumn au clic sur le bouton de suppression', () => {
    const onExcludeColumn = vi.fn()
    renderTablePreview({ onExcludeColumn })
    const nomHeader = screen.getByText('nom').closest('th') as HTMLElement
    const removeButton = nomHeader.querySelector('.preview-th-remove') as HTMLElement
    fireEvent.click(removeButton)
    expect(onExcludeColumn).toHaveBeenCalledWith('nom')
  })

  it('n\'affiche pas de bouton de suppression pour une colonne auto (clé primaire)', () => {
    const onExcludeColumn = vi.fn()
    renderTablePreview({ onExcludeColumn })
    const idHeader = screen.getAllByRole('columnheader')[0]
    expect(idHeader.querySelector('.preview-th-remove')).not.toBeInTheDocument()
  })
})
