import './landing.css'
import HeroGrid from './HeroGrid'
import Faq from './Faq'
import { useReveal } from './useReveal'

interface Props {
  onStart: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

const STEPS = [
  {
    n: '01',
    title: 'Dépose ton fichier',
    body: 'Glisse un .xlsx. Excelium lit chaque feuille, chaque tableau, et devine le type de chaque colonne.',
  },
  {
    n: '02',
    title: 'Vérifie la structure',
    body: 'Clé primaire, clés étrangères entre feuilles, colonnes à exclure : tout est proposé, rien n\'est figé.',
  },
  {
    n: '03',
    title: 'Réponds à quelques questions',
    body: 'Une dizaine de questions courtes sur le sens de tes données. Trois interfaces se dessinent en direct pendant que tu réponds.',
  },
  {
    n: '04',
    title: 'Choisis et c\'est prêt',
    body: 'Base PostgreSQL créée, webapp générée avec CRUD complet. Modifiable, exportable, à tout moment.',
  },
]

const FEATURES = [
  {
    title: 'Détection de types',
    body: 'Nombre, décimal, texte, date, oui/non, mixte, devinés colonne par colonne à partir des valeurs réelles.',
  },
  {
    title: 'Clés & relations',
    body: 'Identifiants, doublons, et références entre feuilles détectés automatiquement, avec analyse d\'impact avant suppression.',
  },
  {
    title: 'Interface qui comprend le sens',
    body: 'Contacts, ventes, catalogue, événements : Excelium reconnaît le type de tes données et propose la vue qui leur correspond.',
  },
  {
    title: 'Export sans verrou',
    body: 'Ressors tes données en Excel ou en SQL brut à tout moment. Rien n\'est retenu en otage.',
  },
]

const FORMATS = [
  { label: 'Fichier', value: '.xlsx' },
  { label: 'Feuilles', value: 'Plusieurs feuilles, plusieurs tableaux par feuille' },
  { label: 'Types de colonnes', value: 'Nombre · Décimal · Texte · Date · Oui/Non · Mixte' },
  { label: 'Formats de date lus', value: 'JJ/MM/AAAA, AAAA-MM-JJ, MM/JJ/AAAA et variantes' },
]

const FAQ_ITEMS = [
  {
    question: 'Mes formules Excel (SOMME, MOYENNE...) sont-elles conservées ?',
    answer: 'Non. Excelium importe les valeurs calculées, pas les formules elles-mêmes. Une fois dans la webapp, les totaux et moyennes que tu vois sont recalculés en direct sur les données réelles, mais la formule Excel d\'origine n\'est pas rejouée.',
  },
  {
    question: 'Où sont stockées mes données ?',
    answer: 'Dans une base PostgreSQL que tu contrôles. Le backend tourne en local, sur ta propre machine ou ton propre serveur. Rien n\'est envoyé à un service tiers.',
  },
  {
    question: 'Je n\'ai pas de colonne identifiant, ça bloque ?',
    answer: 'Non. Si aucune colonne ne fait un bon identifiant unique, Excelium peut en générer un automatiquement, numéroté de 1 à N.',
  },
  {
    question: 'Puis-je changer l\'interface après la génération ?',
    answer: 'Oui. Le modèle de vue (tableau, cartes, galerie, tableau de bord) reste modifiable depuis la webapp générée, à tout moment, sans repartir de zéro.',
  },
  {
    question: 'Est-ce que je peux reprendre une session plus tard ?',
    answer: 'Oui. Un identifiant de session t\'est donné à la création. Colle-le sur l\'écran d\'import pour rouvrir ta webapp et modifier tes choix.',
  },
]

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal${visible ? ' reveal-visible' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Landing({ onStart, theme, onToggleTheme }: Props) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <button
          className="landing-nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Excelium
        </button>
        <div className="landing-nav-actions">
          <a
            className="landing-nav-link"
            href="https://github.com/anasys0x/Excelium"
            target="_blank"
            rel="noreferrer"
          >
            Code source
          </a>
          <button className="landing-nav-theme" onClick={onToggleTheme}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Excel → webapp</p>
          <p className="landing-formula">=TRANSFORMER(classeur.xlsx)</p>
          <h1 className="landing-title">
            Ton classeur devient<br />une vraie application web.
          </h1>
          <p className="landing-subtitle">
            Dépose un fichier Excel, réponds à quelques questions sur le sens de tes données,
            et repars avec une base PostgreSQL et une interface CRUD générée pour toi.
            Pas un tableau statique de plus.
          </p>
          <div className="landing-cta-row">
            <button className="landing-cta-primary" onClick={onStart}>
              Créer ma WebApp →
            </button>
            <a className="landing-cta-secondary" href="#comment-ca-marche">
              Voir comment ça marche
            </a>
          </div>
        </div>
        <HeroGrid />
      </section>

      <section id="comment-ca-marche" className="landing-section">
        <Reveal>
          <p className="landing-section-eyebrow">Le parcours</p>
          <h2 className="landing-section-title">Comment ça marche</h2>
        </Reveal>
        <div className="landing-steps">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} className="landing-step-wrap">
              <div className="landing-step" style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="landing-step-n">{step.n}</span>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-body">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <Reveal>
          <p className="landing-section-eyebrow">Sous le capot</p>
          <h2 className="landing-section-title">Ce qu'Excelium détecte pour toi</h2>
        </Reveal>
        <div className="landing-features">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} className="landing-feature-wrap">
              <div className="landing-feature" style={{ transitionDelay: `${i * 70}ms` }}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section landing-formats-section">
        <Reveal>
          <p className="landing-section-eyebrow">Ce qui est supporté</p>
          <h2 className="landing-section-title">Formats reconnus</h2>
        </Reveal>
        <Reveal>
          <dl className="landing-formats">
            {FORMATS.map((row) => (
              <div key={row.label} className="landing-formats-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <section className="landing-section">
        <Reveal>
          <p className="landing-section-eyebrow">Questions fréquentes</p>
          <h2 className="landing-section-title">FAQ</h2>
        </Reveal>
        <Reveal className="landing-faq-wrap">
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      <section className="landing-final-cta">
        <Reveal>
          <h2>Prêt à transformer ton premier classeur ?</h2>
          <button className="landing-cta-primary" onClick={onStart}>
            Créer ma WebApp →
          </button>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span>Excelium · IFT3150, Été 2026</span>
        <span>Anas Mrani Alaoui · Farah Romdhane</span>
      </footer>
    </div>
  )
}

export default Landing
