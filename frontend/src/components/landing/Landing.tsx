import './landing.css'
import logoDark from '../../assets/logo-dark.png'
import logoLight from '../../assets/logo-light.png'
import HeroDemo from './HeroDemo'
import Faq from './Faq'
import { useReveal } from './useReveal'
import { useI18n } from '../../lib/i18n'

interface Props {
  onStart: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [ref, visible] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal${visible ? ' reveal-visible' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Landing({ onStart, theme, onToggleTheme }: Props) {
  const { t, lang, setLang } = useI18n()

  const STEPS = [
    { n: '01', title: t('landing.step1.title'), body: t('landing.step1.body') },
    { n: '02', title: t('landing.step2.title'), body: t('landing.step2.body') },
    { n: '03', title: t('landing.step3.title'), body: t('landing.step3.body') },
    { n: '04', title: t('landing.step4.title'), body: t('landing.step4.body') },
  ]

  const FEATURES = [
    { title: t('landing.feat1.title'), body: t('landing.feat1.body') },
    { title: t('landing.feat2.title'), body: t('landing.feat2.body') },
    { title: t('landing.feat3.title'), body: t('landing.feat3.body') },
    { title: t('landing.feat4.title'), body: t('landing.feat4.body') },
  ]

  const FORMATS = [
    { label: t('landing.fmt.file'), value: t('landing.fmt.fileVal') },
    { label: t('landing.fmt.sheets'), value: t('landing.fmt.sheetsVal') },
    { label: t('landing.fmt.colTypes'), value: t('landing.fmt.colTypesVal') },
    { label: t('landing.fmt.dates'), value: t('landing.fmt.datesVal') },
  ]

  const FAQ_ITEMS = [
    { question: t('landing.faq1.q'), answer: t('landing.faq1.a') },
    { question: t('landing.faq2.q'), answer: t('landing.faq2.a') },
    { question: t('landing.faq3.q'), answer: t('landing.faq3.a') },
    { question: t('landing.faq4.q'), answer: t('landing.faq4.a') },
    { question: t('landing.faq5.q'), answer: t('landing.faq5.a') },
  ]

  return (
    <div className="landing">
      <header className="landing-nav">
        <button
          className="landing-nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Excelium"
        >
          <img src={logoDark} alt="Excelium" className="landing-nav-logo-img logo-dark" />
          <img src={logoLight} alt="Excelium" className="landing-nav-logo-img logo-light" />
        </button>
        <div className="landing-nav-actions">
          <button className="landing-nav-theme" onClick={onToggleTheme}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <div className="landing-lang" role="group" aria-label="Language">
            <button
              className={`landing-lang-btn${lang === 'fr' ? ' active' : ''}`}
              onClick={() => setLang('fr')}
            >
              FR
            </button>
            <span className="landing-lang-sep">|</span>
            <button
              className={`landing-lang-btn${lang === 'en' ? ' active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{t('landing.eyebrow')}</p>
          <p className="landing-formula">{t('landing.formula')}</p>
          <h1 className="landing-title">
            {t('landing.titleLine1')}<br />{t('landing.titleLine2')}
          </h1>
          <p className="landing-subtitle">{t('landing.subtitle')}</p>
          <div className="landing-cta-row">
            <button className="landing-cta-primary" onClick={onStart}>
              {t('landing.ctaPrimary')} →
            </button>
            <a className="landing-cta-secondary" href="#comment-ca-marche">
              {t('landing.ctaSecondary')}
            </a>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section id="comment-ca-marche" className="landing-section">
        <Reveal>
          <p className="landing-section-eyebrow">{t('landing.howEyebrow')}</p>
          <h2 className="landing-section-title">{t('landing.howTitle')}</h2>
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
          <p className="landing-section-eyebrow">{t('landing.underHoodEyebrow')}</p>
          <h2 className="landing-section-title">{t('landing.underHoodTitle')}</h2>
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
          <p className="landing-section-eyebrow">{t('landing.supportedEyebrow')}</p>
          <h2 className="landing-section-title">{t('landing.supportedTitle')}</h2>
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
          <p className="landing-section-eyebrow">{t('landing.faqEyebrow')}</p>
          <h2 className="landing-section-title">{t('landing.faqTitle')}</h2>
        </Reveal>
        <Reveal className="landing-faq-wrap">
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      <section className="landing-final-cta">
        <Reveal>
          <h2>{t('landing.finalCta')}</h2>
          <button className="landing-cta-primary" onClick={onStart}>
            {t('landing.ctaPrimary')} →
          </button>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <span>{t('landing.footer')}</span>
        <span>Anas Mrani Alaoui · Farah Romdhane</span>
      </footer>
    </div>
  )
}

export default Landing
