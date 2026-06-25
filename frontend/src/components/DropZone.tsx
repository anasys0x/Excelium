import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'

interface Props {
  onFileSelected: (file: File) => void
}

function DropZone({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setError('Seuls les fichiers .xlsx sont acceptés.')
      return
    }
    setError(null)
    setFileName(file.name)
    onFileSelected(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: '12px',
        padding: '60px 40px',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragging ? 'var(--accent-soft)' : 'var(--surface)',
        transition: 'all 0.2s ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {fileName ? (
        <p style={{ color: 'var(--accent-text)', fontWeight: 600, margin: 0 }}>✅ {fileName}</p>
      ) : (
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Glissez un fichier <strong>.xlsx</strong> ici, ou cliquez pour en choisir un
        </p>
      )}

      {error && <p style={{ color: 'var(--danger-text)', marginTop: '8px' }}>{error}</p>}
    </div>
  )
}

export default DropZone
