import type { TableConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'
import { useI18n } from '../../lib/i18n'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)' },
  STRING: { bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)'  },
  DATE:   { bg: 'var(--badge-amber-bg)',  color: 'var(--amber-text)'        },
  BOOL:   { bg: 'var(--badge-violet-bg)', color: 'var(--badge-violet-text)' },
  MIXED:  { bg: 'var(--badge-orange-bg)', color: 'var(--badge-orange-text)' },
}

interface Props {
  tables: TableConfig[]
  onBack: () => void
  onNext: () => void
}

function StepTableConfirmation({ tables, onBack, onNext }: Props) {
  const { t, lang } = useI18n()
  const totalRows = tables.reduce((sum, tbl) => sum + tbl.rows.length, 0)

  const allLinks = tables.flatMap((tbl) =>
    tbl.columns
      .filter((c) => c.foreignKey && c.foreignKeyConfirmed)
      .map((c) => ({
        fromTable: tbl.tableName, fromCol: c.name,
        toTable: c.foreignKey!.refTable, toCol: c.foreignKey!.refColumn,
      }))
  )

  return (
    <div className="confirm-section">
      <h1 className="confirm-title">{t('recap.title')}</h1>
      <p className="confirm-subtitle">
        {tables.length} {t('word.table', { count: tables.length })} · {totalRows} {t('word.row', { count: totalRows })} {t('recap.total')}
        {allLinks.length > 0 && (
          <> · <span className="green">{allLinks.length} {t('word.link', { count: allLinks.length })} {t('recap.betweenSheets')}</span></>
        )}
      </p>

      <div className="table-cards">
        {tables.map((table) => {
          const pk    = table.columns.find((col) => col.isPrimaryKey)
          const links = table.columns.filter((c) => c.foreignKey && c.foreignKeyConfirmed)
          return (
            <div key={table.id} className="table-card">
              <div className="table-card-header">
                <div>
                  <div className="table-card-name">{table.tableName}</div>
                  <p className="table-card-meta">
                    {t('recap.sheet')} : {table.sheetName} · {table.rows.length} {t('word.row', { count: table.rows.length })}
                  </p>
                </div>
                <span className={`table-card-pk${pk ? '' : ' warn'}`}>
                  {pk
                    ? <>{t('common.identifier')} : <strong>{pk.name}</strong></>
                    : t('recap.noId')}
                </span>
              </div>

              <div className="table-card-cols">
                {table.columns.map((col) => {
                  const badge    = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  const isLinked = col.foreignKey && col.foreignKeyConfirmed
                  return (
                    <span
                      key={col.originalName}
                      title={isLinked ? `${t('recap.refersTo')} ${col.foreignKey!.refTable}.${col.foreignKey!.refColumn}` : undefined}
                      className={`col-chip${col.isPrimaryKey ? ' pk' : isLinked ? ' fk' : ''}`}
                    >
                      {col.isPrimaryKey && <span className="col-chip-badge pk">{t('common.identifier')}</span>}
                      {isLinked && <span className="col-chip-badge fk">{t('recap.linkBadge')}</span>}
                      <span className="col-chip-name">{col.name}</span>
                      <span className="type-badge" style={{ background: badge.bg, color: badge.color }}>
                        {typeLabel(col.type, lang)}
                      </span>
                    </span>
                  )
                })}
              </div>

              {links.length > 0 && (
                <div className="table-card-fks">
                  {links.map((col) => (
                    <div key={col.originalName} className="fk-row">
                      <span className="fk-row-icon">↗</span>
                      <span className="fk-row-col">{col.name}</span>
                      <span className="fk-row-sep">{t('recap.refersTo')}</span>
                      <span className="fk-row-ref">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="confirm-actions">
        <button className="btn btn-secondary" onClick={onBack}>← {t('common.back')}</button>
        <button className="btn-primary" onClick={onNext}>
          {t('recap.continue')} →
        </button>
      </div>
    </div>
  )
}

export default StepTableConfirmation
