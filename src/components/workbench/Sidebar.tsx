import { useState } from 'react'
import { ChevronDown, GripVertical } from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { PAGE_DEFS, PAGE_GROUPS } from '@/types/workbench'

export default function Sidebar() {
  const { currentPage, collapsedGroups, switchPage, toggleGroup, getPageTitle, setPageTitle, getPageOrder, movePage } = useWorkbenchStore()
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragGroup, setDragGroup] = useState<string | null>(null)

  const handleDoubleClick = (pageId: string, currentTitle: string) => {
    setEditingPage(pageId)
    setEditValue(currentTitle)
  }

  const handleSave = (pageId: string) => {
    if (editValue.trim()) {
      setPageTitle(pageId, editValue.trim())
    }
    setEditingPage(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') handleSave(pageId)
    if (e.key === 'Escape') setEditingPage(null)
  }

  const handleDragStart = (e: React.DragEvent, groupId: string, idx: number) => {
    setDragIdx(idx)
    setDragGroup(groupId)
    e.dataTransfer.effectAllowed = 'move'
    ;(e.currentTarget as HTMLElement).classList.add('opacity-40')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, groupId: string, toIdx: number) => {
    e.preventDefault()
    if (dragIdx !== null && dragGroup === groupId && dragIdx !== toIdx) {
      movePage(groupId, dragIdx, toIdx)
    }
    setDragIdx(null)
    setDragGroup(null)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).classList.remove('opacity-40')
    setDragIdx(null)
    setDragGroup(null)
  }

  return (
    <aside className="w-[260px] bg-[var(--bg-sidebar)] border-r border-[var(--border)] fixed top-0 left-0 bottom-0 overflow-y-auto z-[200] flex flex-col flex-shrink-0">
      <div className="px-5 py-6 border-b border-[var(--border)]">
        <div className="text-base font-bold text-[var(--ink)] tracking-wide">🐻 小熊的工作台</div>
        <div className="text-xs text-[var(--muted)] mt-1">AI 智能工作台</div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        <button
          onClick={() => switchPage('dashboard')}
          className={`flex items-center gap-2.5 w-full px-5 py-2.5 text-sm border-l-[3px] transition-all duration-200 mb-1
            ${currentPage === 'dashboard'
              ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[var(--ink)] hover:bg-[var(--accent-light)] hover:border-[var(--border)]'
            }`}
        >
          <span className="text-base">📊</span> 首页
        </button>
        {PAGE_GROUPS.map((group) => {
          const orderedIds = getPageOrder(group.id)
          const pages = orderedIds.map((id) => PAGE_DEFS.find((p) => p.id === id)).filter(Boolean) as typeof PAGE_DEFS
          const collapsed = collapsedGroups.has(group.id)
          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex items-center gap-1.5 w-full px-5 py-2.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider hover:text-[var(--ink)] transition-colors text-left"
              >
                <ChevronDown
                  size={10}
                  className="transition-transform duration-200"
                  style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                />
                {group.label}
              </button>
              <ul className={`${collapsed ? 'hidden' : ''}`}>
                {pages.map((page, idx) => {
                    const title = getPageTitle(page.id)
                    const isEditing = editingPage === page.id
                    return (
                  <li key={page.id}>
                    {isEditing ? (
                      <div className="px-5 py-1 pl-9 mr-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSave(page.id)}
                          onKeyDown={(e) => handleKeyDown(e, page.id)}
                          className="w-full text-sm px-2 py-1.5 border border-[var(--accent)] rounded outline-none bg-[var(--accent-light)]"
                        />
                      </div>
                    ) : (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, group.id, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, group.id, idx)}
                        onDragEnd={handleDragEnd}
                        className="group flex items-center mr-2"
                      >
                        <span className="pl-2 cursor-grab active:cursor-grabbing text-[var(--muted)]/30 group-hover:text-[var(--muted)]/60 transition-colors">
                          <GripVertical size={12} />
                        </span>
                        <button
                          onClick={() => switchPage(page.id)}
                          onDoubleClick={() => handleDoubleClick(page.id, title)}
                          title="双击修改标题，拖拽调整顺序"
                          className={`block flex-1 text-left py-2 pr-5 text-sm border-l-[3px] rounded-r transition-all duration-200
                            ${currentPage === page.id
                              ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                              : 'border-transparent text-[var(--ink)] hover:bg-[var(--accent-light)] hover:border-[var(--border)]'
                            }`}
                        >
                          {title}
                        </button>
                      </div>
                    )}
                  </li>
                    )
                  })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
