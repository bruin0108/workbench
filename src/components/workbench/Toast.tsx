import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = {
  success: 'border-green-400 text-green-800 bg-green-50 dark:bg-green-900/20 dark:text-green-300',
  error: 'border-red-400 text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-300',
  info: 'border-blue-400 text-blue-800 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  let nextId = 0

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId
    setItems(prev => [...prev.slice(-3), { id, type, message }])
    setTimeout(() => setItems(prev => prev.filter(it => it.id !== id)), 3500)
  }, [])

  const remove = (id: number) => setItems(prev => prev.filter(it => it.id !== id))

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {items.map(item => {
          const Icon = icons[item.type]
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm animate-scaleIn max-w-sm ${colors[item.type]}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{item.message}</span>
              <button onClick={() => remove(item.id)} className="shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
