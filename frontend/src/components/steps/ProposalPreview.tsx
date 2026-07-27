import type { TableConfig } from '../../App'
import type { UiProposal } from '../../lib/uiProposals'
import { analyzeColumns } from '../../lib/semantic'
import MiniChart from './MiniChart'

interface Props {
  proposal: UiProposal
  table: TableConfig
  changedKeys?: Set<string>
}

function hl(changedKeys: Set<string> | undefined, ...keys: string[]): string {
  return changedKeys && keys.some((key) => changedKeys.has(key)) ? ' hl-pulse' : ''
}

function valueLabel(value: unknown): string {
  const text = String(value ?? '—')
  return text.length > 16 ? `${text.slice(0, 14)}…` : text
}

function ProposalPreview({ proposal, table, changedKeys }: Props) {
  const columns = table.columns.filter((column) => !column.excluded).slice(0, 3)
  const { config } = proposal
  const firstColumnIndex = columns[0] ? table.columns.indexOf(columns[0]) : 0
  const rows = [...table.rows]
    .sort((left, right) => config.sortMode === 'alphabetical'
      ? String(left[firstColumnIndex] ?? '').localeCompare(String(right[firstColumnIndex] ?? ''), 'fr')
      : 0
    )
    .slice(0, 4)
  const includedIdx = table.columns.map((_, i) => i).filter((i) => !table.columns[i].excluded)
  const includedColumns = includedIdx.map((i) => table.columns[i])
  const includedRows = table.rows.map((row) => includedIdx.map((i) => row[i]))
  const analyzed = analyzeColumns(includedColumns, includedRows)

  return (
    <div
      className={`proposal-preview theme-${config.theme} density-${config.density}${hl(changedKeys, 'theme', 'density')}`}
      aria-hidden="true"
    >
      <div className="proposal-preview-header">
        <span>Excelium</span>
        {config.exportMode !== 'none' && (
          <span className={`proposal-preview-export${hl(changedKeys, 'exportMode')}`}>Exporter</span>
        )}
      </div>
      <div className={`proposal-preview-body nav-${config.navigation}${hl(changedKeys, 'navigation')}`}>
        {config.navigation === 'sidebar' && (
          <div className="proposal-preview-sidebar">
            <strong>{table.tableName}</strong>
          </div>
        )}
        <div className="proposal-preview-content">
          {config.navigation === 'tabs' && (
            <div className="proposal-preview-tabs">
              <strong>{table.tableName}</strong>
            </div>
          )}
          <div className={`proposal-preview-toolbar${hl(changedKeys, 'searchEnabled', 'canEdit')}`}>
            <strong>{table.tableName}</strong>
            <span className="proposal-preview-tools">
              {config.searchEnabled && <span className="proposal-preview-search">Rechercher…</span>}
              {config.canEdit && <span className="proposal-preview-add">+ Ajouter</span>}
            </span>
          </div>

          {config.showStats && (
            <div className={`proposal-preview-stats${hl(changedKeys, 'showStats')}`}>
              <span><small>Enregistrements</small><strong>{table.rows.length}</strong></span>
              <span><small>Colonnes</small><strong>{columns.length}</strong></span>
            </div>
          )}

          {config.showChart && config.layout !== 'dashboard' && (
            <div className={`proposal-preview-chart-line${hl(changedKeys, 'showChart')}`}>
              <MiniChart columns={analyzed} rows={includedRows} preference={config.chartPreference} height={44} />
            </div>
          )}

          {config.layout === 'table' && (
            <div className={`proposal-mini-table${hl(changedKeys, 'layout', 'sortMode')}`}>
              <div className="proposal-mini-row head">
                {columns.map((column) => <strong key={column.originalName}>{column.name}</strong>)}
              </div>
              {rows.slice(0, 3).map((row, rowIndex) => (
                <div className="proposal-mini-row" key={rowIndex}>
                  {columns.map((column) => {
                    const sourceIndex = table.columns.indexOf(column)
                    return <span key={column.originalName}>{valueLabel(row[sourceIndex])}</span>
                  })}
                </div>
              ))}
            </div>
          )}

          {(config.layout === 'cards' || config.layout === 'gallery') && (
            <div className={`proposal-mini-cards${config.layout === 'gallery' ? ' gallery' : ''}${hl(changedKeys, 'layout', 'sortMode')}`}>
              {rows.slice(0, 3).map((row, rowIndex) => (
                <span key={rowIndex}>
                  {config.layout === 'gallery' && <i />}
                  <strong>{valueLabel(row[0])}</strong>
                  <small>{valueLabel(row[1])}</small>
                </span>
              ))}
            </div>
          )}

          {config.layout === 'dashboard' && (
            <div className={`proposal-mini-dashboard${hl(changedKeys, 'layout')}`}>
              <span><small>Enregistrements</small><strong>{table.rows.length}</strong></span>
              {config.showStats && <span><small>Champs</small><strong>{table.columns.length}</strong></span>}
              {config.showChart && (
                <div className={`proposal-mini-chart${hl(changedKeys, 'showChart')}`}>
                  <MiniChart columns={analyzed} rows={includedRows} preference={config.chartPreference} height={36} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProposalPreview
