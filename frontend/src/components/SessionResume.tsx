import { useState } from 'react'
import { useI18n } from '../lib/i18n'

interface Props {
  onResume: (sessionId: string) => void
  isLoading: boolean
  error: string | null
}

function SessionResume({ onResume, isLoading, error }: Props) {
  const { t } = useI18n()
  const [sessionId, setSessionId] = useState('')
  const normalizedId = sessionId.trim()

  return (
    <section className="session-resume">
      <div className="session-resume-divider"><span>{t('resume.or')}</span></div>
      <h2>{t('resume.title')}</h2>
      <p>{t('resume.desc')}</p>
      <form
        className="session-resume-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (normalizedId) onResume(normalizedId)
        }}
      >
        <label htmlFor="session-id">{t('resume.label')}</label>
        <div>
          <input
            id="session-id"
            type="text"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading}
          />
          <button type="submit" className="btn-primary" disabled={!normalizedId || isLoading}>
            {isLoading ? t('resume.loading') : t('resume.button')}
          </button>
        </div>
      </form>
      {error && <p className="session-resume-error">{error}</p>}
    </section>
  )
}

export default SessionResume
