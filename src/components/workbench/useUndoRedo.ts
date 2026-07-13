import { useCallback, useEffect, useRef } from 'react'
import { useWorkbenchStore } from '@/store/workbenchStore'

const MAX_HISTORY = 50

export function useUndoRedo() {
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const skipNext = useRef(false)

  const snapshot = useCallback(() => {
    const { pages, projects, pageTitles, pageOrder } = useWorkbenchStore.getState()
    return JSON.stringify({ pages, projects, pageTitles, pageOrder })
  }, [])

  const pushSnapshot = useCallback(() => {
    if (skipNext.current) { skipNext.current = false; return }
    const snap = snapshot()
    undoStack.current.push(snap)
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
    redoStack.current = []
  }, [snapshot])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const current = snapshot()
    redoStack.current.push(current)
    const prev = undoStack.current.pop()!
    skipNext.current = true
    try {
      const data = JSON.parse(prev)
      useWorkbenchStore.setState({
        pages: data.pages,
        projects: data.projects || [],
        pageTitles: data.pageTitles || {},
        pageOrder: data.pageOrder || {},
      })
    } catch {}
  }, [snapshot])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const current = snapshot()
    undoStack.current.push(current)
    const next = redoStack.current.pop()!
    skipNext.current = true
    try {
      const data = JSON.parse(next)
      useWorkbenchStore.setState({
        pages: data.pages,
        projects: data.projects || [],
        pageTitles: data.pageTitles || {},
        pageOrder: data.pageOrder || {},
      })
    } catch {}
  }, [snapshot])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault(); redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault(); redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return { pushSnapshot, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 }
}
