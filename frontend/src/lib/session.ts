import type { GeneratedAppSeed, SheetData, Theme } from '../App'
import { ARCHETYPE_PRESETS, detectArchetype } from './archetype'
import type { TableArchetype } from './archetype'
import type { LayoutKind } from './semantic'
import { analyzeColumns } from './semantic'
import type { ChartPreference, DisplayDensity, ExportMode, NavigationMode, SortMode } from './preferenceEngine'

interface StoredForeignKey {
  refTable: string
  refColumn: string
}

interface StoredColumn {
  name: string
  type: string
  isPrimaryKey: boolean
  foreignKey?: StoredForeignKey | null
}

interface StoredTable {
  tableName: string
  columns: StoredColumn[]
  rows: unknown[][]
}

export interface SessionApiResponse {
  id: string
  createdAt: string
  dbSchema: { tables: StoredTable[] }
  preset: Record<string, unknown>
}

export interface RestoredSession {
  sheets: SheetData[]
  seed: GeneratedAppSeed
  theme: Theme
}

const ARCHETYPES: TableArchetype[] = ['contacts', 'sales', 'inventory', 'events', 'generic']
const LAYOUTS: LayoutKind[] = ['table', 'gallery', 'dashboard', 'cards']

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function restoreSession(
  data: SessionApiResponse,
  invalidSchemaMsg = 'Cette session ne contient aucun schéma exploitable.',
): RestoredSession {
  if (!data.id || !Array.isArray(data.dbSchema?.tables) || data.dbSchema.tables.length === 0) {
    throw new Error(invalidSchemaMsg)
  }

  const sheetName = 'Session reprise'
  const tables = data.dbSchema.tables.map((table, index) => ({
    id: `session-${index}`,
    sheetName,
    tableName: table.tableName,
    columns: table.columns.map((column) => ({
      originalName: column.name,
      name: column.name,
      type: column.type,
      isPrimaryKey: column.isPrimaryKey,
      foreignKey: column.foreignKey ?? null,
      foreignKeyConfirmed: Boolean(column.foreignKey),
    })),
    rows: Array.isArray(table.rows) ? table.rows : [],
  }))

  const preset = recordValue(data.preset)
  const storedArchetypes = recordValue(preset.archetypeOverrides)
  const storedLayouts = recordValue(preset.layoutOverrides)
  const archetypeValues = Object.values(storedArchetypes)
  const layoutEntries = Object.entries(storedLayouts)
  const layoutValues = layoutEntries.map(([, value]) => value)
  const archetypeOverrides: Record<string, TableArchetype> = {}
  const layoutOverrides: Record<string, LayoutKind> = {}

  tables.forEach((table, index) => {
    const analyzed = analyzeColumns(table.columns, table.rows)
    const detected = detectArchetype(analyzed, table.tableName)
    const storedArchetype = archetypeValues[index]
    const archetype = ARCHETYPES.includes(storedArchetype as TableArchetype)
      ? storedArchetype as TableArchetype
      : detected
    const storedLayout = layoutValues[index]
    const layout = LAYOUTS.includes(storedLayout as LayoutKind)
      ? storedLayout as LayoutKind
      : ARCHETYPE_PRESETS[archetype].defaultLayout
    archetypeOverrides[table.id] = archetype
    layoutOverrides[table.id] = layout
  })

  const storedPrimaryId = typeof preset.primaryTableId === 'string' ? preset.primaryTableId : null
  const primaryIndex = storedPrimaryId
    ? layoutEntries.findIndex(([storedId]) => storedId === storedPrimaryId)
    : -1
  const primaryTableId = primaryIndex >= 0 ? tables[primaryIndex]?.id ?? null : null
  const density: DisplayDensity = preset.density === 'compact' ? 'compact' : 'comfortable'
  const navigation: NavigationMode = preset.navigation === 'sidebar' ? 'sidebar' : 'tabs'
  const sortMode: SortMode = preset.sortMode === 'alphabetical' ? 'alphabetical' : 'source'
  const exportMode: ExportMode = preset.exportMode === 'none' || preset.exportMode === 'excel'
    ? preset.exportMode
    : 'all'
  const theme: Theme = preset.theme === 'light' ? 'light' : 'dark'
  const chartPreference: ChartPreference | undefined =
    preset.chartPreference === 'time' || preset.chartPreference === 'category'
      ? preset.chartPreference
      : undefined

  return {
    sheets: [{ name: sheetName, tables }],
    seed: {
      archetypeOverrides,
      layoutOverrides,
      primaryTableId,
      showChartWidget: booleanValue(preset.showChartWidget, false),
      showStatsWidget: booleanValue(preset.showStatsWidget, false),
      chartPreference,
      canEdit: booleanValue(preset.canEdit, true),
      density,
      navigation,
      searchEnabled: booleanValue(preset.searchEnabled, true),
      sortMode,
      exportMode,
      sessionId: data.id,
    },
    theme,
  }
}
