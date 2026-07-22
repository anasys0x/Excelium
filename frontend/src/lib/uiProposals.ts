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

const LAYOUT_TITLES: Record<LayoutKind, string> = {
  table: 'Tableau',
  cards: 'Cartes',
  dashboard: 'Tableau de bord',
  gallery: 'Galerie',
}

const LAYOUT_DESCRIPTIONS: Record<LayoutKind, string> = {
  table: 'Vue compacte, efficace pour parcourir et rechercher beaucoup de lignes.',
  cards: 'Une fiche par élément, facile à parcourir visuellement.',
  dashboard: 'Indicateurs et graphiques mis en avant, pour suivre des chiffres.',
  gallery: 'Les images en avant, pour repérer visuellement chaque élément.',
}

// Les 3 propositions sont les 3 layouts les mieux notés selon les réponses
// au questionnaire — jamais des gabarits fixes. N'importe quelle réponse qui
// pèse sur `profile.layout` (ou sur le thème/densité/etc. partagés) change
// donc visiblement les 3 aperçus, pas seulement le premier.
export function buildUiProposals(profile: PreferenceProfile, context: UiProposalContext): UiProposal[] {
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
  // sans image, tableau de bord sans métrique) sont dépriorisés plutôt
  // qu'exclus, pour ne jamais tomber à 2 propositions.
  const relevancePenalty = (layout: LayoutKind): number => {
    if (layout === 'gallery' && !context.hasImages) return -100
    if (layout === 'dashboard' && !context.hasMeaningfulChart && !shared.showStats) return -100
    return 0
  }

  const ranked = [...LAYOUTS].sort(
    (a, b) =>
      ((profile.layout[b] ?? 0) + relevancePenalty(b)) -
      ((profile.layout[a] ?? 0) + relevancePenalty(a))
  )

  return ranked.slice(0, 3).map((layout, index) => ({
    id: layout,
    title: LAYOUT_TITLES[layout],
    recommended: index === 0,
    description: context.archetype === 'contacts' && layout === 'cards'
      ? 'Des fiches lisibles pour consulter chaque personne et ses informations.'
      : LAYOUT_DESCRIPTIONS[layout],
    config: { ...shared, layout },
  }))
}
