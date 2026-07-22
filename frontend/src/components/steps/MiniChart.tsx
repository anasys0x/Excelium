import { Bar, BarChart, Line, LineChart, ResponsiveContainer } from 'recharts'
import { findChartRecommendation } from '../../lib/semantic'
import type { AnalyzedColumn } from '../../lib/semantic'
import { buildChartData } from '../../lib/chartData'
import type { ChartPreference } from '../../lib/preferenceEngine'

interface Props {
  columns: AnalyzedColumn[]
  rows: unknown[][]
  preference?: ChartPreference
  height: number
}

// Version compacte de ChartWidget pour les aperçus (propositions, questionnaire) :
// mêmes données réelles, sans axes ni tooltip — juste la forme du graphique.
function MiniChart({ columns, rows, preference, height }: Props) {
  const recommendation = findChartRecommendation(columns, preference)
  if (!recommendation) return null

  const data = buildChartData(recommendation, rows)
  if (!data) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      {recommendation.kind === 'time' ? (
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
