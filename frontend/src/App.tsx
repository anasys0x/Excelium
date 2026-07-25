import { useState, useEffect } from 'react'
import './App.css'
import Landing from './components/landing/Landing'
import DropZone from './components/DropZone'
import SessionResume from './components/SessionResume'
import SplitView from './components/layout/SplitView'
import TablePreview from './components/table/TablePreview'
import StepKeySelector from './components/steps/StepKeySelector'
import StepSheetSelector from './components/steps/StepSheetSelector'
import StepTableConfirmation from './components/steps/StepTableConfirmation'
import StepQuestionnaire from './components/steps/StepQuestionnaire'
import StepUiProposals from './components/steps/StepUiProposals'
import StepIndicator from './components/StepIndicator'
import GeneratedApp from './components/app/GeneratedApp'
import { buildQuestionBank } from './lib/questions'
import { analyzeColumns, findChartRecommendation } from './lib/semantic'
import type { AnalyzedColumn, LayoutKind } from './lib/semantic'
import { ARCHETYPE_PRESETS, computeArchetypeScores, detectArchetype } from './lib/archetype'
import type { TableArchetype } from './lib/archetype'
import {
  buildPreferenceProfile,
  computeTablePreset,
} from './lib/preferenceEngine'
import type { AutoDetectedTablePreset, DisplayDensity, PreferenceProfile, QuestionAnswer } from './lib/preferenceEngine'
import type { ChartPreference, ExportMode, NavigationMode, SortMode } from './lib/preferenceEngine'
import { buildUiProposals } from './lib/uiProposals'
import type { UiProposal } from './lib/uiProposals'
import { restoreSession } from './lib/session'
import type { SessionApiResponse } from './lib/session'
import { useI18n } from './lib/i18n'

export type Step = 'landing' | 'upload' | 'select' | 'config' | 'confirm' | 'created' | 'questionnaire' | 'proposals' | 'done' | 'app'
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

export interface GeneratedAppSeed {
  archetypeOverrides: Record<string, TableArchetype>
  layoutOverrides: Record<string, LayoutKind>
  primaryTableId: string | null
  showChartWidget: boolean
  showStatsWidget: boolean
  chartPreference: ChartPreference | undefined
  canEdit: boolean
  density: DisplayDensity
  navigation: NavigationMode
  searchEnabled: boolean
  sortMode: SortMode
  exportMode: ExportMode
  sessionId: string | null
}

function App() {
  const { t, lang, setLang } = useI18n()
  const [step, setStep]                        = useState<Step>('landing')
  const [sheets, setSheets]                    = useState<SheetData[]>([])
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [selectedSheetNames, setSelectedNames] = useState<string[]>([])
  const [activeSheetName, setActiveSheetName]  = useState<string | null>(null)
  const [activeTableId, setActiveTableId]      = useState<string | null>(null)
  const [focusedColumn, setFocusedColumn]      = useState<string | null>(null)
  const [isLoading, setIsLoading]              = useState(false)
  const [error, setError]                      = useState<string | null>(null)
  const [isResuming, setIsResuming]            = useState(false)
  const [resumeError, setResumeError]          = useState<string | null>(null)
  const [isCreating, setIsCreating]            = useState(false)
  const [createError, setCreateError]          = useState<string | null>(null)
  const [createdTables, setCreatedTables]      = useState<CreatedTable[]>([])
  const [answers, setAnswers]                  = useState<Record<string, QuestionAnswer>>({})
  const [questionnaireIndex, setQuestionnaireIndex] = useState(0)
  const [uiProposals, setUiProposals]          = useState<UiProposal[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [appSeed, setAppSeed]                  = useState<GeneratedAppSeed | null>(null)
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
    setResumeError(null)
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
      setError(t('app.parseError'))
    } finally {
      setIsLoading(false)
    }
  }

  const enterSheet = (sheet: SheetData) => {
    setActiveSheetName(sheet.name)
    setActiveTableId(sheet.tables[0]?.id ?? null)
    setFocusedColumn(null)
  }

  const handleResumeSession = async (sessionId: string) => {
    setIsResuming(true)
    setResumeError(null)
    setError(null)

    try {
      const response = await fetch(`http://localhost:8000/sessions/${encodeURIComponent(sessionId)}`)
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail ?? t('app.sessionLoadError'))
      }

      const restored = restoreSession(data as SessionApiResponse, t('app.sessionNoSchema'))
      const [sheet] = restored.sheets
      setSheets(restored.sheets)
      setSelectedNames([sheet.name])
      enterSheet(sheet)
      setAnswers({})
      setUiProposals([])
      setSelectedProposalId(null)
      setAppSeed(restored.seed)
      setTheme(restored.theme)
      setStep('app')
    } catch (resumeFailure) {
      setResumeError(
        resumeFailure instanceof Error
          ? resumeFailure.message
          : t('app.sessionLoadError')
      )
    } finally {
      setIsResuming(false)
    }
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
              col.foreignKey && col.foreignKey.refTable === oldName
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

  const toggleAllSheets = () => {
    setSelectedNames((prev) => (prev.length === sheets.length ? [] : sheets.map((s) => s.name)))
  }

  const confirmSelection = () => {
    const firstSelected = sheets.find((s) => selectedSheetNames.includes(s.name))
    if (firstSelected) enterSheet(firstSelected)
    setStep('config')
  }

  // Colonnes/lignes réellement envoyées (colonnes exclues retirées, index alignés)
  const getIncludedTableData = (t: TableConfig) => {
    const includedIdx = t.columns.map((_, i) => i).filter((i) => !t.columns[i].excluded)
    const columns = includedIdx.map((i) => t.columns[i])
    const rows    = t.rows.map((row) => includedIdx.map((i) => row[i]))
    return { columns, rows }
  }

  // La détection choisit le modèle de données. Le questionnaire choisit ensuite
  // une vue parmi les quatre rendus que les composants savent tous afficher.
  // Archétype final d'une table : détection auto affinée par le profil de
  // préférences (question "identity"), jamais la détection auto seule.
  const computeFinalArchetype = (
    analyzed: AnalyzedColumn[],
    tableName: string,
    profile: PreferenceProfile,
  ): TableArchetype => {
    const archetypeScores = computeArchetypeScores(analyzed, tableName)
    const detected = detectArchetype(analyzed, tableName)
    const preset = ARCHETYPE_PRESETS[detected]
    const availableLayouts: LayoutKind[] = ['table', 'cards', 'dashboard', 'gallery']
    const auto: AutoDetectedTablePreset = { archetypeScores, availableLayouts, defaultLayout: preset.defaultLayout }
    return computeTablePreset(auto, profile).archetype
  }

  const buildInitialOverrides = (tablesToSeed: TableConfig[], profile: PreferenceProfile) => {
    const archetypeOverrides: Record<string, TableArchetype> = {}
    const layoutOverrides: Record<string, LayoutKind> = {}
    for (const t of tablesToSeed) {
      const { columns, rows } = getIncludedTableData(t)
      const analyzed = analyzeColumns(columns, rows)
      const archetypeScores = computeArchetypeScores(analyzed, t.tableName)
      const detected = detectArchetype(analyzed, t.tableName)
      const preset = ARCHETYPE_PRESETS[detected]
      const availableLayouts: LayoutKind[] = ['table', 'cards', 'dashboard', 'gallery']
      const auto: AutoDetectedTablePreset = { archetypeScores, availableLayouts, defaultLayout: preset.defaultLayout }
      const final = computeTablePreset(auto, profile)
      archetypeOverrides[t.id] = final.archetype
      layoutOverrides[t.id] = final.layout
    }
    return { archetypeOverrides, layoutOverrides }
  }

  const handleAnswer = (answer: QuestionAnswer) => {
    setAnswers((prev) => ({ ...prev, [answer.questionId]: answer }))
  }

  const getValidAnswers = (): QuestionAnswer[] => questionBank.flatMap((question) => {
    const answer = answers[question.id]
    return answer && question.options.some((option) => option.id === answer.optionId)
      ? [answer]
      : []
  })

  const handleReviewProposals = () => {
    const profile = buildPreferenceProfile(getValidAnswers(), theme)
    const primaryTable = questionnaireTables.find((table) => table.tableName === profile.primaryTableHint)
      ?? questionnaireTables[0]
    const archetype = primaryTable
      ? computeFinalArchetype(primaryTable.analyzed, primaryTable.tableName, profile)
      : 'generic'
    setUiProposals(buildUiProposals(profile, { hasImages, hasMeaningfulChart, archetype }, t))
    setSelectedProposalId(null)
    setCreateError(null)
    setStep('proposals')
  }

  const buildTablesPayload = () => ({
    tables: allTables.map((t) => {
      const { columns, rows } = getIncludedTableData(t)
      return {
        tableName: t.tableName,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          isPrimaryKey: c.isPrimaryKey,
          ...(c.foreignKey && c.foreignKeyConfirmed ? { foreignKey: c.foreignKey } : {}),
        })),
        rows,
      }
    }),
  })

  // Étape « Vérifier » : crée réellement la base, puis affiche l'écran de succès.
  const handleCreateDatabase = async () => {
    setIsCreating(true)
    setCreateError(null)
    try {
      const response = await fetch('http://localhost:8000/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTablesPayload()),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.detail ?? t('app.createErrorUnknown'))
      setCreatedTables(data.created ?? [])
      setStep('created')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('app.createError'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWebApp = async () => {
    const selectedProposal = uiProposals.find((proposal) => proposal.id === selectedProposalId)
    if (!selectedProposal) return

    setIsCreating(true)
    setCreateError(null)

    const payload = buildTablesPayload()

    const profile = buildPreferenceProfile(getValidAnswers(), theme)
    const { archetypeOverrides } = buildInitialOverrides(allTables, profile)
    const layoutOverrides = Object.fromEntries(
      allTables.map((table) => [table.id, selectedProposal.config.layout]),
    ) as Record<string, LayoutKind>
    const {
      showChart: showChartWidget,
      showStats: showStatsWidget,
      chartPreference,
      canEdit,
      density,
      navigation,
      searchEnabled,
      sortMode,
      exportMode,
      theme: selectedTheme,
    } = selectedProposal.config
    const primaryTableId = profile.primaryTableHint
      ? allTables.find((t) => t.tableName === profile.primaryTableHint)?.id ?? null
      : null

    try {
      let newSessionId: string | null = null
      try {
        const sessionRes = await fetch('http://localhost:8000/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dbSchema: payload,
            preset: {
              archetypeOverrides,
              layoutOverrides,
              showChartWidget,
              showStatsWidget,
              chartPreference,
              canEdit,
              density,
              navigation,
              searchEnabled,
              sortMode,
              exportMode,
              theme: selectedTheme,
              primaryTableId,
            },
          }),
        })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          newSessionId = sessionData.id ?? null
        }
      } catch {
        // La sauvegarde de session est secondaire : son échec ne bloque pas l'ouverture de la webapp.
      }

      setAppSeed({
        archetypeOverrides,
        layoutOverrides,
        primaryTableId,
        showChartWidget,
        showStatsWidget,
        chartPreference,
        canEdit,
        density,
        navigation,
        searchEnabled,
        sortMode,
        exportMode,
        sessionId: newSessionId,
      })
      setTheme(selectedTheme)
      setStep('done')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('app.createError'))
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
    setResumeError(null)
    setAnswers({})
    setQuestionnaireIndex(0)
    setUiProposals([])
    setSelectedProposalId(null)
    setAppSeed(null)
    setStep('upload')
  }

  const showSelect      = sheets.length > 1
  const selectedSheets  = sheets.filter((s) => selectedSheetNames.includes(s.name))
  const allTables       = selectedSheets.flatMap((s) => s.tables)
  const activeSheet     = selectedSheets.find((s) => s.name === activeSheetName) ?? selectedSheets[0] ?? null
  const activeTable     = activeSheet?.tables.find((t) => t.id === activeTableId) ?? activeSheet?.tables[0] ?? null
  const missingKeyCount = allTables.filter((t) => !t.columns.some((c) => c.isPrimaryKey && !c.excluded)).length

  const confirmedLinks = allTables.flatMap((t) =>
    t.columns
      .filter((c) => c.foreignKey && c.foreignKeyConfirmed)
      .map((c) => ({
        fromTable: t.tableName, fromCol: c.name,
        toTable: c.foreignKey!.refTable, toCol: c.foreignKey!.refColumn,
      }))
  )

  // Références détectées mais pas encore acceptées/refusées : elles seraient
  // perdues à la création si l'utilisateur ne les traite pas.
  const colIsPending    = (c: ColumnConfig) => Boolean(c.foreignKey) && !c.foreignKeyConfirmed && !c.foreignKeyRefused
  const tableHasPending = (t: TableConfig) => t.columns.some(colIsPending)
  const pendingLinks = allTables.flatMap((t) =>
    t.columns.filter(colIsPending).map((c) => ({
      fromTable: t.tableName, fromCol: c.name,
      toTable: c.foreignKey!.refTable, toCol: c.foreignKey!.refColumn,
    }))
  )
  const confirmAllPendingLinks = () => {
    setSheets((prev) => prev.map((sheet) => ({
      ...sheet,
      tables: sheet.tables.map((t) => ({
        ...t,
        columns: t.columns.map((c) =>
          colIsPending(c) ? { ...c, foreignKeyConfirmed: true } : c
        ),
      })),
    })))
  }

  const questionnaireTables = allTables.map((table) => {
    const { columns, rows } = getIncludedTableData(table)
    return {
      tableName: table.tableName,
      rowCount: rows.length,
      analyzed: analyzeColumns(columns, rows),
    }
  })
  const proposalPreviewTable = allTables.find(
    (table) => table.tableName === answers['primary-table']?.delta.primaryTableName
  ) ?? allTables[0]
  // hasImages/hasMeaningfulChart portent sur la table réellement prévisualisée
  // (pas « n'importe quelle table du classeur ») pour que les questions et
  // l'aperçu en direct restent cohérents avec ce que l'utilisateur voit.
  const previewAnalyzed = questionnaireTables.find(
    (table) => table.tableName === proposalPreviewTable?.tableName
  )?.analyzed ?? questionnaireTables[0]?.analyzed ?? []
  const hasImages = previewAnalyzed.some((column) => column.role === 'image')
  const hasMeaningfulChart = findChartRecommendation(previewAnalyzed) !== null
  const questionBank = buildQuestionBank({
    tables: questionnaireTables,
    hasImages,
    hasMeaningfulChart,
    answers,
  }, t)

  // Aperçu en direct des 3 propositions, recalculé à chaque réponse (pas besoin
  // d'atteindre la fin du questionnaire pour les voir).
  const liveProfile = buildPreferenceProfile(getValidAnswers(), theme)
  const livePrimaryTable = questionnaireTables.find((table) => table.tableName === liveProfile.primaryTableHint)
    ?? questionnaireTables[0]
  const liveArchetype = livePrimaryTable
    ? computeFinalArchetype(livePrimaryTable.analyzed, livePrimaryTable.tableName, liveProfile)
    : 'generic'
  const liveProposals = proposalPreviewTable
    ? buildUiProposals(liveProfile, { hasImages, hasMeaningfulChart, archetype: liveArchetype }, t)
    : []

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

  const indicatorSteps = showSelect
    ? [
        { key: 'upload', label: t('step.import')    },
        { key: 'select', label: t('step.sheets')    },
        { key: 'config', label: t('step.verify')    },
        { key: 'questionnaire', label: t('step.customize') },
        { key: 'proposals', label: t('step.choose') },
      ]
    : [
        { key: 'upload', label: t('step.import')    },
        { key: 'config', label: t('step.verify')    },
        { key: 'questionnaire', label: t('step.customize') },
        { key: 'proposals', label: t('step.choose') },
      ]

  if (step === 'landing') {
    return (
      <Landing
        onStart={() => setStep('upload')}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    )
  }

  return (
    <div className="app-shell">

      <header className="app-header">
        <button className="app-header-logo" onClick={() => setStep('landing')}>Excelium</button>
        <span className="app-header-sep">|</span>
        <span className="app-header-tagline">{t('header.tagline')}</span>
        <button
          className="app-theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? t('header.toLight') : t('header.toDark')}
        >
          {theme === 'dark' ? t('header.themeDark') : t('header.themeLight')}
        </button>
        <div className="app-lang" role="group" aria-label="Language">
          <button
            className={`app-lang-opt${lang === 'fr' ? ' active' : ''}`}
            onClick={() => setLang('fr')}
          >
            FR
          </button>
          <span className="app-lang-sep">|</span>
          <button
            className={`app-lang-opt${lang === 'en' ? ' active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
      </header>

      <main className="app-main">

        {step !== 'app' && (
          <StepIndicator
            steps={indicatorSteps}
            currentKey={
              step === 'done' ? 'proposals'
                : step === 'confirm' ? 'config'
                : step === 'created' ? 'questionnaire'
                : step
            }
          />
        )}

        {/* Étape 1 : Importer */}
        {step === 'upload' && (
          <div className="upload-section">
            <h1 className="upload-title">{t('upload.title')}</h1>
            <p className="upload-desc">{t('upload.desc')}</p>
            <DropZone onFileSelected={handleFileSelected} />
            {isLoading && <p className="upload-loading">{t('upload.loading')}</p>}
            {error    && <p className="upload-error">{error}</p>}
            <SessionResume
              onResume={handleResumeSession}
              isLoading={isResuming}
              error={resumeError}
            />
          </div>
        )}

        {/* Étape 2 : Sélection des feuilles */}
        {step === 'select' && (
          <StepSheetSelector
            sheets={sheets}
            selected={selectedSheetNames}
            onToggle={toggleSheet}
            onToggleAll={toggleAllSheets}
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
                    {sheet.tables.some(tableHasPending) && <span className="pending-dot" title={t('modal.pendingTitle')} />}
                  </button>
                ))}
              </div>
            )}

            {selectedSheets.length === 1 && activeSheet.tables.length > 1 && (
              <p className="config-sheet-label">
                {t('config.sheetLabel')}{' '}
                <strong>{activeSheet.name}</strong>
              </p>
            )}

            {activeSheet.tables.length > 1 && (
              <div className="config-table-selector">
                <span className="config-table-label">{t('config.tableLabel')}</span>
                {activeSheet.tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => { setActiveTableId(table.id); setFocusedColumn(null) }}
                    className={`config-pill${table.id === activeTable.id ? ' active' : ''}`}
                  >
                    {table.tableName}
                    {tableHasPending(table) && <span className="pending-dot" title={t('modal.pendingTitle')} />}
                  </button>
                ))}
              </div>
            )}

            <SplitView
              left={
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="section-label mb6">{t('config.tableNameLabel')}</label>
                    <input
                      type="text"
                      value={activeTable.tableName}
                      onChange={(e) => updateTable({ ...activeTable, tableName: e.target.value })}
                      style={{ width: '100%', maxWidth: '360px' }}
                    />
                  </div>
                  <TablePreview
                    columns={activeTable.columns}
                    rows={activeTable.rows}
                    focusedColumn={focusedColumn}
                    onTypeChange={(originalName, newType) => {
                      updateTable({
                        ...activeTable,
                        columns: activeTable.columns.map((c) =>
                          c.originalName === originalName ? { ...c, type: newType } : c
                        ),
                      })
                    }}
                    onNameChange={(originalName, newName) => {
                      updateTable({
                        ...activeTable,
                        columns: activeTable.columns.map((c) =>
                          c.originalName === originalName ? { ...c, name: newName } : c
                        ),
                      })
                    }}
                    onFocusColumn={setFocusedColumn}
                  />
                </>
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
                ← {t('common.back')}
              </button>

              <div className="config-nav-right">
                {missingKeyCount > 0 && (
                  <span className="config-nav-warn">
                    {missingKeyCount} {t('config.missingKey', { count: missingKeyCount })}
                  </span>
                )}
                {pendingLinks.length > 0 && (
                  <span className="config-nav-warn">
                    {pendingLinks.length} {t('config.pendingRefs', { count: pendingLinks.length })}
                  </span>
                )}
                {duplicateNames.length > 0 && (
                  <span className="config-nav-error">
                    {t('config.dupTables')} {[...new Set(duplicateNames)].join(', ')}
                  </span>
                )}
                {emptyTableName    && <span className="config-nav-error">{t('config.emptyTableName')}</span>}
                {emptyColName      && <span className="config-nav-error">{t('config.emptyColName')}</span>}
                {hasDuplicateColNames && <span className="config-nav-error">{t('config.dupCols')}</span>}

                <button
                  className="btn-primary"
                  onClick={() => { if (pendingLinks.length > 0) setShowPendingModal(true); else setStep('confirm') }}
                  disabled={!canProceed}
                >
                  {t('common.continue')} →
                </button>
              </div>
            </div>

            {showPendingModal && (
              <div className="modal-overlay" onClick={() => setShowPendingModal(false)}>
                <div className="confirm-modal pending-modal" onClick={(e) => e.stopPropagation()}>
                  <p className="confirm-modal-title">{t('modal.pendingTitle')}</p>
                  <p className="confirm-modal-msg">
                    {t('modal.pendingBody', { n: pendingLinks.length, count: pendingLinks.length })}
                  </p>
                  <div className="pending-links-list">
                    {pendingLinks.map((lk, i) => (
                      <div key={i} className="pending-link-row">
                        <span className="pending-link-from">{lk.fromTable}.{lk.fromCol}</span>
                        <span className="pending-link-arrow">→</span>
                        <span className="pending-link-to">{lk.toTable}.{lk.toCol}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pending-modal-actions">
                    <button className="confirm-btn-cancel" onClick={() => setShowPendingModal(false)}>{t('modal.pendingBack')}</button>
                    <button className="btn btn-secondary" onClick={() => { setShowPendingModal(false); setStep('confirm') }}>{t('modal.pendingIgnore')}</button>
                    <button className="btn-primary" onClick={() => { confirmAllPendingLinks(); setShowPendingModal(false); setStep('confirm') }}>{t('modal.pendingAccept')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Étape 4 : Récapitulatif */}
        {step === 'confirm' && (
          <StepTableConfirmation
            tables={allTables}
            onBack={() => setStep('config')}
            onNext={handleCreateDatabase}
            isCreating={isCreating}
            error={createError}
          />
        )}

        {/* Étape 5 : Questionnaire de personnalisation */}
        {step === 'questionnaire' && (
          <StepQuestionnaire
            questions={questionBank}
            answers={answers}
            onAnswer={handleAnswer}
            onBack={() => setStep('created')}
            onCreateWebApp={handleReviewProposals}
            isCreating={isCreating}
            error={createError}
            liveProposals={liveProposals}
            previewTable={proposalPreviewTable ?? null}
            index={questionnaireIndex}
            onIndexChange={setQuestionnaireIndex}
          />
        )}

        {/* Étape 6 : Choix de la proposition */}
        {step === 'proposals' && uiProposals.length > 0 && proposalPreviewTable && (
          <StepUiProposals
            proposals={uiProposals}
            table={proposalPreviewTable}
            selectedId={selectedProposalId}
            onSelect={setSelectedProposalId}
            onBack={() => setStep('questionnaire')}
            onConfirm={handleCreateWebApp}
            isCreating={isCreating}
            error={createError}
          />
        )}

        {/* Base créée : succès juste après la création (avant la personnalisation) */}
        {step === 'created' && (
          <div className="done-section">
            <div className="done-header">
              <div className="done-check">✓</div>
              <h1 className="done-title">{t('done.createdTitle')}</h1>
              <p className="done-subtitle">
                {createdTables.length} {t('word.table', { count: createdTables.length })} {t('done.createdOk', { count: createdTables.length })}
                {confirmedLinks.length > 0 && (
                  <> · <span className="done-green">{confirmedLinks.length} {t('word.link', { count: confirmedLinks.length })} {t('recap.betweenSheets')}</span></>
                )}
              </p>
            </div>

            <div className="done-tables-card">
              <div className="done-tables-head">{t('done.tablesHead')}</div>
              {createdTables.map((ct) => {
                const tableConfig = allTables.find((at) => at.tableName === ct.table || at.tableName.toLowerCase().replace(/[^a-z0-9]/g, '_') === ct.table)
                const pk     = tableConfig?.columns.find((c) => c.isPrimaryKey)
                const fkCols = tableConfig?.columns.filter((c) => c.foreignKey && c.foreignKeyConfirmed) ?? []
                return (
                  <div key={ct.table} className="done-table-row">
                    <div className="done-table-row-header">
                      <span className="done-table-name">{ct.table}</span>
                      <span className="done-table-meta">{ct.rows} {t('word.row', { count: ct.rows })}</span>
                    </div>
                    <div className="done-badges">
                      {pk && <span className="done-badge-pk">{t('common.identifier')}: {pk.name}</span>}
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

            <div className="done-actions">
              <button className="btn btn-secondary" onClick={() => setStep('confirm')}>← {t('common.back')}</button>
              <button className="btn-primary" onClick={() => setStep('questionnaire')}>{t('done.customizeApp')} →</button>
              <button className="btn btn-secondary" onClick={resetAll}>{t('common.importAnother')}</button>
            </div>
          </div>
        )}

        {/* Application prête : après la personnalisation */}
        {step === 'done' && (
          <div className="done-section">
            <div className="done-header">
              <div className="done-check">✓</div>
              <h1 className="done-title">{t('done.readyTitle')}</h1>
              <p className="done-subtitle">{t('done.readyDesc')}</p>
            </div>

            {/* Code de session pour reprendre plus tard */}
            {appSeed?.sessionId && (
              <div className="session-save-box">
                <div className="session-code-display">
                  <span className="session-code-label">{t('done.sessionLabel')}</span>
                  <span className="session-code">{appSeed.sessionId}</span>
                  <span className="session-code-hint">{t('done.sessionHint')}</span>
                </div>
              </div>
            )}

            <div className="done-actions">
              <button className="btn btn-secondary" onClick={() => setStep('proposals')}>← {t('common.back')}</button>
              <button className="btn-primary" onClick={() => setStep('app')}>{t('done.openApp')} →</button>
              <button className="btn btn-secondary" onClick={resetAll}>{t('common.importAnother')}</button>
            </div>
          </div>
        )}

        {step === 'app' && appSeed && (
          <GeneratedApp
            tables={allTables}
            onBack={() => setStep('done')}
            initialArchetypeOverrides={appSeed.archetypeOverrides}
            initialLayoutOverrides={appSeed.layoutOverrides}
            initialActiveTableId={appSeed.primaryTableId}
            showChartWidget={appSeed.showChartWidget}
            showStatsWidget={appSeed.showStatsWidget}
            chartPreference={appSeed.chartPreference}
            canEdit={appSeed.canEdit}
            density={appSeed.density}
            navigation={appSeed.navigation}
            searchEnabled={appSeed.searchEnabled}
            sortMode={appSeed.sortMode}
            exportMode={appSeed.exportMode}
            sessionId={appSeed.sessionId}
          />
        )}

      </main>
    </div>
  )
}

export default App
