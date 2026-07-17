import { useState } from 'react'

interface Props {
  onResume: (sessionId: string) => void
  isLoading: boolean
  error: string | null
}

function SessionResume({ onResume, isLoading, error }: Props) {
  const [sessionId, setSessionId] = useState('')
  const normalizedId = sessionId.trim()

  return (
    <section className="session-resume">
      <div className="session-resume-divider"><span>ou</span></div>
      <h2>Reprendre une session</h2>
      <p>Colle l’identifiant reçu lors de la création pour rouvrir la webapp.</p>
      <form
        className="session-resume-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (normalizedId) onResume(normalizedId)
        }}
      >
        <label htmlFor="session-id">Identifiant de session</label>
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
            {isLoading ? 'Chargement…' : 'Reprendre'}
          </button>
        </div>
      </form>
      {error && <p className="session-resume-error">{error}</p>}
    </section>
  )
}

export default SessionResume
