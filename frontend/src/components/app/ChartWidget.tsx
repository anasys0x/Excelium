import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findChartRecommendation, findCountRecommendation } from '../../lib/semantic'
import type { AnalyzedColumn } from '../../lib/semantic'
import { buildChartData, buildCountChart } from '../../lib/chartData'
import type { ChartPoint } from '../../lib/chartData'
import type { ChartPreference } from '../../lib/preferenceEngine'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  preference?: ChartPreference
  metricName?: string
  dimensionName?: string
}

function ChartWidget({ columns, rows, preference, metricName, dimensionName }: Props) {
  const recommendation = findChartRecommendation(columns, preference, metricName, dimensionName)

  let data: ChartPoint[] | null = null
  let isTime = false
  let chartTitle = ''

  if (recommendation) {
    data = buildChartData(recommendation, rows)
    isTime = recommendation.kind === 'time'
    chartTitle = isTime
      ? `Évolution de ${recommendation.metric.name}`
      : `${recommendation.metric.name} par ${recommendation.dimension.name}`
  } else {
    // Pas de colonne numérique exploitable (ex : une liste de contacts) :
    // on répartit le nombre de lignes par catégorie plutôt que de n'afficher
    // rien du tout.
    const countRecommendation = findCountRecommendation(columns, dimensionName)
    if (countRecommendation) {
      data = buildCountChart(countRecommendation, rows)
      chartTitle = `Répartition par ${countRecommendation.dimension.name}`
    }
  }

  if (!data) return null

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
