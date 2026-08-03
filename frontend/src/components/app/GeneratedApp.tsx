import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TableConfig } from '../../App'
import { analyzeColumns, suggestLayouts } from '../../lib/semantic'
import type { LayoutKind } from '../../lib/semantic'
import { ARCHETYPE_PRESETS, detectArchetype } from '../../lib/archetype'
import type { TableArchetype } from '../../lib/archetype'
import type { ChartPreference, DisplayDensity, ExportMode, NavigationMode, SortMode } from '../../lib/preferenceEngine'
import TableView from './TableView'
import GalleryView from './GalleryView'
import DashboardView from './DashboardView'
import CardListView from './CardListView'
import DetailPanel from './DetailPanel'
import RowForm from './RowForm'
import ImpactModal from './ImpactModal'
import type { Reference } from './ImpactModal'
import SchemaView from './SchemaView'
import RowDependencyGraph from './RowDependencyGraph'
import ConfirmModal from './ConfirmModal'
import { useI18n } from '../../lib/i18n'

const API = 'http://localhost:8000'

interface Props {
  tables: TableConfig[]
  onBack?: () => void
  onNewImport?: () => void
  initialArchetypeOverrides: Record<string, TableArchetype>
  initialLayoutOverrides: Record<string, LayoutKind>
  initialActiveTableId: string | null
  showChartWidget: boolean
  showStatsWidget: boolean
  chartPreference?: ChartPreference
  chartMetric?: string
  chartDimension?: string
  canEdit: boolean
  density: DisplayDensity
  navigation: NavigationMode
  searchEnabled: boolean
  sortMode: SortMode
  exportMode: ExportMode
  sessionId: string | null
}
type FormMode = 'create' | 'edit' | null

interface PendingOp {
  type: 'delete' | 'update-pk'
  row: Record<string, unknown>
  formData?: Record<string, unknown>
}

function GeneratedApp({
  tables, onBack, onNewImport,
  initialArchetypeOverrides, initialLayoutOverrides, initialActiveTableId,
  showChartWidget, showStatsWidget, chartPreference, chartMetric, chartDimension, canEdit, density,
  navigation, searchEnabled, sortMode, sessionId,
}: Props) {
  const { t } = useI18n()
  const initialTabIndex = initialActiveTableId
    ? Math.max(0, tables.findIndex((t) => t.id === initialActiveTableId))
    : 0
  // Onglet actif : index de table, ou 'schema' pour le schéma de dépendances
  const [activeTab, setActiveTab] = useState<number | 'schema'>(initialTabIndex)
  const activeIndex = typeof activeTab === 'number' ? activeTab : 0
  // Vue choisie manuellement par table, en plus de la suggestion du questionnaire :
  // celle-ci reste toujours modifiable après génération (cf. layout-toggle).
  const [layoutOverride, setLayoutOverride] = useState<Record<string, LayoutKind>>({})
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [liveRows, setLiveRows]       = useState<Record<string, unknown>[]>([])
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formMode, setFormMode]       = useState<FormMode>(null)
  const [editingRow, setEditingRow]   = useState<Record<string, unknown> | null>(null)
  // Impact analysis state
  const [impactRefs, setImpactRefs]   = useState<Reference[]>([])
  const [pendingOp, setPendingOp]     = useState<PendingOp | null>(null)
  const [depRow, setDepRow]           = useState<Record<string, unknown> | null>(null)
  const [depRowIndex, setDepRowIndex] = useState<number | null>(null)
  const [confirmPending, setConfirmPending] = useState<(() => void) | null>(null)

  const active       = tables[activeIndex]
  const includedCols = useMemo(() => active.columns.filter((c) => !c.excluded), [active.columns])
  const pkCol        = includedCols.find((c) => c.isPrimaryKey)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API}/tables/${active.tableName}/rows`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLiveRows(data.rows ?? [])
    } catch {
      setFetchError(t('app.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [active.tableName])

  useEffect(() => {
    let cancelled = false

    fetch(`${API}/tables/${active.tableName}/rows`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setLiveRows(data.rows ?? [])
      })
      .catch(() => {
        if (!cancelled) setFetchError(t('app.fetchError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [active.tableName])

  // ── Impact check ─────────────────────────────────────────────────────────────
  const checkReferences = async (pkValue: unknown): Promise<Reference[]> => {
    const res = await fetch(`${API}/tables/${active.tableName}/rows/${pkValue}/references`)
    if (!res.ok) return []
    const data = await res.json()
    return data.references ?? []
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleCreate = async (formData: Record<string, unknown>) => {
    const res = await fetch(`${API}/tables/${active.tableName}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? t('app.errCreate')) }
    setFormMode(null)
    fetchRows()
  }

  const handleUpdate = async (formData: Record<string, unknown>) => {
    if (!pkCol || !editingRow) return
    const oldPkValue = editingRow[pkCol.name]
    const newPkValue = formData[pkCol.name]
    const body       = { ...formData }
    delete body[pkCol.name]

    // Check if PK value changed
    if (newPkValue !== undefined && String(newPkValue) !== String(oldPkValue)) {
      const refs = await checkReferences(oldPkValue)
      if (refs.length > 0) {
        setImpactRefs(refs)
        setPendingOp({ type: 'update-pk', row: editingRow, formData })
        return
      }
    }

    await doUpdate(oldPkValue, body)
  }

  const doUpdate = async (pkValue: unknown, body: Record<string, unknown>) => {
    const res = await fetch(`${API}/tables/${active.tableName}/rows/${pkValue}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? t('app.errUpdate')) }
    setFormMode(null)
    setEditingRow(null)
    setPendingOp(null)
    setImpactRefs([])
    fetchRows()
  }

  // Initiate delete: check references first, fall back to direct confirm on error
  const handleDeleteIntent = async (row: Record<string, unknown>) => {
    if (!pkCol) return
    const pkValue = row[pkCol.name]
    let refs: Reference[] = []
    try {
      refs = await checkReferences(pkValue)
    } catch {
      // references endpoint unavailable — fall through to direct delete
    }
    if (refs.length > 0) {
      setImpactRefs(refs)
      setPendingOp({ type: 'delete', row })
    } else {
      setConfirmPending(() => async () => {
        setConfirmPending(null)
        await doDelete(pkValue, false)
      })
      return
    }
  }

  const doDelete = async (pkValue: unknown, cascade: boolean) => {
    const url = `${API}/tables/${active.tableName}/rows/${pkValue}${cascade ? '?cascade=true' : ''}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      setFetchError(err.detail ?? t('app.errDelete'))
    }
    setSelectedRow(null)
    setPendingOp(null)
    setImpactRefs([])
    fetchRows()
  }

  // Impact modal callbacks
  const onImpactCancel = () => { setPendingOp(null); setImpactRefs([]) }

  const onImpactCascade = async () => {
    if (!pendingOp || !pkCol) return
    const pkValue = pendingOp.row[pkCol.name]
    await doDelete(pkValue, true)
  }

  const onImpactForce = async () => {
    if (!pendingOp || !pkCol) return
    if (pendingOp.type === 'delete') {
      await doDelete(pendingOp.row[pkCol.name], false)
    } else if (pendingOp.type === 'update-pk' && pendingOp.formData) {
      const body = { ...pendingOp.formData }
      delete body[pkCol.name]
      await doUpdate(pendingOp.row[pkCol.name], body)
    }
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditingRow(row)
    setFormMode('edit')
    setSelectedRow(null)
  }

  // ── Derived display data ──────────────────────────────────────────────────────
  const sourceRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('fr')
    if (!searchEnabled || !normalizedQuery) return liveRows
    return liveRows.filter((row) =>
      includedCols.some((column) =>
        String(row[column.name] ?? '').toLocaleLowerCase('fr').includes(normalizedQuery)
      )
    )
  }, [includedCols, liveRows, searchEnabled, searchQuery])
  const rowArrays = useMemo(
    () => sourceRows.map((row) => includedCols.map((c) => row[c.name])),
    [sourceRows, includedCols],
  )
  const analyzed = useMemo(() => analyzeColumns(includedCols, rowArrays), [includedCols, rowArrays])

  // Archétype : détection automatique affinée par les réponses du questionnaire.
  const detected  = useMemo(() => detectArchetype(analyzed, active.tableName), [analyzed, active.tableName])
  const archetype = initialArchetypeOverrides[active.id] ?? detected
  const preset    = ARCHETYPE_PRESETS[archetype]

  // Layouts : suggérés par le contenu + apportés par le template (sans doublon)
  const layouts = useMemo(() => {
    const suggested = suggestLayouts(analyzed)
    const preferred = initialLayoutOverrides[active.id]
    return [...new Set([...suggested, ...preset.extraLayouts, ...(preferred ? [preferred] : [])])]
  }, [active.id, analyzed, initialLayoutOverrides, preset])

  // Priorité : choix manuel fait dans l'app générée > suggestion du questionnaire > défaut de l'archétype.
  const chosenLayout = layoutOverride[active.id] ?? initialLayoutOverrides[active.id]
  const effectiveLayout = chosenLayout && layouts.includes(chosenLayout)
    ? chosenLayout
    : layouts.includes(preset.defaultLayout) ? preset.defaultLayout : layouts[0]

  // Le tri choisi reste un ordre d'indices afin de conserver la correspondance CRUD.
  const displayOrder = useMemo(
    () => {
      const indices = rowArrays.map((_, index) => index)
      if (sortMode === 'source') return indices
      const sortColumn = analyzed.find((column) => column.role === 'title')
        ?? analyzed.find((column) => column.role === 'text' || column.role === 'category')
        ?? analyzed[0]
      if (!sortColumn) return indices
      return indices.sort((left, right) =>
        String(rowArrays[left][sortColumn.index] ?? '').localeCompare(
          String(rowArrays[right][sortColumn.index] ?? ''),
          'fr',
          { sensitivity: 'base' },
        )
      )
    },
    [rowArrays, analyzed, sortMode],
  )
  const displayRows = useMemo(
    () => displayOrder.map((i) => rowArrays[i]),
    [displayOrder, rowArrays],
  )
  // Ligne d'origine (objet API) correspondant à une position affichée
  const liveRowAt = (ri: number) => sourceRows[displayOrder[ri]]

  const selectTable = (i: number) => {
    if (activeTab === i) return
    setLoading(true)
    setFetchError(null)
    setSearchQuery('')
    setActiveTab(i)
    setSelectedRow(null)
    setFormMode(null)
  }

  return (
    <div className={`generated-app density-${density} navigation-${navigation}`}>
      {navigation === 'sidebar' && (
        <nav className="gen-side-nav" aria-label="Tables">
          <span className="gen-side-title">{t('done.tablesHead')}</span>
          {tables.map((table, index) => (
            <button
              key={table.id}
              onClick={() => selectTable(index)}
              className={`gen-side-link${activeTab === index ? ' active' : ''}`}
            >
              {table.tableName}
            </button>
          ))}
          <button
            onClick={() => { setActiveTab('schema'); setSelectedRow(null); setFormMode(null) }}
            className={`gen-side-link${activeTab === 'schema' ? ' active' : ''}`}
          >
            {t('app.schema')}
          </button>
        </nav>
      )}

      {/* Toolbar : tables + exports */}
      <div className={`gen-toolbar${navigation === 'sidebar' ? ' without-tabs' : ''}`}>
        {navigation === 'tabs' && (
          <div className="gen-tabs">
            {tables.map((t, i) => (
              <button
                key={t.id}
                onClick={() => selectTable(i)}
                className={`gen-tab${activeTab === i ? ' active' : ''}`}
              >
                {t.tableName}
              </button>
            ))}
            <button
              onClick={() => { setActiveTab('schema'); setSelectedRow(null); setFormMode(null) }}
              className={`gen-tab${activeTab === 'schema' ? ' active' : ''}`}
            >
              {t('app.schema')}
            </button>
          </div>
        )}
        <div className="export-btns">
          {sessionId && (
            <button
              type="button"
              className="session-badge"
              title={`${t('app.copySession')} ${sessionId}`}
              aria-label={`${t('app.copySession')} ${sessionId}`}
              onClick={() => {
                navigator.clipboard.writeText(sessionId)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {t('app.session')} {sessionId.slice(0, 8)}… {copied ? t('app.copied') : '⧉'}
            </button>
          )}
          {sessionId && (
            <a
              href={`${API}/export/webapp-zip/${sessionId}`}
              download={`webapp-${sessionId.slice(0, 8)}.zip`}
              className="export-btn export-btn-zip"
            >
              ↓ {t('app.downloadZip')}
            </a>
          )}
        </div>
      </div>

      {activeTab === 'schema' && (
        <SchemaView tables={tables} />
      )}

      {activeTab !== 'schema' && (
      <>
      {/* En-tête table active */}
      <div className="gen-header">
        <div>
          <h1 className="gen-title">{active.tableName}</h1>
          <p className="gen-count">
            {loading
              ? t('app.loading')
              : searchQuery.trim()
                ? t('app.resultsOf', { n: sourceRows.length, total: liveRows.length, count: sourceRows.length })
                : `${liveRows.length} ${t('app.records', { count: liveRows.length })}`}
            {!loading && detected !== 'generic' && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· {t('app.detected')} {t(`archetype.${detected}`)}
              </span>
            )}
          </p>
        </div>
        <div className="gen-controls">
          {searchEnabled && (
            <label className="gen-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('app.searchPlaceholder')}
                aria-label={t('app.searchIn', { table: active.tableName })}
              />
            </label>
          )}
          {layouts.length > 1 ? (
            <div className="layout-toggle" role="group" aria-label={t('app.layout.switchAria')}>
              {layouts.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`layout-btn${effectiveLayout === l ? ' active' : ''}`}
                  aria-pressed={effectiveLayout === l}
                  onClick={() => setLayoutOverride((prev) => ({ ...prev, [active.id]: l }))}
                >
                  {t(`app.layout.${l}`)}
                </button>
              ))}
            </div>
          ) : (
            <span className="gen-mode-badge">{t(`app.layout.${effectiveLayout}`)}</span>
          )}
          <span className="gen-mode-badge">{canEdit ? t('app.editMode') : t('app.readOnly')}</span>
          {canEdit && (
            <button className="add-btn" onClick={() => { setFormMode('create'); setEditingRow(null) }}>
              + {t('app.add')}
            </button>
          )}
        </div>
      </div>

      {fetchError && <div className="fetch-error">{fetchError}</div>}

      {!loading && !fetchError && (
        <>
          {effectiveLayout !== 'dashboard' && (showStatsWidget || showChartWidget) && (
            <div className="gen-insights">
              <DashboardView
                columns={analyzed}
                rows={displayRows}
                showChart={showChartWidget}
                showStats={showStatsWidget}
                chartPreference={chartPreference}
                chartMetric={chartMetric}
                chartDimension={chartDimension}
              />
            </div>
          )}
          {effectiveLayout === 'table'     && <TableView
            columns={analyzed} rows={displayRows}
            onRowClick={setSelectedRow}
            onEdit={canEdit ? (ri) => openEdit(liveRowAt(ri)) : undefined}
            onDelete={canEdit ? (ri) => handleDeleteIntent(liveRowAt(ri)) : undefined}
            onDependency={(ri) => {
              if (depRowIndex === ri) { setDepRow(null); setDepRowIndex(null) }
              else { setDepRow(liveRowAt(ri)); setDepRowIndex(ri) }
            }}
            expandedRowIndex={depRowIndex}
            expandedContent={depRow
              ? <RowDependencyGraph variant="inline" row={depRow} table={active} allTables={tables} onClose={() => { setDepRow(null); setDepRowIndex(null) }} />
              : null}
          />}
          {effectiveLayout === 'gallery'   && <GalleryView columns={analyzed} rows={displayRows} onRowClick={setSelectedRow} />}
          {effectiveLayout === 'cards' && <CardListView
            columns={analyzed} rows={displayRows}
            onRowClick={setSelectedRow}
            onDependency={(ri) => {
              if (depRowIndex === ri) { setDepRow(null); setDepRowIndex(null) }
              else { setDepRow(liveRowAt(ri)); setDepRowIndex(ri) }
            }}
            expandedRowIndex={depRowIndex}
          />}
          {effectiveLayout === 'dashboard' && (
            <DashboardView
              columns={analyzed} rows={displayRows} showChart={showChartWidget} showStats={showStatsWidget}
              chartPreference={chartPreference} chartMetric={chartMetric} chartDimension={chartDimension}
            />
          )}
        </>
      )}
      </>
      )}
      {(onBack || onNewImport) && (
        <div className="app-footer-actions">
          {onBack && <button className="back-btn" onClick={onBack}>← {t('common.back')}</button>}
          {onNewImport && <button className="new-import-btn" onClick={onNewImport}>{t('common.importAnother')}</button>}
        </div>
      )}

      {/* Detail panel */}
      {activeTab !== 'schema' && selectedRow !== null && displayRows[selectedRow] && (
        <DetailPanel
          columns={analyzed}
          row={displayRows[selectedRow]}
          onClose={() => setSelectedRow(null)}
          onEdit={canEdit ? () => openEdit(liveRowAt(selectedRow!)) : undefined}
          onDelete={canEdit ? () => handleDeleteIntent(liveRowAt(selectedRow!)) : undefined}
        />
      )}

      {/* Dependency panel flottant : vue cartes uniquement (la vue table l'affiche
          en ligne, cf. expandedContent ci-dessus). */}
      {depRow && effectiveLayout !== 'table' && (
        <RowDependencyGraph
          row={depRow}
          table={active}
          allTables={tables}
          onClose={() => { setDepRow(null); setDepRowIndex(null) }}
        />
      )}

      {/* Create / edit form */}
      {formMode && (
        <RowForm
          columns={includedCols}
          initialData={editingRow ?? {}}
          mode={formMode}
          onSubmit={formMode === 'create' ? handleCreate : handleUpdate}
          onCancel={() => { setFormMode(null); setEditingRow(null) }}
          existingRows={liveRows}
        />
      )}

      {/* Simple confirm modal (no dependencies) */}
      {confirmPending && (
        <ConfirmModal
          message={t('app.deleteRowConfirm')}
          onConfirm={confirmPending}
          onCancel={() => setConfirmPending(null)}
        />
      )}

      {/* Impact modal */}
      {pendingOp && impactRefs.length > 0 && (
        <ImpactModal
          references={impactRefs}
          action={pendingOp.type}
          onCancel={onImpactCancel}
          onCascade={onImpactCascade}
          onForce={onImpactForce}
        />
      )}
    </div>
  )
}

export default GeneratedApp
