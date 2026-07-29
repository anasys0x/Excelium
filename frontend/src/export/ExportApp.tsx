import { useEffect, useState } from 'react'
import GeneratedApp from '../components/app/GeneratedApp'
import { restoreSession } from '../lib/session'
import type { SessionApiResponse } from '../lib/session'
import type { GeneratedAppSeed, TableConfig } from '../App'
import { useI18n } from '../lib/i18n'

const API = 'http://localhost:8000'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tables: TableConfig[]; seed: GeneratedAppSeed }

interface ExportConfig {
  sessionId?: string
}

// Point d'entrée de la webapp exportée : pas de wizard, juste la webapp du
// client. L'identifiant de session vient de config.json (écrit par le
// backend au moment de l'export), jamais saisi par le client.
function ExportApp() {
  const { t } = useI18n()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const configRes = await fetch('./config.json')
        if (!configRes.ok) throw new Error(t('export.noConfig'))
        const config = await configRes.json() as ExportConfig
        if (!config.sessionId) throw new Error(t('export.noConfig'))

        const sessionRes = await fetch(`${API}/sessions/${encodeURIComponent(config.sessionId)}`)
        const data = await sessionRes.json().catch(() => null)
        if (!sessionRes.ok) throw new Error(data?.detail ?? t('app.sessionLoadError'))

        const restored = restoreSession(data as SessionApiResponse, t('app.sessionNoSchema'))
        document.documentElement.dataset.theme = restored.theme
        if (!cancelled) {
          setState({ status: 'ready', tables: restored.sheets[0].tables, seed: restored.seed })
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : t('app.sessionLoadError'),
          })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [t])

  if (state.status === 'loading') {
    return <div className="export-status">{t('export.loading')}</div>
  }

  if (state.status === 'error') {
    return (
      <div className="export-status export-status-error">
        <p>{t('export.errorTitle')}</p>
        <p>{state.message}</p>
        <p>{t('export.errorHint')}</p>
      </div>
    )
  }

  return (
    <GeneratedApp
      tables={state.tables}
      initialArchetypeOverrides={state.seed.archetypeOverrides}
      initialLayoutOverrides={state.seed.layoutOverrides}
      initialActiveTableId={state.seed.primaryTableId}
      showChartWidget={state.seed.showChartWidget}
      showStatsWidget={state.seed.showStatsWidget}
      chartPreference={state.seed.chartPreference}
      canEdit={state.seed.canEdit}
      density={state.seed.density}
      navigation={state.seed.navigation}
      searchEnabled={state.seed.searchEnabled}
      sortMode={state.seed.sortMode}
      exportMode={state.seed.exportMode}
      sessionId={state.seed.sessionId}
    />
  )
}

export default ExportApp
