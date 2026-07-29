import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../App.css'
import ExportApp from './ExportApp'
import { LanguageProvider } from '../lib/i18n.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ExportApp />
    </LanguageProvider>
  </StrictMode>,
)
