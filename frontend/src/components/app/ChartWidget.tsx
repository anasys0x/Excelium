import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findChartRecommendation } from '../../lib/semantic'
import type { AnalyzedColumn, ChartRecommendation } from '../../lib/semantic'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][] }

interface ChartPoint { label: string; value: number }

function buildCategoryChart(recommendation: ChartRecommendation, rows: unknown[][]): ChartPoint[] | null {
  const groups = new Map<string, { total: number; count: number }>()
  for (const row of rows) {
    const key   = String(row[recommendation.dimension.index] ?? '—')
    const value = Number(row[recommendation.metric.index])
    if (isNaN(value)) continue
    const current = groups.get(key) ?? { total: 0, count: 0 }
    groups.set(key, { total: current.total + value, count: current.count + 1 })
  }
  if (groups.size === 0) return null
  const useAverage = recommendation.metric.role === 'percent' || recommendation.metric.role === 'rating'
  return [...groups.entries()].slice(0, 12).map(([label, group]) => ({
    label,
    value: useAverage ? group.total / group.count : group.total,
  }))
}

function buildTimeChart(recommendation: ChartRecommendation, rows: unknown[][]): ChartPoint[] | null {
  const points = rows
    .map((row) => ({
      label: String(row[recommendation.dimension.index] ?? ''),
      value: Number(row[recommendation.metric.index]),
      time: Date.parse(String(row[recommendation.dimension.index])),
    }))
    .filter((p) => p.label && !isNaN(p.value) && !isNaN(p.time))
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  return points.map(({ label, value }) => ({ label, value }))
}

function ChartWidget({ columns, rows }: Props) {
  const recommendation = findChartRecommendation(columns)
  if (!recommendation) return null

  const timeSeries = recommendation.kind === 'time'
    ? buildTimeChart(recommendation, rows)
    : null
  const categorySeries = recommendation.kind === 'category'
    ? buildCategoryChart(recommendation, rows)
    : null
  const data = timeSeries ?? categorySeries
  if (!data) return null

  const chartTitle = recommendation.kind === 'time'
    ? `Évolution de ${recommendation.metric.name}`
    : `${recommendation.metric.name} par ${recommendation.dimension.name}`

  return (
    <div className="chart-widget">
      <h3 className="chart-widget-title">{chartTitle}</h3>
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
