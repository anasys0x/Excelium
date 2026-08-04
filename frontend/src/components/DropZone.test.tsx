import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '../lib/i18n'
import DropZone from './DropZone'

function renderDropZone(onFileSelected = vi.fn()) {
  render(
    <LanguageProvider>
      <DropZone onFileSelected={onFileSelected} />
    </LanguageProvider>,
  )
  return onFileSelected
}

function makeFile(name: string, type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  return new File(['contenu'], name, { type })
}

describe('DropZone', () => {
  it('affiche le message d\'invite par défaut', () => {
    renderDropZone()
    expect(document.querySelector('.dropzone-hint')).toBeInTheDocument()
  })

  it('accepte un fichier .xlsx déposé', () => {
    const onFileSelected = vi.fn()
    renderDropZone(onFileSelected)
    const zone = document.querySelector('.dropzone') as HTMLElement
    const file = makeFile('donnees.xlsx')

    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    expect(onFileSelected).toHaveBeenCalledWith(file)
    expect(screen.getByText('donnees.xlsx')).toBeInTheDocument()
  })

  it('rejette un fichier qui n\'est pas .xlsx', () => {
    const onFileSelected = vi.fn()
    renderDropZone(onFileSelected)
    const zone = document.querySelector('.dropzone') as HTMLElement
    const file = makeFile('donnees.csv', 'text/csv')

    fireEvent.drop(zone, { dataTransfer: { files: [file] } })

    expect(onFileSelected).not.toHaveBeenCalled()
    expect(document.querySelector('.dropzone-error')).toBeInTheDocument()
  })

  it('affiche la classe "dragging" pendant le survol', () => {
    renderDropZone()
    const zone = document.querySelector('.dropzone') as HTMLElement

    fireEvent.dragOver(zone)
    expect(zone.className).toContain('dragging')

    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('dragging')
  })

  it('accepte un fichier via l\'input caché', () => {
    const onFileSelected = vi.fn()
    renderDropZone(onFileSelected)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile('rapport.xlsx')

    fireEvent.change(input, { target: { files: [file] } })

    expect(onFileSelected).toHaveBeenCalledWith(file)
  })
})
