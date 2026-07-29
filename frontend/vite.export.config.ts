import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build séparé pour la webapp exportée (voir docs/superpowers/specs/
// 2026-07-29-export-webapp-zip-design.md). N'affecte jamais le build
// principal (vite.config.ts, index.html) : point d'entrée et dossier de
// sortie différents. `npm run build:export` produit `dist-export/`, buildé
// une seule fois et réutilisé pour chaque export (le backend n'y écrit que
// config.json).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-export',
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./export.html', import.meta.url)),
    },
  },
})
