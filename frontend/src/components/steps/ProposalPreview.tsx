import type { TableConfig } from '../../App'
import type { UiProposal } from '../../lib/uiProposals'

interface Props {
  proposal: UiProposal
  table: TableConfig
}

function valueLabel(value: unknown): string {
  const text = String(value ?? '—')
  return text.length > 16 ? `${text.slice(0, 14)}…` : text
}

function ProposalPreview({ proposal, table }: Props) {
  const columns = table.columns.filter((column) => !column.excluded).slice(0, 3)
  const { config } = proposal
  const firstColumnIndex = columns[0] ? table.columns.indexOf(columns[0]) : 0
  const rows = [...table.rows]
    .sort((left, right) => config.sortMode === 'alphabetical'
      ? String(left[firstColumnIndex] ?? '').localeCompare(String(right[firstColumnIndex] ?? ''), 'fr')
      : 0
    )
    .slice(0, 4)

  return (
    <div className={`proposal-preview theme-${config.theme} density-${config.density}`} aria-hidden="true">
      <div className="proposal-preview-header">
        <span>Excelium</span>
        {config.exportMode !== 'none' && <span className="proposal-preview-export">Exporter</span>}
      </div>
      <div className={`proposal-preview-body nav-${config.navigation}`}>
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
          <div className="proposal-preview-toolbar">
            <strong>{table.tableName}</strong>
            <span className="proposal-preview-tools">
              {config.searchEnabled && <span className="proposal-preview-search">Rechercher…</span>}
              {config.canEdit && <span className="proposal-preview-add">+ Ajouter</span>}
            </span>
          </div>

          {config.showStats && (
            <div className="proposal-preview-stats">
              <span><small>Enregistrements</small><strong>{table.rows.length}</strong></span>
              <span><small>Colonnes</small><strong>{columns.length}</strong></span>
            </div>
          )}

          {config.showChart && config.layout !== 'dashboard' && (
            <div className="proposal-preview-chart-line">
              <span /><span /><span /><span /><span />
            </div>
          )}

          {config.layout === 'table' && (
            <div className="proposal-mini-table">
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
            <div className={`proposal-mini-cards${config.layout === 'gallery' ? ' gallery' : ''}`}>
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
            <div className="proposal-mini-dashboard">
              <span><small>Enregistrements</small><strong>{table.rows.length}</strong></span>
              {config.showStats && <span><small>Champs</small><strong>{table.columns.length}</strong></span>}
              {config.showChart && <div className="proposal-mini-chart"><i /><i /><i /><i /></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProposalPreview
