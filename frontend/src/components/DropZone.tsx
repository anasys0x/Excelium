import { useState, useRef } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { useI18n } from '../lib/i18n'

interface Props { onFileSelected: (file: File) => void; onCancel?: () => void }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function DropZone({ onFileSelected, onCancel }: Props) {
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile]             = useState<File | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCancel = () => {
    setFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onCancel?.()
  }

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) { setError(t('dropzone.errorXlsx')); return }
    setError(null)
    setFile(f)
    onFileSelected(f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`dropzone${isDragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
    >
      <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {file && (
        <button
          type="button"
          className="dropzone-cancel"
          aria-label={t('dropzone.cancel')}
          title={t('dropzone.cancel')}
          onClick={(e) => { e.stopPropagation(); handleCancel() }}
        >
          ✕
        </button>
      )}
      <div className="dropzone-icon">
        {file ? <span className="dropzone-check">✓</span> : <FileIcon />}
      </div>
      {file
        ? (
          <>
            <p className="dropzone-filename">{file.name}</p>
            <p className="dropzone-filesize">{formatSize(file.size)}</p>
          </>
        )
        : <p className="dropzone-hint">{t('dropzone.hint')}</p>
      }
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}

export default DropZone
