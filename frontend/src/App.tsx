import { useState, useEffect } from 'react'
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
}

export interface TableConfig {
  id: string          // identifiant stable `${sheetIndex}-${tableIndex}`
  sheetName: string   // feuille d'origine
  tableName: string   // nom du tableau (éditable)
  columns: ColumnConfig[]
  rows: unknown[][]
}

export interface SheetData {
  name: string
  tables: TableConfig[]
}

interface ParsedColumn  { name: string; type: string }
interface ParsedTable   { name: string; columns: ParsedColumn[]; rows: unknown[][] }
interface ParsedSheet   { name: string; tables: ParsedTable[] }
interface ParseResponse { sheets: ParsedSheet[] }

const ACCENT = 'var(--accent)'

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

  // Applique le thème sur <html> et le persiste
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
      const response = await fetch('http://localhost:8000/parse', {
        method: 'POST',
        body: formData,
      })
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
            isPrimaryKey: col.name === 'id',
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

  // Active une feuille et son premier tableau
  const enterSheet = (sheet: SheetData) => {
    setActiveSheetName(sheet.name)
    setActiveTableId(sheet.tables[0]?.id ?? null)
    setFocusedColumn(null)
  }

  const updateTable = (updated: TableConfig) => {
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet.name === updated.sheetName
          ? { ...sheet, tables: sheet.tables.map((t) => (t.id === updated.id ? updated : t)) }
          : sheet
      )
    )
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

  // Envoie la config finale au backend pour créer les tables PostgreSQL
  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)

    const payload = {
      tables: allTables.map((t) => ({
        tableName: t.tableName,
        columns: t.columns.map((c) => ({
          name: c.name,
          type: c.type,
          isPrimaryKey: c.isPrimaryKey,
        })),
        rows: t.rows,
      })),
    }

    try {
      const response = await fetch('http://localhost:8000/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail ?? 'Erreur inconnue lors de la création.')
      }

      setCreatedTables(data.created ?? [])
      setStep('done')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création.')
    } finally {
      setIsCreating(false)
    }
  }

  // Réinitialise tout pour repartir d'un nouveau fichier
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

  // Données dérivées
  const showSelect      = sheets.length > 1
  const selectedSheets  = sheets.filter((s) => selectedSheetNames.includes(s.name))
  const allTables       = selectedSheets.flatMap((s) => s.tables)
  const activeSheet     = selectedSheets.find((s) => s.name === activeSheetName) ?? selectedSheets[0] ?? null
  const activeTable     = activeSheet?.tables.find((t) => t.id === activeTableId) ?? activeSheet?.tables[0] ?? null
  const missingKeyCount = allTables.filter((t) => !t.columns.some((c) => c.isPrimaryKey)).length

  const indicatorSteps = showSelect
    ? [
        { key: 'upload',  label: 'Importer'   },
        { key: 'select',  label: 'Feuilles'   },
        { key: 'config',  label: 'Configurer' },
        { key: 'confirm', label: 'Créer'      },
      ]
    : [
        { key: 'upload',  label: 'Importer'   },
        { key: 'config',  label: 'Configurer' },
        { key: 'confirm', label: 'Créer'      },
      ]

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-app)' }}>

      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 40px',
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        gap: '12px',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: '15px', color: 'var(--accent-text)' }}>
          Excelium
        </span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Excel → Base de données</span>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--surface-alt)',
            color: 'var(--text-2)',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Soft Sand'}
        </button>
      </header>

      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '40px' }}>

        <StepIndicator steps={indicatorSteps} currentKey={step === 'done' || step === 'app' ? 'confirm' : step} />

        {/* Étape 1 : Importer */}
        {step === 'upload' && (
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
              Importez votre fichier Excel
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
              Déposez un fichier{' '}
              <code style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>
                .xlsx
              </code>{' '}
              — Excelium détecte les feuilles, les colonnes et leurs types.
            </p>
            <DropZone onFileSelected={handleFileSelected} />
            {isLoading && <p style={{ marginTop: '16px', color: 'var(--accent-text)', fontSize: '13px' }}>Analyse du fichier en cours…</p>}
            {error && <p style={{ marginTop: '16px', color: 'var(--danger-text)', fontSize: '13px' }}>{error}</p>}
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
            {/* Onglets de feuilles (si plusieurs) */}
            {selectedSheets.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                {selectedSheets.map((sheet) => {
                  const isActive = sheet.name === activeSheet.name
                  return (
                    <button
                      key={sheet.name}
                      onClick={() => enterSheet(sheet)}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                        color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        marginBottom: '-1px',
                      }}
                    >
                      {sheet.name}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Contexte feuille stable : renommer un tableau ne renomme jamais la feuille */}
            {selectedSheets.length === 1 && activeSheet.tables.length > 1 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Feuille :{' '}
                <strong style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {activeSheet.name}
                </strong>
              </p>
            )}

            {/* Sélecteur de tableau (si la feuille en a plusieurs) */}
            {activeSheet.tables.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tableau :</span>
                {activeSheet.tables.map((table) => {
                  const isActive = table.id === activeTable.id
                  return (
                    <button
                      key={table.id}
                      onClick={() => { setActiveTableId(table.id); setFocusedColumn(null) }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '999px',
                        border: `1px solid ${isActive ? ACCENT : 'var(--border-strong)'}`,
                        background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                        color: isActive ? 'var(--accent-text)' : 'var(--text-2)',
                        fontSize: '12px',
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                      }}
                    >
                      {table.tableName}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Édition directe : aperçu + panneau */}
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
                  onChange={updateTable}
                  onFocusColumn={setFocusedColumn}
                />
              }
            />

            {/* Navigation globale */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '28px' }}>
              <button
                onClick={() => setStep(showSelect ? 'select' : 'upload')}
                style={{
                  padding: '9px 18px',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ← Retour
              </button>

              {missingKeyCount > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--amber-text)' }}>
                  {missingKeyCount} table{missingKeyCount > 1 ? 's' : ''} sans identifiant
                </span>
              )}

              <button
                onClick={() => setStep('confirm')}
                disabled={missingKeyCount > 0}
                style={{
                  marginLeft: 'auto',
                  padding: '9px 20px',
                  background: missingKeyCount === 0 ? ACCENT : 'var(--border)',
                  color: missingKeyCount === 0 ? '#FFFFFF' : 'var(--text-faint)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: missingKeyCount === 0 ? 'pointer' : 'not-allowed',
                }}
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
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--ok-bg)',
              border: '1px solid var(--ok-border)',
              color: 'var(--badge-green-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              margin: '0 auto 16px',
            }}>
              ✓
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
              Base de données créée
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px' }}>
              {createdTables.length} table{createdTables.length > 1 ? 's' : ''} créée{createdTables.length > 1 ? 's' : ''} avec succès.
            </p>

            <div style={{
              textAlign: 'left',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              background: 'var(--surface)',
              overflow: 'hidden',
              marginBottom: '28px',
            }}>
              {createdTables.map((t, i) => (
                <div key={t.table} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: 'var(--text)' }}>
                    {t.table}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {t.rows} ligne{t.rows > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('app')}
              style={{
                padding: '10px 22px',
                background: ACCENT,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ouvrir l'application générée →
            </button>
            <button
              onClick={resetAll}
              style={{
                marginLeft: '10px',
                padding: '10px 22px',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Importer un autre fichier
            </button>
          </div>
        )}

        {/* Application générée (aperçu sémantique en lecture seule) */}
        {step === 'app' && (
          <GeneratedApp tables={allTables} onBack={() => setStep('done')} />
        )}

      </main>
    </div>
  )
}

export default App
