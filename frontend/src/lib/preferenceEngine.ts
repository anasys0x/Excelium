// Moteur de préférences : agrège les réponses au questionnaire en un profil
// de pondération pur et immutable, utilisé pour affiner (jamais remplacer)
// la détection sémantique automatique (archetype.ts, semantic.ts).

import { ARCHETYPE_ORDER, DETECTION_THRESHOLD } from './archetype'
import type { TableArchetype } from './archetype'
import type { LayoutKind } from './semantic'

export type DisplayDensity = 'compact' | 'comfortable'
export type NavigationMode = 'tabs' | 'sidebar'
export type SortMode = 'source' | 'alphabetical'
export type ExportMode = 'all' | 'excel' | 'none'
export type AppTheme = 'dark' | 'light'
export type ChartPreference = 'time' | 'category'

export interface PreferenceDelta {
  archetype?: Partial<Record<TableArchetype, number>>
  layout?: Partial<Record<LayoutKind, number>>
  widget?: { chart?: number; stats?: number }
  interaction?: number
  density?: number
  primaryTableName?: string
  navigation?: NavigationMode
  searchEnabled?: boolean
  sortMode?: SortMode
  exportMode?: ExportMode
  theme?: AppTheme
  chartPreference?: ChartPreference
}

export interface QuestionAnswer {
  questionId: string
  optionId: string
  delta: PreferenceDelta
}

export interface PreferenceProfile {
  archetype: Partial<Record<TableArchetype, number>>
  layout: Partial<Record<LayoutKind, number>>
  widget: { chart: number; stats: number }
  interaction: number
  density: number
  primaryTableHint?: string
  navigation: NavigationMode
  searchEnabled: boolean
  sortMode: SortMode
  exportMode: ExportMode
  theme: AppTheme
  chartPreference?: ChartPreference
}

function addRecord<K extends string>(
  base: Partial<Record<K, number>>,
  extra: Partial<Record<K, number>> | undefined,
): Partial<Record<K, number>> {
  if (!extra) return base
  const next = { ...base }
  for (const key of Object.keys(extra) as K[]) {
    next[key] = (next[key] ?? 0) + (extra[key] ?? 0)
  }
  return next
}

export function buildPreferenceProfile(answers: readonly QuestionAnswer[], defaultTheme: AppTheme = 'dark'): PreferenceProfile {
  const initial: PreferenceProfile = {
    archetype: {},
    layout: {},
    widget: { chart: 0, stats: 0 },
    interaction: 0,
    density: 0,
    navigation: 'tabs',
    searchEnabled: true,
    sortMode: 'source',
    exportMode: 'all',
    theme: defaultTheme,
  }

  return answers.reduce<PreferenceProfile>((profile, answer) => {
    const { delta } = answer
    return {
      archetype: addRecord(profile.archetype, delta.archetype),
      layout: addRecord(profile.layout, delta.layout),
      widget: {
        chart: profile.widget.chart + (delta.widget?.chart ?? 0),
        stats: profile.widget.stats + (delta.widget?.stats ?? 0),
      },
      interaction: profile.interaction + (delta.interaction ?? 0),
      density: profile.density + (delta.density ?? 0),
      primaryTableHint: delta.primaryTableName ?? profile.primaryTableHint,
      navigation: delta.navigation ?? profile.navigation,
      searchEnabled: delta.searchEnabled ?? profile.searchEnabled,
      sortMode: delta.sortMode ?? profile.sortMode,
      exportMode: delta.exportMode ?? profile.exportMode,
      theme: delta.theme ?? profile.theme,
      chartPreference: delta.chartPreference ?? profile.chartPreference,
    }
  }, initial)
}

export interface AutoDetectedTablePreset {
  archetypeScores: Record<TableArchetype, number>
  availableLayouts: LayoutKind[]
  defaultLayout: LayoutKind
}

export interface FinalTablePreset {
  archetype: TableArchetype
  layout: LayoutKind
}

export function computeTablePreset(
  auto: AutoDetectedTablePreset,
  profile: PreferenceProfile,
): FinalTablePreset {
  let bestArchetype: TableArchetype = 'generic'
  let bestScore = 0
  for (const a of ARCHETYPE_ORDER) {
    const score = (auto.archetypeScores[a] ?? 0) + (profile.archetype[a] ?? 0)
    if (score > bestScore) {
      bestArchetype = a
      bestScore = score
    }
  }
  const archetype = bestScore >= DETECTION_THRESHOLD ? bestArchetype : 'generic'

  let bestLayout = auto.defaultLayout
  let bestLayoutScore = 1 + (profile.layout[auto.defaultLayout] ?? 0)
  for (const layout of auto.availableLayouts) {
    if (layout === auto.defaultLayout) continue
    const score = 1 + (profile.layout[layout] ?? 0)
    if (score > bestLayoutScore) {
      bestLayout = layout
      bestLayoutScore = score
    }
  }

  return { archetype, layout: bestLayout }
}

const WIDGET_THRESHOLD = 2

export function shouldShowChartWidget(profile: PreferenceProfile): boolean {
  return profile.widget.chart >= WIDGET_THRESHOLD
}

export function shouldShowStatsWidget(profile: PreferenceProfile): boolean {
  return profile.widget.stats >= WIDGET_THRESHOLD
}

export function shouldAllowEditing(profile: PreferenceProfile): boolean {
  return profile.interaction > 0
}

export function getDisplayDensity(profile: PreferenceProfile): DisplayDensity {
  return profile.density > 0 ? 'compact' : 'comfortable'
}
