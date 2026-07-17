import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'

interface Props { onFileSelected: (file: File) => void }

function DropZone({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) { setError('Seuls les fichiers .xlsx sont acceptés.'); return }
    setError(null)
    setFileName(file.name)
    onFileSelected(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`dropzone${isDragging ? ' dragging' : ''}`}
    >
      <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {fileName
        ? <p className="dropzone-filename">{fileName}</p>
        : <p className="dropzone-hint">Glissez un fichier <strong>.xlsx</strong> ici, ou cliquez pour en choisir un</p>
      }
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}

export default DropZone
