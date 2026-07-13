import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel = '确认', danger = false, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onCancel} />
      <div className="fixed inset-0 z-[801] flex items-center justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto border border-[var(--border)]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-3">
            {danger && <AlertTriangle size={20} className="text-red-500 shrink-0" />}
            <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
          </div>
          <p className="text-[13px] text-[var(--muted)] mb-5 leading-relaxed">{message}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-rule)] transition-colors">取消</button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2 text-[13px] font-medium text-white rounded-md hover:opacity-90 transition-opacity ${danger ? 'bg-red-500' : 'bg-[var(--accent)]'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
