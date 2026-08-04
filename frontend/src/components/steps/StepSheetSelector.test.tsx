import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../../lib/i18n'
import StepSheetSelector from './StepSheetSelector'
import type { SheetData } from '../../App'

const sheets: SheetData[] = [
  {
    name: 'Feuille1',
    tables: [
      { id: 't1', sheetName: 'Feuille1', tableName: 'Table1', columns: [], rows: [] },
    ],
  },
  {
    name: 'Feuille2',
    tables: [
      { id: 't2', sheetName: 'Feuille2', tableName: 'Table2', columns: [], rows: [] },
    ],
  },
]

function renderStep(props: Partial<Parameters<typeof StepSheetSelector>[0]> = {}) {
  const onToggle = props.onToggle ?? vi.fn()
  const onToggleAll = props.onToggleAll ?? vi.fn()
  const onBack = props.onBack ?? vi.fn()
  const onConfirm = props.onConfirm ?? vi.fn()
  render(
    <LanguageProvider>
      <StepSheetSelector
        sheets={sheets}
        selected={[]}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
        onBack={onBack}
        onConfirm={onConfirm}
        {...props}
      />
    </LanguageProvider>,
  )
  return { onToggle, onToggleAll, onBack, onConfirm }
}

describe('StepSheetSelector', () => {
  it('affiche toutes les feuilles', () => {
    renderStep()
    expect(screen.getByText('Feuille1')).toBeInTheDocument()
    expect(screen.getByText('Feuille2')).toBeInTheDocument()
  })

  it('désactive le bouton de confirmation si aucune feuille sélectionnée', () => {
    renderStep()
    expect(screen.getByText(/→/, { selector: 'button.btn-primary' })).toBeDisabled()
  })

  it('active le bouton de confirmation dès qu\'une feuille est sélectionnée', () => {
    renderStep({ selected: ['Feuille1'] })
    expect(screen.getByText(/→/, { selector: 'button.btn-primary' })).not.toBeDisabled()
  })

  it('appelle onToggle au clic sur une case à cocher', () => {
    const { onToggle } = renderStep()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onToggle).toHaveBeenCalledWith('Feuille1')
  })

  it('appelle onToggleAll au clic sur "tout sélectionner"', () => {
    const { onToggleAll } = renderStep()
    fireEvent.click(screen.getByRole('button', { name: /tout/i }))
    expect(onToggleAll).toHaveBeenCalled()
  })

  it('appelle onBack au clic sur retour', () => {
    const { onBack } = renderStep()
    fireEvent.click(screen.getByText(/changer de fichier/i))
    expect(onBack).toHaveBeenCalled()
  })
})
