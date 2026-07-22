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
  config: UiConfiguration
}

export interface UiProposalContext {
  hasImages: boolean
  hasMeaningfulChart: boolean
  archetype: TableArchetype
}

const LAYOUTS: LayoutKind[] = ['table', 'cards', 'dashboard', 'gallery']

function preferredLayout(profile: PreferenceProfile): LayoutKind {
  return LAYOUTS.reduce((best, layout) =>
    (profile.layout[layout] ?? 0) > (profile.layout[best] ?? 0) ? layout : best
  , 'table')
}

function signature(config: UiConfiguration): string {
  return `${config.layout}:${config.density}:${config.navigation}`
}

export function buildUiProposals(profile: PreferenceProfile, context: UiProposalContext): UiProposal[] {
  const shared = {
    searchEnabled: profile.searchEnabled,
    sortMode: profile.sortMode,
    exportMode: profile.exportMode,
    theme: profile.theme,
    canEdit: shouldAllowEditing(profile),
    showStats: shouldShowStatsWidget(profile),
    showChart: shouldShowChartWidget(profile),
    chartPreference: profile.chartPreference,
  }
  const exact: UiProposal = {
    id: 'recommended',
    title: 'Selon tes réponses',
    description: context.archetype === 'contacts'
      ? 'Tes choix appliqués à un annuaire de personnes, sans analyse inventée.'
      : 'La proposition la plus fidèle à tes choix et au sens des données.',
    config: {
      ...shared,
      layout: preferredLayout(profile),
      density: getDisplayDensity(profile),
      navigation: profile.navigation,
    },
  }

  const candidates: UiProposal[] = [
    {
      id: 'structured',
      title: 'Structurée',
      description: 'Une vue compacte, efficace pour gérer beaucoup de données.',
      config: { ...shared, layout: 'table', density: 'compact', navigation: 'sidebar' },
    },
    {
      id: 'visual',
      title: context.archetype === 'contacts' ? 'Fiches individuelles' : 'Visuelle',
      description: context.archetype === 'contacts'
        ? 'Des fiches lisibles pour consulter chaque personne et ses informations.'
        : 'Une présentation aérée qui facilite le parcours des éléments.',
      config: { ...shared, layout: context.hasImages ? 'gallery' : 'cards', density: 'comfortable', navigation: 'tabs' },
    },
    {
      id: 'minimal',
      title: context.archetype === 'contacts' ? 'Annuaire simple' : 'Essentielle',
      description: 'Une interface aérée qui conserve uniquement les informations utiles.',
      config: { ...shared, layout: 'table', density: 'comfortable', navigation: 'tabs' },
    },
    ...(context.hasMeaningfulChart ? [{
      id: 'analytical',
      title: 'Analytique',
      description: 'Une synthèse basée uniquement sur les mesures réellement comparables.',
      config: { ...shared, layout: 'dashboard' as const, density: 'compact' as const, navigation: 'tabs' as const },
    }] : []),
  ]

  const seen = new Set([signature(exact.config)])
  const alternatives = candidates.filter((candidate) => {
    const key = signature(candidate.config)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return [exact, ...alternatives.slice(0, 2)]
}
