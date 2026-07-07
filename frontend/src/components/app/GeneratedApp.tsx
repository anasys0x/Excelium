import { useEffect, useMemo, useState } from 'react'
import type { TableConfig } from '../../App'
import { analyzeColumns, suggestLayouts } from '../../lib/semantic'
import type { LayoutKind } from '../../lib/semantic'
import TableView from './TableView'
import GalleryView from './GalleryView'
import DashboardView from './DashboardView'
import DetailPanel from './DetailPanel'
import RowForm from './RowForm'
import ImpactModal from './ImpactModal'
import type { Reference } from './ImpactModal'

const API = 'http://localhost:8000'

const LAYOUT_LABELS: Record<LayoutKind, string> = {
  table:     'Table',
  gallery:   'Galerie',
  dashboard: 'Tableau de bord',
}

interface Props { tables: TableConfig[]; onBack: () => void }
type FormMode = 'create' | 'edit' | null

interface PendingOp {
  type: 'delete' | 'update-pk'
  row: Record<string, unknown>
  formData?: Record<string, unknown>
}

function GeneratedApp({ tables, onBack }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [layout, setLayout]           = useState<LayoutKind>('table')
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [liveRows, setLiveRows]       = useState<Record<string, unknown>[]>([])
  const [loading, setLoading]         = useState(false)
  const [fetchError, setFetchError]   = useState<string | null>(null)
  const [formMode, setFormMode]       = useState<FormMode>(null)
  const [editingRow, setEditingRow]   = useState<Record<string, unknown> | null>(null)
  // Impact analysis state
  const [impactRefs, setImpactRefs]   = useState<Reference[]>([])
  const [pendingOp, setPendingOp]     = useState<PendingOp | null>(null)

  const active       = tables[activeIndex]
  const includedCols = active.columns.filter((c) => !c.excluded)
  const pkCol        = includedCols.find((c) => c.isPrimaryKey)
  const tableParam   = tables.map((t) => t.tableName).join(',')

  const fetchRows = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API}/tables/${active.tableName}/rows`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLiveRows(data.rows ?? [])
    } catch {
      setFetchError('Impossible de charger les données. Vérifiez que le backend est lancé.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSelectedRow(null)
    setFormMode(null)
    fetchRows()
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
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? 'Erreur lors de la création.') }
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
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? 'Erreur lors de la modification.') }
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
      if (!window.confirm('Supprimer cette ligne ?')) return
      await doDelete(pkValue, false)
    }
  }

  const doDelete = async (pkValue: unknown, cascade: boolean) => {
    const url = `${API}/tables/${active.tableName}/rows/${pkValue}${cascade ? '?cascade=true' : ''}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      setFetchError(err.detail ?? 'Erreur lors de la suppression.')
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
  const rowArrays = useMemo(
    () => liveRows.map((row) => includedCols.map((c) => row[c.name])),
    [liveRows, active.tableName],
  )
  const analyzed        = useMemo(() => analyzeColumns(includedCols, rowArrays), [active.tableName, liveRows])
  const layouts         = useMemo(() => suggestLayouts(analyzed), [analyzed])
  const effectiveLayout = layouts.includes(layout) ? layout : layouts[0]

  const selectTable = (i: number) => {
    setActiveIndex(i)
    setSelectedRow(null)
    setFormMode(null)
    setLayout('table')
  }

  return (
    <div>
      {/* Toolbar : onglets + exports */}
      <div className="gen-toolbar">
        <div className="gen-tabs">
          {tables.map((t, i) => (
            <button
              key={t.id}
              onClick={() => selectTable(i)}
              className={`gen-tab${i === activeIndex ? ' active' : ''}`}
            >
              {t.tableName}
            </button>
          ))}
        </div>
        <div className="export-btns">
          <a href={`${API}/export/excel?tables=${tableParam}`} download="export.xlsx" className="export-btn export-btn-excel">↓ Excel</a>
          <a href={`${API}/export/sql?tables=${tableParam}`}   download="export.sql"  className="export-btn export-btn-sql">↓ SQL</a>
        </div>
      </div>

      {/* En-tête table active */}
      <div className="gen-header">
        <div>
          <h1 className="gen-title">{active.tableName}</h1>
          <p className="gen-count">
            {loading ? 'Chargement…' : `${liveRows.length} enregistrement${liveRows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="gen-controls">
          {layouts.length > 1 && (
            <div className="layout-toggle">
              {layouts.map((l) => (
                <button key={l} onClick={() => setLayout(l)} className={`layout-btn${effectiveLayout === l ? ' active' : ''}`}>
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>
          )}
          <button className="add-btn" onClick={() => { setFormMode('create'); setEditingRow(null) }}>
            + Ajouter
          </button>
        </div>
      </div>

      {fetchError && <div className="fetch-error">{fetchError}</div>}

      {!loading && !fetchError && (
        <>
          {effectiveLayout === 'table'     && <TableView columns={analyzed} rows={rowArrays} onRowClick={setSelectedRow} onEdit={(ri) => openEdit(liveRows[ri])} onDelete={(ri) => handleDeleteIntent(liveRows[ri])} />}
          {effectiveLayout === 'gallery'   && <GalleryView columns={analyzed} rows={rowArrays} onRowClick={setSelectedRow} />}
          {effectiveLayout === 'dashboard' && <DashboardView columns={analyzed} rows={rowArrays} />}
        </>
      )}

      <button className="back-btn" onClick={onBack}>← Retour</button>

      {/* Detail panel */}
      {selectedRow !== null && liveRows[selectedRow] && (
        <DetailPanel
          columns={analyzed}
          row={rowArrays[selectedRow]}
          onClose={() => setSelectedRow(null)}
          onEdit={() => openEdit(liveRows[selectedRow!])}
          onDelete={() => handleDeleteIntent(liveRows[selectedRow!])}
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
