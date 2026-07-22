// Grille signature de la page d'accueil : des cellules de tableur qui se
// transforment tour à tour en éléments d'interface (badge, jauge, barre de
// graphique) — la mécanique du produit rendue visible en une seule image.
const COLS = 6
const ROWS = 4
const KINDS = ['plain', 'badge', 'bar', 'progress', 'plain', 'plain'] as const

function HeroGrid() {
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const kind = KINDS[i % KINDS.length]
    const delay = (i % COLS) * 0.35 + Math.floor(i / COLS) * 0.5
    return { id: i, kind, delay }
  })

  return (
    <div className="hero-grid" aria-hidden="true">
      {cells.map((cell) => (
        <div
          key={cell.id}
          className={`hero-cell hero-cell-${cell.kind}`}
          style={{ animationDelay: `${cell.delay}s` }}
        />
      ))}
    </div>
  )
}

export default HeroGrid
