import type { LayoutKind } from './semantic'
import type { TableArchetype } from './archetype'
import {
  getDisplayDensity,
  shouldAllowEditing,
  shouldShowChartWidget,
  shouldShowStatsWidget,
} from './preferenceEngine'
import type {
  AppTheme,
  ChartPreference,
  DisplayDensity,
  ExportMode,
  NavigationMode,
  PreferenceProfile,
  SortMode,
} from './preferenceEngine'

export interface UiConfiguration {
  layout: LayoutKind
  density: DisplayDensity
  navigation: NavigationMode
  searchEnabled: boolean
  sortMode: SortMode
  exportMode: ExportMode
  theme: AppTheme
  canEdit: boolean
  showStats: boolean
  showChart: boolean
  chartPreference?: ChartPreference
  chartMetric?: string
  chartDimension?: string
}

export interface UiProposal {
  id: string
  title: string
  description: string
  recommended: boolean
  config: UiConfiguration
}

export interface UiProposalContext {
  hasImages: boolean
  hasMeaningfulChart: boolean
  archetype: TableArchetype
}

const LAYOUTS: LayoutKind[] = ['table', 'cards', 'dashboard', 'gallery']

type TFn = (key: string, vars?: Record<string, string | number>) => string

interface Variant {
  id: string
  titleKey: string
  descKey: string
  overrides: Partial<Pick<UiConfiguration, 'showStats' | 'showChart' | 'density'>>
}

// Le layout gagne une seule fois (racine du questionnaire + réponses qui
// pèsent sur `profile.layout`). Les 3 propositions sont ensuite 3
// compositions différentes de CE layout — jamais 3 layouts différents : une
// personne qui a choisi "tableau de bord" veut voir 3 tableaux de bord, pas
// un tableau de bord, un tableau et des cartes.
const DASHBOARD_VARIANTS: Variant[] = [
  { id: 'stats', titleKey: 'prop.variant.dbStats.title', descKey: 'prop.variant.dbStats.desc', overrides: { showStats: true, showChart: false } },
  { id: 'chart', titleKey: 'prop.variant.dbChart.title', descKey: 'prop.variant.dbChart.desc', overrides: { showStats: false, showChart: true } },
  { id: 'both', titleKey: 'prop.variant.dbBoth.title', descKey: 'prop.variant.dbBoth.desc', overrides: { showStats: true, showChart: true } },
]

// Pour table/cartes/galerie : pas de graphique/indicateurs propres au
// layout lui-même, donc la variation se fait sur la densité et sur la
// présence d'un bandeau de synthèse chiffrée au-dessus de la vue.
const OTHER_VARIANTS: Variant[] = [
  { id: 'simple', titleKey: 'prop.variant.simple.title', descKey: 'prop.variant.simple.desc', overrides: { showStats: false, showChart: false, density: 'comfortable' } },
  { id: 'dense', titleKey: 'prop.variant.dense.title', descKey: 'prop.variant.dense.desc', overrides: { showStats: false, showChart: false, density: 'compact' } },
  { id: 'insights', titleKey: 'prop.variant.insights.title', descKey: 'prop.variant.insights.desc', overrides: { showStats: true, showChart: true, density: 'comfortable' } },
]

// Quelle variante correspond le mieux à ce que les réponses indiquent déjà
// (showStats/showChart/density calculés à partir du profil réel).
function recommendedVariantIndex(layout: LayoutKind, showStats: boolean, showChart: boolean, density: DisplayDensity): number {
  if (layout === 'dashboard') {
    if (showChart && showStats) return 2
    if (showChart) return 1
    return 0
  }
  if (showStats || showChart) return 2
  return density === 'compact' ? 1 : 0
}

// Les 3 propositions déclinent le layout le mieux noté selon les réponses au
// questionnaire — jamais des gabarits fixes. N'importe quelle réponse qui
// pèse sur `profile.layout` (ou sur le thème/densité/etc. partagés) change
// donc visiblement les 3 aperçus.
export function buildUiProposals(profile: PreferenceProfile, context: UiProposalContext, t: TFn = (k) => k): UiProposal[] {
  const shared = {
    searchEnabled: profile.searchEnabled,
    sortMode: profile.sortMode,
    exportMode: profile.exportMode,
    theme: profile.theme,
    navigation: profile.navigation,
    canEdit: shouldAllowEditing(profile),
    chartPreference: profile.chartPreference,
    chartMetric: profile.chartMetricHint,
    chartDimension: profile.chartDimensionHint,
  }
  const baseShowStats = shouldShowStatsWidget(profile)
  const baseShowChart = shouldShowChartWidget(profile)
  const baseDensity = getDisplayDensity(profile)

  // Les layouts sans données pertinentes (galerie sans image, tableau de
  // bord sans rien à chiffrer) sont légèrement dépriorisés, jamais exclus.
  // La pénalité reste toujours plus petite que le plus petit delta réel
  // d'une réponse (1), pour qu'un choix explicite de l'utilisateur l'emporte
  // toujours, même sans données idéales.
  const relevancePenalty = (layout: LayoutKind): number => {
    if (layout === 'gallery' && !context.hasImages) return -0.5
    if (layout === 'dashboard' && !context.hasMeaningfulChart && !baseShowStats) return -0.5
    return 0
  }

  const ranked = [...LAYOUTS].sort(
    (a, b) =>
      ((profile.layout[b] ?? 0) + relevancePenalty(b)) -
      ((profile.layout[a] ?? 0) + relevancePenalty(a))
  )
  const layout = ranked[0]

  const variants = layout === 'dashboard' ? DASHBOARD_VARIANTS : OTHER_VARIANTS
  const recommendedIndex = recommendedVariantIndex(layout, baseShowStats, baseShowChart, baseDensity)

  return variants.map((variant, index) => ({
    id: `${layout}-${variant.id}`,
    title: t(variant.titleKey),
    description: t(variant.descKey),
    recommended: index === recommendedIndex,
    config: {
      ...shared,
      layout,
      density: baseDensity,
      showStats: baseShowStats,
      showChart: baseShowChart,
      ...variant.overrides,
    },
  }))
}
