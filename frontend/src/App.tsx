import { useState, useEffect } from 'react'
import './App.css'
import DropZone from './components/DropZone'
import SplitView from './components/layout/SplitView'
import TablePreview from './components/table/TablePreview'
import StepKeySelector from './components/steps/StepKeySelector'
import StepSheetSelector from './components/steps/StepSheetSelector'
import StepTableConfirmation from './components/steps/StepTableConfirmation'
import StepIndicator from './components/StepIndicator'
import GeneratedApp from './components/app/GeneratedApp'

export type Step = 'upload' | 'select' | 'config' | 'confirm' | 'done' | 'app'
export type Theme = 'dark' | 'light'

interface CreatedTable {
  table: string
  rows: number
}

export interface ColumnConfig {
  originalName: string
  name: string
  type: string
  isPrimaryKey: boolean
  isAuto?: boolean
  isPkCandidate?: boolean
  pkScore?: number
  foreignKey?: { refTable: string; refColumn: string } | null
  foreignKeyConfirmed?: boolean
  foreignKeyRefused?: boolean
  excluded?: boolean
}

export interface TableConfig {
  id: string
  sheetName: string
  tableName: string
  columns: ColumnConfig[]
  rows: unknown[][]
}

export interface SheetData {
  name: string
  tables: TableConfig[]
}

interface ParsedColumn  {
  name: string
  type: string
  isPrimaryKey: boolean
  isPkCandidate: boolean
  pkScore: number
  foreignKey?: { refTable: string; refColumn: string } | null
}
interface ParsedTable   { name: string; columns: ParsedColumn[]; rows: unknown[][] }
interface ParsedSheet   { name: string; tables: ParsedTable[] }
interface ParseResponse { sheets: ParsedSheet[] }

function App() {
  const [step, setStep]                        = useState<Step>('upload')
  const [sheets, setSheets]                    = useState<SheetData[]>([])
  const [selectedSheetNames, setSelectedNames] = useState<string[]>([])
  const [activeSheetName, setActiveSheetName]  = useState<string | null>(null)
  const [activeTableId, setActiveTableId]      = useState<string | null>(null)
  const [focusedColumn, setFocusedColumn]      = useState<string | null>(null)
  const [isLoading, setIsLoading]              = useState(false)
  const [error, setError]                      = useState<string | null>(null)
  const [isCreating, setIsCreating]            = useState(false)
  const [createError, setCreateError]          = useState<string | null>(null)
  const [createdTables, setCreatedTables]      = useState<CreatedTable[]>([])
  const [theme, setTheme]                      = useState<Theme>(
    () => (localStorage.getItem('excelium-theme') as Theme) ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('excelium-theme', theme)
  }, [theme])

  const handleFileSelected = async (file: File) => {
    setIsLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('http://localhost:8000/parse', { method: 'POST', body: formData })
      if (!response.ok) throw new Error()
      const data: ParseResponse = await response.json()
      const sheetsData: SheetData[] = data.sheets.map((sheet, si) => ({
        name: sheet.name,
        tables: sheet.tables.map((table, ti) => ({
          id: `${si}-${ti}`,
          sheetName: sheet.name,
          tableName: table.name,
          columns: table.columns.map((col) => ({
            originalName: col.name,
            name: col.name,
            type: col.type,
            isPrimaryKey: col.isPrimaryKey,
            isPkCandidate: col.isPkCandidate,
            pkScore: col.pkScore,
            foreignKey: col.foreignKey ?? null,
          })),
          rows: table.rows,
        })),
      }))
      setSheets(sheetsData)
      setSelectedNames(sheetsData.map((s) => s.name))
      setFocusedColumn(null)
      if (sheetsData.length === 1) {
        enterSheet(sheetsData[0])
        setStep('config')
      } else {
        setStep('select')
      }
    } catch {
      setError('Impossible de lire le fichier. Vérifiez que le backend est lancé.')
    } finally {
      setIsLoading(false)
    }
  }

  const enterSheet = (sheet: SheetData) => {
    setActiveSheetName(sheet.name)
    setActiveTableId(sheet.tables[0]?.id ?? null)
    setFocusedColumn(null)
  }

  const updateTable = (updated: TableConfig) => {
    setSheets((prev) => {
      const oldTable = prev.flatMap((s) => s.tables).find((t) => t.id === updated.id)
      const oldName  = oldTable?.tableName
      const newName  = updated.tableName
      const renamed  = oldTable != null && oldName !== newName
      return prev.map((sheet) => ({
        ...sheet,
        tables: sheet.tables.map((t) => {
          if (t.id === updated.id) return updated
          if (!renamed) return t
          return {
            ...t,
            columns: t.columns.map((col) =>
              col.foreignKey?.refTable === oldName
                ? { ...col, foreignKey: { ...col.foreignKey, refTable: newName } }
                : col
            ),
          }
        }),
      }))
    })
  }

  const toggleSheet = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const confirmSelection = () => {
    const firstSelected = sheets.find((s) => selectedSheetNames.includes(s.name))
    if (firstSelected) enterSheet(firstSelected)
    setStep('config')
  }

  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)
    const payload = {
      tables: allTables.map((t) => {
        const includedIdx = t.columns.map((_, i) => i).filter((i) => !t.columns[i].excluded)
        const includedCols = includedIdx.map((i) => t.columns[i])
        return {
          tableName: t.tableName,
          columns: includedCols.map((c) => ({
            name: c.name,
            type: c.type,
            isPrimaryKey: c.isPrimaryKey,
            ...(c.foreignKey && c.foreignKeyConfirmed ? { foreignKey: c.foreignKey } : {}),
          })),
          rows: t.rows.map((row) => includedIdx.map((i) => row[i])),
        }
      }),
    }
    try {
      const response = await fetch('http://localhost:8000/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail ?? 'Erreur inconnue lors de la création.')
      setCreatedTables(data.created ?? [])
      setStep('done')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création.')
    } finally {
      setIsCreating(false)
    }
  }

  const resetAll = () => {
    setSheets([])
    setSelectedNames([])
    setActiveSheetName(null)
    setActiveTableId(null)
    setFocusedColumn(null)
    setCreatedTables([])
    setCreateError(null)
    setError(null)
    setStep('upload')
  }

  const showSelect      = sheets.length > 1
  const selectedSheets  = sheets.filter((s) => selectedSheetNames.includes(s.name))
  const allTables       = selectedSheets.flatMap((s) => s.tables)
  const activeSheet     = selectedSheets.find((s) => s.name === activeSheetName) ?? selectedSheets[0] ?? null
  const activeTable     = activeSheet?.tables.find((t) => t.id === activeTableId) ?? activeSheet?.tables[0] ?? null
  const missingKeyCount = allTables.filter((t) => !t.columns.some((c) => c.isPrimaryKey && !c.excluded)).length

  const tableNames         = allTables.map((t) => t.tableName)
  const duplicateNames     = tableNames.filter((name, idx) => tableNames.indexOf(name) !== idx)
  const emptyTableName     = allTables.some((t) => !t.tableName.trim())
  const emptyColName       = allTables.some((t) => t.columns.filter((c) => !c.excluded).some((c) => !c.name.trim()))
  const hasDuplicateColNames = allTables.some((t) => {
    const names = t.columns.filter((c) => !c.excluded).map((c) => c.name.trim())
    return new Set(names).size !== names.length
  })
  const canProceed = missingKeyCount === 0 && duplicateNames.length === 0
    && !emptyTableName && !emptyColName && !hasDuplicateColNames

  const confirmedLinks = allTables.flatMap((t) =>
    t.columns
      .filter((c) => c.foreignKey && c.foreignKeyConfirmed)
      .map((c) => ({
        fromTable: t.tableName, fromCol: c.name,
        toTable: c.foreignKey!.refTable, toCol: c.foreignKey!.refColumn,
      }))
  )

  const indicatorSteps = showSelect
    ? [
        { key: 'upload', label: 'Importer'   },
        { key: 'select', label: 'Feuilles'   },
        { key: 'config', label: 'Configurer' },
        { key: 'confirm', label: 'Créer'     },
      ]
    : [
        { key: 'upload', label: 'Importer'   },
        { key: 'config', label: 'Configurer' },
        { key: 'confirm', label: 'Créer'     },
      ]

  return (
    <div className="app-shell">

      <header className="app-header">
        <span className="app-header-logo">Excelium</span>
        <span className="app-header-sep">|</span>
        <span className="app-header-tagline">Excel → Base de données</span>
        <button
          className="app-theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Soft Sand'}
        </button>
      </header>

      <main className="app-main">

        {step !== 'app' && (
          <StepIndicator steps={indicatorSteps} currentKey={step === 'done' ? 'confirm' : step} />
        )}

        {/* Étape 1 : Importer */}
        {step === 'upload' && (
          <div className="upload-section">
            <h1 className="upload-title">Importez votre fichier Excel</h1>
            <p className="upload-desc">
              Déposez un fichier{' '}
              <code className="upload-code">.xlsx</code>{' '}
              — Excelium détecte les feuilles, les colonnes et leurs types.
            </p>
            <DropZone onFileSelected={handleFileSelected} />
            {isLoading && <p className="upload-loading">Analyse du fichier en cours…</p>}
            {error    && <p className="upload-error">{error}</p>}
          </div>
        )}

        {/* Étape 2 : Sélection des feuilles */}
        {step === 'select' && (
          <StepSheetSelector
            sheets={sheets}
            selected={selectedSheetNames}
            onToggle={toggleSheet}
            onBack={() => setStep('upload')}
            onConfirm={confirmSelection}
          />
        )}

        {/* Étape 3 : Configurer */}
        {step === 'config' && activeSheet && activeTable && (
          <div>
            {selectedSheets.length > 1 && (
              <div className="config-tabs">
                {selectedSheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    onClick={() => enterSheet(sheet)}
                    className={`config-tab${sheet.name === activeSheet.name ? ' active' : ''}`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            )}

            {selectedSheets.length === 1 && activeSheet.tables.length > 1 && (
              <p className="config-sheet-label">
                Feuille :{' '}
                <strong>{activeSheet.name}</strong>
              </p>
            )}

            {activeSheet.tables.length > 1 && (
              <div className="config-table-selector">
                <span className="config-table-label">Tableau :</span>
                {activeSheet.tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => { setActiveTableId(table.id); setFocusedColumn(null) }}
                    className={`config-pill${table.id === activeTable.id ? ' active' : ''}`}
                  >
                    {table.tableName}
                  </button>
                ))}
              </div>
            )}

            <SplitView
              left={
                <TablePreview
                  columns={activeTable.columns}
                  rows={activeTable.rows}
                  focusedColumn={focusedColumn}
                />
              }
              right={
                <StepKeySelector
                  config={activeTable}
                  allTables={allTables}
                  onChange={updateTable}
                  onFocusColumn={setFocusedColumn}
                />
              }
            />

            <div className="config-nav">
              <button className="btn btn-secondary" onClick={() => setStep(showSelect ? 'select' : 'upload')}>
                ← Retour
              </button>

              {missingKeyCount > 0 && (
                <span className="config-nav-warn">
                  {missingKeyCount} table{missingKeyCount > 1 ? 's' : ''} sans identifiant
                </span>
              )}
              {duplicateNames.length > 0 && (
                <span className="config-nav-error">
                  Tableaux en double : {[...new Set(duplicateNames)].join(', ')}
                </span>
              )}
              {emptyTableName    && <span className="config-nav-error">Nom de tableau vide</span>}
              {emptyColName      && <span className="config-nav-error">Nom de colonne vide</span>}
              {hasDuplicateColNames && <span className="config-nav-error">Colonnes en double dans un tableau</span>}

              <button
                className="btn-primary btn-ml-auto"
                onClick={() => setStep('confirm')}
                disabled={!canProceed}
              >
                Vérifier et créer →
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 : Créer */}
        {step === 'confirm' && (
          <StepTableConfirmation
            tables={allTables}
            onBack={() => setStep('config')}
            onConfirm={handleCreate}
            isCreating={isCreating}
            error={createError}
          />
        )}

        {/* Étape 5 : Terminé */}
        {step === 'done' && (
          <div className="done-section">
            <div className="done-header">
              <div className="done-check">✓</div>
              <h1 className="done-title">Base de données créée</h1>
              <p className="done-subtitle">
                {createdTables.length} table{createdTables.length > 1 ? 's' : ''} créée{createdTables.length > 1 ? 's' : ''} avec succès
                {confirmedLinks.length > 0 && (
                  <> · <span className="done-green">{confirmedLinks.length} lien{confirmedLinks.length > 1 ? 's' : ''} entre feuilles</span></>
                )}
              </p>
            </div>

            <div className="done-tables-card">
              <div className="done-tables-head">Tables</div>
              {createdTables.map((t) => {
                const tableConfig = allTables.find((at) => at.tableName === t.table || at.tableName.toLowerCase().replace(/[^a-z0-9]/g, '_') === t.table)
                const pk     = tableConfig?.columns.find((c) => c.isPrimaryKey)
                const fkCols = tableConfig?.columns.filter((c) => c.foreignKey && c.foreignKeyConfirmed) ?? []
                return (
                  <div key={t.table} className="done-table-row">
                    <div className="done-table-row-header">
                      <span className="done-table-name">{t.table}</span>
                      <span className="done-table-meta">{t.rows} ligne{t.rows > 1 ? 's' : ''}</span>
                    </div>
                    <div className="done-badges">
                      {pk && <span className="done-badge-pk">ID: {pk.name}</span>}
                      {fkCols.map((c) => (
                        <span key={c.originalName} className="done-badge-fk">
                          {c.name} → {c.foreignKey!.refTable}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {confirmedLinks.length > 0 && (
              <div className="done-links-card">
                <p className="done-links-title">Relations créées</p>
                <div className="done-link-list">
                  {confirmedLinks.map((lk, i) => (
                    <div key={i} className="done-link-row">
                      <span className="done-link-from">{lk.fromTable}.{lk.fromCol}</span>
                      <span className="done-link-arrow">→</span>
                      <span className="done-link-to">{lk.toTable}.{lk.toCol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="done-actions">
              <button className="btn btn-secondary" onClick={() => setStep('confirm')}>← Retour</button>
              <button className="btn-primary" onClick={() => setStep('app')}>Ouvrir l'application générée →</button>
              <button className="btn btn-secondary" onClick={resetAll}>Importer un autre fichier</button>
            </div>
          </div>
        )}

        {step === 'app' && (
          <GeneratedApp tables={allTables} onBack={() => setStep('done')} />
        )}

      </main>
    </div>
  )
}

export default App
