import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastKind = 'error' | 'success' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface Ctx {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<Ctx | null>(null)

const TOAST_DURATION_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = ++nextId.current
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`toast toast-${toast.kind}`}
            onClick={() => dismiss(toast.id)}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return ctx
}
