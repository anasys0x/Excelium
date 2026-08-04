import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import StepTableConfirmation from './StepTableConfirmation'
import type { TableConfig } from '../../App'

const tables: TableConfig[] = [
  {
    id: 't1',
    sheetName: 'Feuille1',
    tableName: 'Clients',
    columns: [
      { originalName: 'id', name: 'id', type: 'INT', isPrimaryKey: true },
      {
        originalName: 'client_id', name: 'client_id', type: 'INT', isPrimaryKey: false,
        foreignKey: { refTable: 'Commandes', refColumn: 'id' }, foreignKeyConfirmed: true,
      },
    ],
    rows: [[1, 2], [3, 4]],
  },
]

function renderStep(props: Partial<Parameters<typeof StepTableConfirmation>[0]> = {}) {
  const onBack = props.onBack ?? vi.fn()
  const onNext = props.onNext ?? vi.fn()
  render(
    <LanguageProvider>
      <StepTableConfirmation tables={tables} onBack={onBack} onNext={onNext} {...props} />
    </LanguageProvider>,
  )
  return { onBack, onNext }
}

describe('StepTableConfirmation', () => {
  it('affiche le nom de la table et son identifiant', () => {
    renderStep()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('id', { selector: '.table-card-pk strong' })).toBeInTheDocument()
  })

  it('affiche le lien de clé étrangère confirmé', () => {
    renderStep()
    expect(screen.getByText('Commandes.id')).toBeInTheDocument()
  })

  it('appelle onNext au clic sur continuer', () => {
    const { onNext } = renderStep()
    fireEvent.click(screen.getByText(/continuer/i))
    expect(onNext).toHaveBeenCalled()
  })

  it('appelle onBack au clic sur retour', () => {
    const { onBack } = renderStep()
    fireEvent.click(screen.getByText('← Retour'))
    expect(onBack).toHaveBeenCalled()
  })

  it('avertit quand une table n\'a pas d\'identifiant', () => {
    const tablesNoPk: TableConfig[] = [
      { id: 't2', sheetName: 'F2', tableName: 'SansCle', columns: [{ originalName: 'a', name: 'a', type: 'STRING', isPrimaryKey: false }], rows: [] },
    ]
    render(
      <LanguageProvider>
        <StepTableConfirmation tables={tablesNoPk} onBack={vi.fn()} onNext={vi.fn()} />
      </LanguageProvider>,
    )
    expect(document.querySelector('.table-card-pk.warn')).toBeInTheDocument()
  })
})
