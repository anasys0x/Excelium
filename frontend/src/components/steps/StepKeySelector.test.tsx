import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import StepKeySelector from './StepKeySelector'
import type { TableConfig } from '../../App'

function makeTable(overrides: Partial<TableConfig> = {}): TableConfig {
  return {
    id: 't1',
    sheetName: 'Feuille1',
    tableName: 'Clients',
    columns: [
      { originalName: 'id', name: 'id', type: 'INT', isPrimaryKey: true, isPkCandidate: true },
      { originalName: 'nom', name: 'nom', type: 'STRING', isPrimaryKey: false },
    ],
    rows: [[1, 'Alice']],
    ...overrides,
  }
}

function renderStep(props: Partial<Parameters<typeof StepKeySelector>[0]> = {}) {
  const config = props.config ?? makeTable()
  const onChange = props.onChange ?? vi.fn()
  const onFocusColumn = props.onFocusColumn ?? vi.fn()
  render(
    <LanguageProvider>
      <StepKeySelector config={config} allTables={[config]} onChange={onChange} onFocusColumn={onFocusColumn} {...props} />
    </LanguageProvider>,
  )
  return { onChange, onFocusColumn }
}

describe('StepKeySelector', () => {
  it('affiche la colonne identifiant présélectionnée', () => {
    renderStep()
    expect(screen.getByDisplayValue('id')).toBeInTheDocument()
  })

  it('appelle onChange au changement de nom de colonne', () => {
    const { onChange } = renderStep()
    fireEvent.change(screen.getByDisplayValue('id'), { target: { value: 'identifiant' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      columns: expect.arrayContaining([expect.objectContaining({ originalName: 'id', name: 'identifiant' })]),
    }))
  })

  it('propose d\'ajouter une colonne id automatique quand aucun id auto n\'existe', () => {
    renderStep()
    expect(document.querySelector('.auto-id-btn')).toBeInTheDocument()
  })

  it('ajoute une colonne id automatique au clic', () => {
    const { onChange } = renderStep()
    fireEvent.click(document.querySelector('.auto-id-btn') as HTMLElement)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      columns: expect.arrayContaining([expect.objectContaining({ originalName: '__auto_id__', isAuto: true })]),
    }))
  })

  it('affiche le bouton de suppression quand une colonne id auto existe déjà', () => {
    const config = makeTable({
      columns: [
        { originalName: '__auto_id__', name: 'id', type: 'INT', isPrimaryKey: true, isAuto: true, isPkCandidate: true },
        { originalName: 'nom', name: 'nom', type: 'STRING', isPrimaryKey: false },
      ],
    })
    renderStep({ config })
    expect(document.querySelector('.auto-id-remove')).toBeInTheDocument()
  })
})
