interface Props { rows?: number }

// Remplace un écran vide pendant le chargement des données par des barres
// grises qui pulsent, à la place du texte "Chargement…" brut.
function SkeletonRows({ rows = 6 }: Props) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <span className="skeleton-bar" style={{ width: '18%' }} />
          <span className="skeleton-bar" style={{ width: '32%' }} />
          <span className="skeleton-bar" style={{ width: '22%' }} />
          <span className="skeleton-bar" style={{ width: '14%' }} />
        </div>
      ))}
    </div>
  )
}

export default SkeletonRows
