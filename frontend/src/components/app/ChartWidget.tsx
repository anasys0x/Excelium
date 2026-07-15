import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyzedColumn } from '../../lib/semantic'
import { isMetricRole } from '../../lib/semantic'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][] }

interface ChartPoint { label: string; value: number }

function buildCategoryChart(columns: AnalyzedColumn[], rows: unknown[][]): ChartPoint[] | null {
  const categoryCol = columns.find((c) => c.role === 'category' || c.role === 'status')
  const metricCol   = columns.find((c) => isMetricRole(c.role))
  if (!categoryCol || !metricCol) return null

  const totals = new Map<string, number>()
  for (const row of rows) {
    const key   = String(row[categoryCol.index] ?? '—')
    const value = Number(row[metricCol.index])
    if (isNaN(value)) continue
    totals.set(key, (totals.get(key) ?? 0) + value)
  }
  if (totals.size === 0) return null
  return [...totals.entries()].map(([label, value]) => ({ label, value }))
}

function buildTimeChart(columns: AnalyzedColumn[], rows: unknown[][]): ChartPoint[] | null {
  const dateCol   = columns.find((c) => c.role === 'date')
  const metricCol = columns.find((c) => isMetricRole(c.role))
  if (!dateCol || !metricCol) return null

  const points = rows
    .map((row) => ({
      label: String(row[dateCol.index] ?? ''),
      value: Number(row[metricCol.index]),
      time: Date.parse(String(row[dateCol.index])),
    }))
    .filter((p) => p.label && !isNaN(p.value) && !isNaN(p.time))
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  return points.map(({ label, value }) => ({ label, value }))
}

function ChartWidget({ columns, rows }: Props) {
  const timeSeries     = buildTimeChart(columns, rows)
  const categorySeries = !timeSeries ? buildCategoryChart(columns, rows) : null
  const data = timeSeries ?? categorySeries
  if (!data) return null

  return (
    <div className="chart-widget">
      <ResponsiveContainer width="100%" height={220}>
        {timeSeries ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
            <Tooltip />
            <Bar dataKey="value" fill="var(--accent)" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default ChartWidget
