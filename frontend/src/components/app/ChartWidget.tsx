import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findChartRecommendation } from '../../lib/semantic'
import type { AnalyzedColumn } from '../../lib/semantic'
import { buildChartData } from '../../lib/chartData'
import type { ChartPreference } from '../../lib/preferenceEngine'

interface Props { columns: AnalyzedColumn[]; rows: unknown[][]; preference?: ChartPreference }

function ChartWidget({ columns, rows, preference }: Props) {
  const recommendation = findChartRecommendation(columns, preference)
  if (!recommendation) return null

  const data = buildChartData(recommendation, rows)
  if (!data) return null

  const isTime = recommendation.kind === 'time'
  const chartTitle = isTime
    ? `Évolution de ${recommendation.metric.name}`
    : `${recommendation.metric.name} par ${recommendation.dimension.name}`

  return (
    <div className="chart-widget">
      <h3 className="chart-widget-title">{chartTitle}</h3>
      <ResponsiveContainer width="100%" height={220}>
        {isTime ? (
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
