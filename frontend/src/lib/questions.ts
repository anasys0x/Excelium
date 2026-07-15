// Banque des 20 questions du questionnaire de pondération. 19 questions
// statiques + 1 question dynamique (q15, générée à partir des tables
// réellement importées). Module pur, sans dépendance à React.

import type { PreferenceDelta } from './preferenceEngine'

export type QuestionCategory = 'usage' | 'visualisation' | 'edition' | 'volume' | 'style' | 'collaboration'

export interface QuestionOption {
  id: string
  label: string
  delta: PreferenceDelta
}

export interface Question {
  id: string
  category: QuestionCategory
  text: string
  options: QuestionOption[]
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  usage: 'Usage & intention',
  visualisation: 'Visualisation & reporting',
  edition: 'Édition & workflow',
  volume: 'Volume & organisation',
  style: 'Style & présentation',
  collaboration: 'Collaboration & accès',
}

const STATIC_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'usage',
    text: 'Qui va utiliser principalement cette webapp ?',
    options: [
      { id: 'solo', label: 'Moi seul, pour suivre mes données', delta: { interaction: 1 } },
      { id: 'team', label: 'Mon équipe en interne', delta: { interaction: 1 } },
      { id: 'external', label: 'Des clients/partenaires externes', delta: { layout: { cards: 1 }, interaction: -1 } },
    ],
  },
  {
    id: 'q2',
    category: 'usage',
    text: 'À quelle fréquence les données vont-elles changer ?',
    options: [
      { id: 'rare', label: 'Rarement (référence stable)', delta: { interaction: -2, layout: { table: 1 } } },
      { id: 'regular', label: 'Régulièrement', delta: { interaction: 2 } },
      { id: 'daily', label: 'Plusieurs fois par jour', delta: { interaction: 2, widget: { stats: 1 } } },
    ],
  },
  {
    id: 'q3',
    category: 'usage',
    text: 'Le but principal de cette webapp est de...',
    options: [
      { id: 'consult', label: 'Consulter et rechercher rapidement l\'information', delta: { layout: { table: 2 }, interaction: -1 } },
      { id: 'follow', label: 'Suivre l\'évolution d\'indicateurs', delta: { layout: { dashboard: 2 }, widget: { stats: 2 } } },
      { id: 'manage', label: 'Gérer et modifier les données au quotidien', delta: { interaction: 2, layout: { table: 1 } } },
      { id: 'showcase', label: 'Présenter les données de façon attractive (catalogue, portfolio)', delta: { layout: { gallery: 2, cards: 1 } } },
    ],
  },
  {
    id: 'q4',
    category: 'usage',
    text: 'Combien de personnes vont utiliser cette webapp en même temps ?',
    options: [
      { id: 'one', label: 'Une seule personne', delta: {} },
      { id: 'small-team', label: 'Une petite équipe (2-10)', delta: { interaction: 1 } },
      { id: 'many', label: 'Beaucoup d\'utilisateurs', delta: { interaction: 1 } },
    ],
  },
  {
    id: 'q5',
    category: 'visualisation',
    text: 'As-tu besoin de graphiques (courbes, barres) pour visualiser les données ?',
    options: [
      { id: 'essential', label: 'Oui, essentiel', delta: { widget: { chart: 3 }, layout: { dashboard: 2 } } },
      { id: 'nice', label: 'Ce serait un plus', delta: { widget: { chart: 1 } } },
      { id: 'no', label: 'Non, pas nécessaire', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q6',
    category: 'visualisation',
    text: 'Veux-tu voir des indicateurs clés en un coup d\'œil (totaux, moyennes) ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { widget: { stats: 2 }, layout: { dashboard: 1 } } },
      { id: 'no', label: 'Non, je préfère voir les données brutes', delta: { layout: { table: 1 } } },
    ],
  },
  {
    id: 'q7',
    category: 'visualisation',
    text: 'Le suivi de tendances dans le temps est important ?',
    options: [
      { id: 'yes', label: 'Très important', delta: { widget: { chart: 2 }, archetype: { sales: 1 } } },
      { id: 'no', label: 'Peu important', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q8',
    category: 'visualisation',
    text: 'Compares-tu souvent des catégories entre elles (ex : ventes par région) ?',
    options: [
      { id: 'yes', label: 'Oui, souvent', delta: { widget: { chart: 2 }, layout: { dashboard: 1 } } },
      { id: 'no', label: 'Rarement', delta: { widget: { chart: -1 } } },
    ],
  },
  {
    id: 'q9',
    category: 'edition',
    text: 'À quelle fréquence ajoutes-tu de nouvelles lignes ?',
    options: [
      { id: 'often', label: 'Très souvent', delta: { interaction: 2 } },
      { id: 'sometimes', label: 'De temps en temps', delta: { interaction: 1 } },
      { id: 'rare', label: 'Presque jamais', delta: { interaction: -2 } },
    ],
  },
  {
    id: 'q10',
    category: 'edition',
    text: 'As-tu besoin de formulaires détaillés pour chaque entrée ?',
    options: [
      { id: 'detailed', label: 'Oui, beaucoup de champs', delta: { layout: { table: 1 }, interaction: 1 } },
      { id: 'quick', label: 'Non, l\'édition rapide en ligne suffit', delta: { interaction: 2, layout: { table: 2 } } },
    ],
  },
  {
    id: 'q11',
    category: 'edition',
    text: 'Les données doivent-elles être validées avant enregistrement (champs obligatoires, formats) ?',
    options: [
      { id: 'strict', label: 'Oui, strictement', delta: { interaction: 1 } },
      { id: 'flexible', label: 'Non, flexibilité suffisante', delta: {} },
    ],
  },
  {
    id: 'q12',
    category: 'edition',
    text: 'Prévois-tu de supprimer souvent des lignes ?',
    options: [
      { id: 'often', label: 'Oui, régulièrement', delta: { interaction: 1 } },
      { id: 'rare', label: 'Rarement', delta: { interaction: -1 } },
    ],
  },
  {
    id: 'q13',
    category: 'volume',
    text: 'Combien de lignes environ contient ta table principale ?',
    options: [
      { id: 'small', label: 'Moins de 50', delta: { layout: { cards: 1, gallery: 1 } } },
      { id: 'medium', label: 'Entre 50 et 500', delta: { layout: { table: 1 } } },
      { id: 'large', label: 'Plus de 500', delta: { layout: { table: 2 }, widget: { stats: 1 } } },
    ],
  },
  {
    id: 'q14',
    category: 'volume',
    text: 'As-tu besoin de rechercher/filtrer souvent dans les données ?',
    options: [
      { id: 'always', label: 'En permanence', delta: { layout: { table: 2 } } },
      { id: 'sometimes', label: 'Occasionnellement', delta: { layout: { table: 1 } } },
      { id: 'rare', label: 'Rarement', delta: { layout: { cards: 1 } } },
    ],
  },
  {
    id: 'q16',
    category: 'style',
    text: 'Quelle densité d\'affichage préfères-tu ?',
    options: [
      { id: 'compact', label: 'Compacte, voir un maximum d\'information', delta: { density: 2 } },
      { id: 'spacious', label: 'Aérée, plus lisible', delta: { density: -2 } },
    ],
  },
  {
    id: 'q17',
    category: 'style',
    text: 'Les images sont-elles importantes dans tes données (produits, profils…) ?',
    options: [
      { id: 'yes', label: 'Oui, très importantes', delta: { layout: { gallery: 2 } } },
      { id: 'no', label: 'Non, peu ou pas d\'images', delta: { layout: { gallery: -1 } } },
    ],
  },
  {
    id: 'q18',
    category: 'style',
    text: 'Préfères-tu une présentation en tableau classique ou en cartes visuelles ?',
    options: [
      { id: 'table', label: 'Tableau classique', delta: { layout: { table: 2 } } },
      { id: 'cards', label: 'Cartes visuelles', delta: { layout: { cards: 2 } } },
      { id: 'mixed', label: 'Mélange selon la table', delta: {} },
    ],
  },
  {
    id: 'q19',
    category: 'collaboration',
    text: 'Plusieurs personnes modifieront-elles les mêmes données en parallèle ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { interaction: 2 } },
      { id: 'no', label: 'Non, un seul éditeur à la fois', delta: { interaction: -1 } },
    ],
  },
  {
    id: 'q20',
    category: 'collaboration',
    text: 'As-tu besoin de partager cette webapp avec des personnes externes ?',
    options: [
      { id: 'yes', label: 'Oui', delta: { layout: { cards: 1 }, interaction: -1 } },
      { id: 'no', label: 'Non, usage interne uniquement', delta: {} },
    ],
  },
]

function buildPrimaryTableQuestion(
  tables: readonly { tableName: string; rowCount: number }[],
): Question {
  const top = [...tables].sort((a, b) => b.rowCount - a.rowCount).slice(0, 3)
  const options: QuestionOption[] = [
    ...top.map((t) => ({
      id: `primary-${t.tableName}`,
      label: t.tableName,
      delta: { primaryTableName: t.tableName },
    })),
    { id: 'primary-none', label: 'Aucune en particulier', delta: {} },
  ]
  return {
    id: 'q15',
    category: 'volume',
    text: 'Quelle table est la plus importante pour toi ?',
    options,
  }
}

export function buildQuestionBank(
  tables: readonly { tableName: string; rowCount: number }[],
): Question[] {
  const q15 = buildPrimaryTableQuestion(tables)
  return [...STATIC_QUESTIONS.slice(0, 14), q15, ...STATIC_QUESTIONS.slice(14)]
}
