import { Bar, BarChart, Line, LineChart, ResponsiveContainer } from 'recharts'
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
  height: number
}

// Version compacte de ChartWidget pour les aperçus (propositions, questionnaire) :
// mêmes données réelles, sans axes ni tooltip — juste la forme du graphique.
function MiniChart({ columns, rows, preference, metricName, dimensionName, height }: Props) {
  const recommendation = findChartRecommendation(columns, preference, metricName, dimensionName)

  let data: ChartPoint[] | null = null
  let isTime = false

  if (recommendation) {
    data = buildChartData(recommendation, rows)
    isTime = recommendation.kind === 'time'
  } else {
    const countRecommendation = findCountRecommendation(columns, dimensionName)
    if (countRecommendation) data = buildCountChart(countRecommendation, rows)
  }

  if (!data) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      {isTime ? (
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke="var(--p-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <BarChart data={data}>
          <Bar dataKey="value" fill="var(--p-accent)" />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

export default MiniChart
