import type { TableConfig } from '../../App'
import { typeLabel } from '../../lib/typeLabels'

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  INT:    { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
  FLOAT:  { bg: 'var(--badge-blue-bg)',   color: 'var(--badge-blue-text)'   },
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
  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0)

  const allLinks = tables.flatMap((t) =>
    t.columns
      .filter((c) => c.foreignKey && c.foreignKeyConfirmed)
      .map((c) => ({
        fromTable: t.tableName, fromCol: c.name,
        toTable: c.foreignKey!.refTable, toCol: c.foreignKey!.refColumn,
      }))
  )

  return (
    <div className="confirm-section">
      <h1 className="confirm-title">Récapitulatif avant création</h1>
      <p className="confirm-subtitle">
        {tables.length} tableau{tables.length > 1 ? 'x' : ''} · {totalRows} ligne{totalRows > 1 ? 's' : ''} au total
        {allLinks.length > 0 && (
          <> · <span className="green">{allLinks.length} lien{allLinks.length > 1 ? 's' : ''} entre feuilles</span></>
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
                    feuille : {table.sheetName} · {table.rows.length} ligne{table.rows.length > 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`table-card-pk${pk ? '' : ' warn'}`}>
                  {pk
                    ? <>Identifiant : <strong>{pk.name}</strong></>
                    : 'sans identifiant'}
                </span>
              </div>

              <div className="table-card-cols">
                {table.columns.map((col) => {
                  const badge    = TYPE_BADGE[col.type] ?? { bg: 'var(--line)', color: 'var(--cell-text)' }
                  const isLinked = col.foreignKey && col.foreignKeyConfirmed
                  return (
                    <span
                      key={col.originalName}
                      title={isLinked ? `Référence vers ${col.foreignKey!.refTable}.${col.foreignKey!.refColumn}` : undefined}
                      className={`col-chip${col.isPrimaryKey ? ' pk' : isLinked ? ' fk' : ''}`}
                    >
                      {col.isPrimaryKey && <span className="col-chip-badge pk">ID</span>}
                      {isLinked && <span className="col-chip-badge fk">LIEN</span>}
                      <span className="col-chip-name">{col.name}</span>
                      <span className="type-badge" style={{ background: badge.bg, color: badge.color }}>
                        {typeLabel(col.type)}
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
                      <span className="fk-row-sep">fait référence à</span>
                      <span className="fk-row-ref">{col.foreignKey!.refTable}.{col.foreignKey!.refColumn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {allLinks.length > 0 && (
        <div className="links-summary">
          <p className="links-summary-title">Liens entre feuilles</p>
          <div className="links-summary-list">
            {allLinks.map((lk, i) => (
              <div key={i} className="links-summary-row">
                <span className="done-link-from">{lk.fromTable}.{lk.fromCol}</span>
                <span className="done-link-arrow">→</span>
                <span className="done-link-to">{lk.toTable}.{lk.toCol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="confirm-actions">
        <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
        <button className="btn-primary" onClick={onNext}>Continuer →</button>
      </div>
    </div>
  )
}

export default StepTableConfirmation
