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

// Les 3 propositions sont les 3 layouts les mieux notés selon les réponses
// au questionnaire — jamais des gabarits fixes. N'importe quelle réponse qui
// pèse sur `profile.layout` (ou sur le thème/densité/etc. partagés) change
// donc visiblement les 3 aperçus, pas seulement le premier.
export function buildUiProposals(profile: PreferenceProfile, context: UiProposalContext, t: TFn = (k) => k): UiProposal[] {
  const shared = {
    searchEnabled: profile.searchEnabled,
    sortMode: profile.sortMode,
    exportMode: profile.exportMode,
    theme: profile.theme,
    density: getDisplayDensity(profile),
    navigation: profile.navigation,
    canEdit: shouldAllowEditing(profile),
    showStats: shouldShowStatsWidget(profile),
    showChart: shouldShowChartWidget(profile),
    chartPreference: profile.chartPreference,
  }

  // Toujours 3 propositions : les layouts sans données pertinentes (galerie
  // sans image, tableau de bord sans métrique) sont légèrement dépriorisés,
  // jamais exclus. La pénalité ne sert qu'à départager les égalités (profil
  // vide ou neutre) — elle reste toujours plus petite que le plus petit
  // delta réel d'une réponse (1), pour qu'un choix explicite de
  // l'utilisateur l'emporte toujours, même sans données idéales.
  const relevancePenalty = (layout: LayoutKind): number => {
    if (layout === 'gallery' && !context.hasImages) return -0.5
    if (layout === 'dashboard' && !context.hasMeaningfulChart && !shared.showStats) return -0.5
    return 0
  }

  const ranked = [...LAYOUTS].sort(
    (a, b) =>
      ((profile.layout[b] ?? 0) + relevancePenalty(b)) -
      ((profile.layout[a] ?? 0) + relevancePenalty(a))
  )

  return ranked.slice(0, 3).map((layout, index) => ({
    id: layout,
    title: t(`prop.layout.${layout}.title`),
    recommended: index === 0,
    description: context.archetype === 'contacts' && layout === 'cards'
      ? t('prop.layout.cards.contactsDesc')
      : t(`prop.layout.${layout}.desc`),
    config: { ...shared, layout },
  }))
}
