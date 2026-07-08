import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][] }

const nf = new Intl.NumberFormat('fr-FR')
const cf = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function DashboardView({ columns, rows }: Props) {
  const stats: { label: string; value: string }[] = [{ label: 'Enregistrements', value: nf.format(rows.length) }]

  for (const c of columns.filter((col) => isMetricRole(col.role))) {
    const nums = rows.map((r) => Number(r[c.index])).filter((n) => !isNaN(n))
    if (!nums.length) continue
    const sum = nums.reduce((a, b) => a + b, 0)
    const avg = Math.round((sum / nums.length) * 10) / 10
    if      (c.role === 'currency') stats.push({ label: `Total ${c.name}`, value: cf.format(sum) })
    else if (c.role === 'percent')  stats.push({ label: `Moyenne ${c.name}`, value: `${nf.format(avg)} %` })
    else if (c.role === 'rating')   stats.push({ label: `Moyenne ${c.name}`, value: `${nf.format(avg)} / 5` })
    else                             stats.push({ label: `Moyenne ${c.name}`, value: nf.format(avg) })
  }

  return (
    <div className="dashboard-grid">
      {stats.map((s, i) => <Stat key={i} label={s.label} value={s.value} />)}
    </div>
  )
}

export default DashboardView
