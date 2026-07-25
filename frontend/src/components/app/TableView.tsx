import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'
import { renderCell } from '../widgets/CellWidget'
import { useI18n } from '../../lib/i18n'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  onRowClick: (rowIndex: number) => void
  onEdit?: (rowIndex: number) => void
  onDelete?: (rowIndex: number) => void
  onDependency?: (rowIndex: number) => void
  expandedRowIndex?: number | null
  expandedContent?: ReactNode
}

function TableView({ columns, rows, onRowClick, onEdit, onDelete, onDependency, expandedRowIndex, expandedContent }: Props) {
  const { t } = useI18n()
  const hasCrud = onEdit || onDelete || onDependency
  const colSpan = columns.length + (hasCrud ? 1 : 0)

  return (
    <div className="table-view">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.index} className={`data-th${isMetricRole(c.role) ? ' right' : ''}`}>
                  {c.name}
                </th>
              ))}
              {hasCrud && <th className="data-th-actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const base = ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)'
              const isExpanded = expandedRowIndex === ri
              return (
                <Fragment key={ri}>
                  <tr
                    style={{ background: isExpanded ? 'var(--accent-soft)' : base, transition: 'background .12s' }}
                    onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--row-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? 'var(--accent-soft)' : base }}
                  >
                    {columns.map((c) => (
                      <td key={c.index} onClick={() => onRowClick(ri)} className={`data-td${isMetricRole(c.role) ? ' right' : ''}`}>
                        {renderCell(c.role, row[c.index])}
                      </td>
                    ))}
                    {hasCrud && (
                      <td className="data-td-actions">
                        <div className="crud-actions">
                          {onDependency && (
                            <button
                              className={`crud-btn-dep${isExpanded ? ' active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); onDependency(ri) }}
                              title={t('app.viewDeps')}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          )}
                          {onEdit && <button className="crud-btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(ri) }} title={t('common.edit')}>✎</button>}
                          {onDelete && <button className="crud-btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(ri) }} title={t('common.delete')}>✕</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && expandedContent && (
                    <tr className="dep-inline-row">
                      <td colSpan={colSpan} className="dep-inline-cell">
                        {expandedContent}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="table-empty">{t('app.noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableView
