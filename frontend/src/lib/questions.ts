import type { PreferenceDelta } from './preferenceEngine'

export type QuestionCategory = 'presentation' | 'usage' | 'contenu' | 'confort'

export interface QuestionOption {
  id: string
  label: string
  impact: string
  delta: PreferenceDelta
}

export interface Question {
  id: string
  category: QuestionCategory
  summaryLabel: string
  text: string
  options: QuestionOption[]
}

export interface QuestionBankContext {
  tables: readonly { tableName: string; rowCount: number }[]
  hasImages: boolean
  hasMeaningfulChart: boolean
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  presentation: 'Présentation',
  usage: 'Utilisation',
  contenu: 'Contenu',
  confort: 'Confort de lecture',
}

function buildLayoutQuestion(hasImages: boolean, hasMeaningfulChart: boolean): Question {
  const options: QuestionOption[] = [
    {
      id: 'table',
      label: 'Un tableau clair et structuré',
      impact: 'Vue en tableau',
      delta: { layout: { table: 4 } },
    },
    {
      id: 'cards',
      label: 'Des cartes faciles à parcourir',
      impact: 'Vue en cartes',
      delta: { layout: { cards: 4 } },
    },
  ]

  if (hasMeaningfulChart) {
    options.push({
      id: 'dashboard',
      label: 'Un tableau de bord de synthèse',
      impact: 'Tableau de bord',
      delta: { layout: { dashboard: 4 } },
    })
  }

  if (hasImages) {
    options.push({
      id: 'gallery',
      label: 'Une galerie qui met les images en avant',
      impact: 'Vue en galerie',
      delta: { layout: { gallery: 4 } },
    })
  }

  return {
    id: 'layout',
    category: 'presentation',
    summaryLabel: 'Vue principale',
    text: 'Comment veux-tu parcourir tes données ?',
    options,
  }
}

function buildInsightsQuestion(hasMeaningfulChart: boolean): Question {
  const options: QuestionOption[] = [
    {
      id: 'raw',
      label: 'Afficher surtout les données',
      impact: 'Données essentielles',
      delta: { widget: { chart: -3, stats: -3 } },
    },
    {
      id: 'stats',
      label: 'Ajouter les indicateurs clés',
      impact: 'Indicateurs clés',
      delta: { widget: { chart: -3, stats: 3 } },
    },
  ]

  if (hasMeaningfulChart) {
    options.push({
      id: 'charts',
      label: 'Ajouter les indicateurs et des graphiques',
      impact: 'Indicateurs + graphiques',
      delta: { widget: { chart: 3, stats: 3 } },
    })
  }

  return {
    id: 'insights',
    category: 'contenu',
    summaryLabel: 'Synthèse',
    text: 'Quel niveau de synthèse souhaites-tu ?',
    options,
  }
}

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
): Question | null {
  if (tables.length < 2) return null

  const options = [...tables]
    .sort((a, b) => b.rowCount - a.rowCount)
    .slice(0, 4)
    .map((table) => ({
      id: `primary-${table.tableName}`,
      label: table.tableName,
      impact: table.tableName,
      delta: { primaryTableName: table.tableName },
    }))

  return {
    id: 'primary-table',
    category: 'contenu',
    summaryLabel: 'Écran d’accueil',
    text: 'Quelle table doit s’ouvrir en premier ?',
    options,
  }
}

export function buildQuestionBank(context: QuestionBankContext): Question[] {
  const primaryTableQuestion = buildPrimaryTableQuestion(context.tables)

  return [
    buildLayoutQuestion(context.hasImages, context.hasMeaningfulChart),
    {
      id: 'access',
      category: 'usage',
      summaryLabel: 'Actions',
      text: 'Les utilisateurs doivent-ils modifier les données ?',
      options: [
        {
          id: 'edit',
          label: 'Oui, ajouter, modifier et supprimer',
          impact: 'Modification autorisée',
          delta: { interaction: 2 },
        },
        {
          id: 'read',
          label: 'Non, consultation uniquement',
          impact: 'Lecture seule',
          delta: { interaction: -2 },
        },
      ],
    },
    buildInsightsQuestion(context.hasMeaningfulChart),
    {
      id: 'density',
      category: 'confort',
      summaryLabel: 'Densité',
      text: 'Quelle densité d’affichage préfères-tu ?',
      options: [
        {
          id: 'compact',
          label: 'Compacte, pour voir plus de données',
          impact: 'Affichage compact',
          delta: { density: 2 },
        },
        {
          id: 'comfortable',
          label: 'Aérée, pour faciliter la lecture',
          impact: 'Affichage aéré',
          delta: { density: -2 },
        },
      ],
    },
    {
      id: 'navigation',
      category: 'presentation',
      summaryLabel: 'Navigation',
      text: 'Comment veux-tu naviguer entre les tables ?',
      options: [
        {
          id: 'tabs',
          label: 'Avec des onglets en haut',
          impact: 'Navigation par onglets',
          delta: { navigation: 'tabs' },
        },
        {
          id: 'sidebar',
          label: 'Avec un menu latéral',
          impact: 'Menu latéral',
          delta: { navigation: 'sidebar' },
        },
      ],
    },
    {
      id: 'search',
      category: 'usage',
      summaryLabel: 'Recherche',
      text: 'Faut-il une recherche rapide dans les données ?',
      options: [
        {
          id: 'visible',
          label: 'Oui, toujours visible',
          impact: 'Recherche visible',
          delta: { searchEnabled: true },
        },
        {
          id: 'hidden',
          label: 'Non, garder l’interface minimale',
          impact: 'Sans barre de recherche',
          delta: { searchEnabled: false },
        },
      ],
    },
    {
      id: 'sort',
      category: 'contenu',
      summaryLabel: 'Tri initial',
      text: 'Dans quel ordre afficher les données au départ ?',
      options: [
        {
          id: 'source',
          label: 'Conserver l’ordre du fichier Excel',
          impact: 'Ordre du fichier',
          delta: { sortMode: 'source' },
        },
        {
          id: 'alphabetical',
          label: 'Trier automatiquement de A à Z',
          impact: 'Tri alphabétique',
          delta: { sortMode: 'alphabetical' },
        },
      ],
    },
    {
      id: 'exports',
      category: 'usage',
      summaryLabel: 'Exports',
      text: 'Quels exports doivent être proposés ?',
      options: [
        {
          id: 'all',
          label: 'Excel et SQL',
          impact: 'Exports Excel + SQL',
          delta: { exportMode: 'all' },
        },
        {
          id: 'excel',
          label: 'Excel uniquement',
          impact: 'Export Excel',
          delta: { exportMode: 'excel' },
        },
        {
          id: 'none',
          label: 'Aucun export',
          impact: 'Exports masqués',
          delta: { exportMode: 'none' },
        },
      ],
    },
    {
      id: 'theme',
      category: 'confort',
      summaryLabel: 'Thème',
      text: 'Quel thème utiliser pour la webapp ?',
      options: [
        {
          id: 'dark',
          label: 'Sombre, pour réduire la luminosité',
          impact: 'Thème sombre',
          delta: { theme: 'dark' },
        },
        {
          id: 'light',
          label: 'Clair, pour une lecture lumineuse',
          impact: 'Thème clair',
          delta: { theme: 'light' },
        },
      ],
    },
    ...(primaryTableQuestion ? [primaryTableQuestion] : []),
  ]
}
