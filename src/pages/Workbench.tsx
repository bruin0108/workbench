import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { Plus, Download, Upload, HelpCircle, Search, Moon, Sun, X, Zap, Filter, Command, Copy, ClipboardPaste, Cloud } from 'lucide-react'
import { useWorkbenchStore } from '@/store/workbenchStore'
import WorkbenchDashboard from '@/components/workbench/Dashboard'
import CardRenderer from '@/components/workbench/CardRenderer'
import CardErrorBoundary from '@/components/workbench/CardErrorBoundary'
import ApiKeyModal from '@/components/workbench/ApiKeyModal'
import CloudSyncModal from '@/components/workbench/CloudSyncModal'
import { scheduleAutoPush, autoPullOnLoad } from '@/utils/gistAutoSync'
import { ConfirmModal } from '@/components/workbench/ConfirmModal'
import { useToast } from '@/components/workbench/Toast'
import type { Card } from '@/types/workbench'
import { getTheme, toggleTheme } from '@/App'

export default function PageView() {
  const {
    pages, currentPage, getPageDef, getPageTitle, addCard, exportData, importData,
    moveCard, deleteCard, duplicateCard, contextMenu, setContextMenu,
    copyToClipboard, pasteFromClipboard,
  } = useWorkbenchStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ pageId: string; fromIdx: number } | null>(null)
  const [showApiModal, setShowApiModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ pageId: string; cardId: string } | null>(null)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [quickCaptureText, setQuickCaptureText] = useState('')
  const [pageFilter, setPageFilter] = useState('')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [showCloudSync, setShowCloudSync] = useState(false)

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 自动云端同步：打开时拉取云端最新；之后任意本地改动自动上传（防抖）
  useEffect(() => {
    const unsub = useWorkbenchStore.subscribe(() => scheduleAutoPush())
    autoPullOnLoad()
    return () => unsub()
  }, [])

  const pageDef = getPageDef(currentPage)

  // 搜索结果用 useMemo 缓存
  const allSearchResults = useMemo(() => {
    const results: Array<{ pageId: string; card: Card; match: string }> = []
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return results
    Object.entries(pages).forEach(([pageId, cards]) => {
      cards.forEach((card) => {
        const searchText = [card.title, ...Object.values(card.fields), ...(card.entries || []).flatMap((e) => Object.values(e))].join(' ')
        if (searchText.toLowerCase().includes(q)) {
          results.push({ pageId, card, match: searchText })
        }
      })
    })
    return results
  }, [pages, debouncedQuery])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && currentPage !== 'dashboard') {
        e.preventDefault()
        addCard(currentPage)
        toast('新建了一张卡片', 'info')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/' && !quickCaptureOpen) {
        e.preventDefault()
        setShortcutsOpen(true)
      }
      if (e.ctrlKey && e.key === 'Enter' && currentPage !== 'dashboard') {
        e.preventDefault()
        setQuickCaptureOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentPage, addCard, toast, quickCaptureOpen])

  if (!pageDef) return null

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.download = `workbench-data-${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
    try { localStorage.setItem('wb_last_export', String(Date.now())) } catch {}
    toast('数据已导出')
  }

  const handleImport = () => { fileInputRef.current?.click() }

  const handleCopySync = async () => {
    const len = copyToClipboard()
    toast(`已复制 (${Math.round(len / 1024)}KB)，去另一台电脑点「粘贴同步」`)
  }

  const handlePasteSync = async () => {
    const ok = await pasteFromClipboard()
    if (ok) toast('已从剪贴板同步，刷新页面生效')
    else toast('失败：请先在另一台电脑点「复制同步」，再过来点「粘贴同步」')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setImportPreview(reader.result as string) }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmImport = () => {
    if (!importPreview) return
    const success = importData(importPreview)
    if (success) { toast('数据导入成功') }
    else { toast('导入失败：数据格式不正确', 'error') }
    setImportPreview(null)
  }

  const handleDragStart = (_e: React.DragEvent, idx: number) => {
    dragRef.current = { pageId: currentPage, fromIdx: idx }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    if (dragRef.current && dragRef.current.pageId === currentPage) {
      moveCard(currentPage, dragRef.current.fromIdx, toIdx)
    }
    dragRef.current = null
  }

  const handleDeleteClick = (pageId: string, cardId: string) => {
    setContextMenu(null)
    setConfirmDelete({ pageId, cardId })
  }

  const handleConfirmDelete = () => {
    if (!confirmDelete) return
    deleteCard(confirmDelete.pageId, confirmDelete.cardId)
    toast('卡片已删除')
    setConfirmDelete(null)
  }

  const handleQuickCapture = () => {
    const text = quickCaptureText.trim()
    if (!text) { setQuickCaptureOpen(false); return }
    addCard(currentPage)
    // Update the newly added card's main field
    const pages = useWorkbenchStore.getState().pages
    const pageCards = pages[currentPage] || []
    const lastCard = pageCards[pageCards.length - 1]
    if (lastCard) {
      useWorkbenchStore.getState().updateCardField(currentPage, lastCard.id, 'main', text)
      useWorkbenchStore.getState().updateCardField(currentPage, lastCard.id, 'title', text.slice(0, 30) + (text.length > 30 ? '...' : ''))
    }
    setQuickCaptureText('')
    setQuickCaptureOpen(false)
    toast('快速记录已保存')
  }

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), [setContextMenu])

  const cards = pages[currentPage] || []
  const totalCards = Object.values(pages).reduce((s, c) => s + c.length, 0)

  const toolbar = (
    <div className="glass-toolbar animate-fade-in">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <button onClick={handleExport} className="toolbar-btn export-btn"><Download size={14} /> 导出数据</button>
      <button onClick={handleImport} className="toolbar-btn"><Upload size={14} /> 导入数据</button>
      <button onClick={handleCopySync} className="toolbar-btn" title="复制到剪贴板 → 去另一台电脑粘贴"><Copy size={14} /> 复制同步</button>
      <button onClick={handlePasteSync} className="toolbar-btn" title="从剪贴板粘贴 → 替换当前数据"><ClipboardPaste size={14} /> 粘贴同步</button>
      <button onClick={() => setShowCloudSync(true)} className="toolbar-btn" title="云端同步（GitHub Gist，跨电脑常驻）"><Cloud size={14} /> 云端同步</button>
      <button onClick={() => setHelpOpen(true)} className="toolbar-btn"><HelpCircle size={14} /> 使用帮助</button>
      <span className="toolbar-status">{totalCards} 张卡片</span>
      <div className="w-px h-5 bg-[var(--border)] mx-1" />
      <button onClick={() => { toggleTheme(); setIsDark(!isDark) }} className="toolbar-btn" title={isDark ? '切换浅色' : '切换暗色'}>
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
      <button onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }} className="toolbar-btn">
        <Search size={14} /> 全局搜索 <span className="text-[10px] text-muted ml-0.5">Ctrl+K</span>
      </button>
      {currentPage !== 'dashboard' && (
        <>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <button onClick={() => { setQuickCaptureOpen(true); setTimeout(() => document.getElementById('qc-input')?.focus(), 50) }} className="toolbar-btn flex items-center gap-1">
            <Zap size={14} /> 快速记录
          </button>
          <button onClick={() => setShortcutsOpen(true)} className="toolbar-btn flex items-center gap-1">
            <Command size={14} /> 快捷键
          </button>
        </>
      )}
      <button onClick={() => setShowApiModal(true)} className="toolbar-btn flex items-center gap-1">
        ⚙️ AI 配置
      </button>
    </div>
  )

  const renderModals = () => (
    <>
      <ApiKeyModal open={showApiModal} onClose={() => setShowApiModal(false)} />
      <CloudSyncModal open={showCloudSync} onClose={() => setShowCloudSync(false)} />
      <ConfirmModal
        open={!!confirmDelete}
        title="删除卡片"
        message="确定要删除这张卡片吗？删除后可通过 Ctrl+Z 撤销。"
        confirmLabel="删除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      {searchOpen && (
        <SearchModal
          query={searchQuery}
          setQuery={setSearchQuery}
          results={allSearchResults}
          onClose={() => { setSearchOpen(false); setSearchQuery('') }}
          inputRef={searchInputRef}
          switchPage={(pageId) => { useWorkbenchStore.getState().switchPage(pageId); setSearchOpen(false); setSearchQuery('') }}
        />
      )}
      {importPreview && <ImportPreviewModal json={importPreview} onConfirm={handleConfirmImport} onCancel={() => setImportPreview(null)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {quickCaptureOpen && <QuickCaptureModal text={quickCaptureText} setText={setQuickCaptureText} onSave={handleQuickCapture} onClose={() => { setQuickCaptureOpen(false); setQuickCaptureText('') }} />}
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}
    </>
  )

  if (currentPage === 'dashboard') {
    return (
      <div className="page-content">
        {toolbar}
        <WorkbenchDashboard />
        {renderModals()}
      </div>
    )
  }

  return (
    <div className="page-content" onClick={handleCloseContextMenu}>
      {toolbar}

      <div className="mb-5 pb-3 border-b border-rule-bg flex items-end flex-wrap gap-2">
        <h1 className="text-xl font-bold text-ink">{getPageTitle(currentPage)}</h1>
        {pageDef.badge && <span className="ai-badge">{pageDef.badge}</span>}
        <div className="text-sm text-muted w-full">{pageDef.desc}</div>
      </div>

      <button onClick={() => { addCard(currentPage); toast('新建了一张卡片', 'info') }} className="add-card-btn">
        <Plus size={16} className="inline-block mr-1" /> 新建卡片 <span className="text-[10px] text-muted ml-1">Ctrl+N</span>
      </button>

      {/* Page-local filter */}
      {cards.length > 2 && (
        <div className="flex items-center gap-2 mt-3 mb-2">
          <Filter size={12} className="text-[var(--muted)]" />
          <input
            type="text"
            value={pageFilter}
            onChange={e => setPageFilter(e.target.value)}
            placeholder="在当前页面中筛选卡片..."
            className="flex-1 text-[12px] px-3 py-1.5 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] bg-transparent placeholder:text-[var(--muted)]/50"
          />
          {pageFilter && (
            <button onClick={() => setPageFilter('')} className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)]">清除</button>
          )}
        </div>
      )}

      <div>
        {cards.filter(c => {
          if (!pageFilter.trim()) return true
          const q = pageFilter.toLowerCase()
          return c.title.toLowerCase().includes(q) || Object.values(c.fields).some(v => v.toLowerCase().includes(q))
        }).map((card, idx) => (
          <div
            key={card.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
            className="animate-card-in"
            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
          >
            <CardErrorBoundary title={card.title}>
              <CardRenderer card={card} pageId={currentPage} index={idx} onDragStartCard={handleDragStart} />
            </CardErrorBoundary>
          </div>
        ))}
      </div>

      {contextMenu && (
        <ContextMenu onDelete={handleDeleteClick} onDuplicate={(pid, cid) => { duplicateCard(pid, cid); setContextMenu(null); toast('卡片已复制') }} onAddAbove={(pid) => { addCard(pid); setContextMenu(null) }} />
      )}

      {renderModals()}
    </div>
  )
}

// ============ Modals ============

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[801] flex items-center justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 w-full max-w-lg pointer-events-auto max-h-[80vh] overflow-y-auto border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--ink)]">使用帮助</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={18} /></button>
          </div>

          <div className="space-y-4 text-[13px] leading-relaxed">
            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">快捷键</div>
              <div className="text-[var(--muted)] space-y-1">
                <div><kbd className="px-1.5 py-0.5 bg-[var(--bg-rule)] rounded text-[11px] font-mono">Ctrl+K</kbd> 全局搜索</div>
                <div><kbd className="px-1.5 py-0.5 bg-[var(--bg-rule)] rounded text-[11px] font-mono">Ctrl+N</kbd> 新建卡片</div>
                <div><kbd className="px-1.5 py-0.5 bg-[var(--bg-rule)] rounded text-[11px] font-mono">Ctrl+Z</kbd> 撤销</div>
                <div><kbd className="px-1.5 py-0.5 bg-[var(--bg-rule)] rounded text-[11px] font-mono">Ctrl+Shift+Z</kbd> 重做</div>
                <div>右键卡片 → 复制 / 删除 / 在上方新建</div>
                <div>拖拽卡片调整顺序</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">📊 首页</div>
              <div className="text-[var(--muted)] space-y-1">
                <div>今日任务打勾 + 连续天数统计 + 完成率</div>
                <div>鼠标悬停任务行 → 点击 ✎ 编辑任务内容</div>
                <div>底部备注栏：记录额外完成的事情</div>
                <div>每天 9:30 自动刷新任务</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">培训交付 · 工作中心</div>
              <div className="text-[var(--muted)] space-y-1">
                <div><strong>体系拆解库</strong> — 上传培训文档，AI 自动分析体系、课程、制度、交付</div>
                <div><strong>培训创意工坊</strong> — 收集培训创意、破冰游戏、激励方案</div>
                <div><strong>领导致辞记录</strong> — AI 自动提炼领导讲话核心观点</div>
                <div><strong>社群运营话术</strong> — 四类培训通知模板 + AI 自动生成通知</div>
                <div><strong>项目看板</strong> — AI 自动分类、记录培训项目，支持状态筛选</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">专业能力成长库</div>
              <div className="text-[var(--muted)] space-y-1">
                <div><strong>理论知识体系</strong> — 培训模型、方法论，AI 对话学习</div>
                <div><strong>办公技能精进</strong> — PPT 自动生成 Skill + Excel/写作技巧</div>
                <div><strong>数字化工具</strong> — AI 工具和效率工具，AI 对话学习</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">小熊要更好</div>
              <div className="text-[var(--muted)] space-y-1">
                <div><strong>学习计划</strong> — 一年学习规划 + 目标总览 + 里程碑 + AI 教练</div>
                <div><strong>英语学习</strong> — AI 陪跑：评估→计划→执行→检查</div>
                <div><strong>看书</strong> — AI 陪读：读前引导→记录→提炼→串联</div>
                <div><strong>学习复盘</strong> — KISS 复盘、周复盘、月复盘</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">🧭 侧边栏操作</div>
              <div className="text-[var(--muted)] space-y-1">
                <div>双击页面标题 → 修改名称</div>
                <div>拖拽 ⋮⋮ 图标 → 调整页面顺序</div>
                <div>点击分组标题 → 折叠/展开</div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-[var(--ink)] mb-1.5">🌙 其他</div>
              <div className="text-[var(--muted)] space-y-1">
                <div>点击 ☀️/🌙 切换暗色模式</div>
                <div>导出数据 → 下载 JSON 备份文件</div>
                <div>导入数据 → 从备份文件恢复</div>
                <div>复制同步 → 复制到剪贴板，去另一台电脑点「粘贴同步」（跨设备同步）</div>
                <div className="text-[11px] text-[var(--muted)] mt-1">提示：所有数据保存在浏览器本地，建议定期导出备份。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ImportPreviewModal({ json, onConfirm, onCancel }: { json: string; onConfirm: () => void; onCancel: () => void }) {
  let preview: { pages: Record<string, Array<{ title: string }>>; projects: Array<{ name: string }>; chatHistory?: Record<string, unknown> } | null = null
  try { preview = JSON.parse(json) } catch {}

  const chatCount = preview?.chatHistory ? Object.keys(preview.chatHistory).length : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onCancel} />
      <div className="fixed inset-0 z-[801] flex items-center justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto max-h-[80vh] overflow-y-auto border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-base font-bold text-[var(--ink)] mb-3">📦 导入数据预览</h2>
          {preview ? (
            <>
              <p className="text-[13px] text-[var(--muted)] mb-3 leading-relaxed">即将导入以下数据，将覆盖当前内容：</p>
              <div className="space-y-2 mb-4">
                {preview.pages && (
                  <div className="bg-[var(--accent-light)] rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-[var(--muted)] mb-1">页面 & 卡片</div>
                    {Object.entries(preview.pages).map(([pageId, cards]) => (
                      <div key={pageId} className="text-[12px] text-[var(--ink)]">{pageId}: <span className="text-[var(--accent)] font-semibold">{cards.length}</span> 张卡片</div>
                    ))}
                  </div>
                )}
                {preview.projects && (
                  <div className="bg-[var(--accent2-light)] rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-[var(--muted)] mb-1">项目</div>
                    <div className="text-[12px] text-[var(--ink)]">
                      共 <span className="text-[var(--accent2)] font-semibold">{preview.projects.length}</span> 个项目
                      {preview.projects.slice(0, 5).map((p, i) => <span key={i} className="text-[var(--muted)] ml-1">· {p.name}</span>)}
                      {preview.projects.length > 5 && <span className="text-[var(--muted)]"> ...</span>}
                    </div>
                  </div>
                )}
                {chatCount > 0 && (
                  <div className="bg-[var(--accent-light)] rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-[var(--muted)] mb-1">AI 对话记录</div>
                    <div className="text-[12px] text-[var(--ink)]">共 <span className="text-[var(--accent)] font-semibold">{chatCount}</span> 个对话页面</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-rule)] transition-colors">取消</button>
                <button onClick={onConfirm} className="px-6 py-2 text-[13px] font-medium text-white bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity">确认导入</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-red-500 mb-4">JSON 格式不正确，无法预览</p>
              <div className="flex gap-2 justify-end"><button onClick={onCancel} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-rule)] transition-colors">关闭</button></div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ContextMenu({ onDelete, onDuplicate, onAddAbove }: {
  onDelete: (pid: string, cid: string) => void
  onDuplicate: (pid: string, cid: string) => void
  onAddAbove: (pid: string) => void
}) {
  const { contextMenu, setContextMenu } = useWorkbenchStore()
  if (!contextMenu) return null
  const { x, y, pageId, cardId } = contextMenu

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
      <div className="fixed bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-[999] min-w-[160px] py-1 overflow-hidden"
        style={{ left: Math.min(x, window.innerWidth - 170), top: Math.min(y, window.innerHeight - 150) }}>
        <button onClick={() => onDuplicate(pageId, cardId)} className="ctx-menu-item">复制卡片</button>
        <button onClick={() => onAddAbove(pageId)} className="ctx-menu-item">在上方新建卡片</button>
        <div className="border-t border-[var(--border)] my-1" />
        <button onClick={() => onDelete(pageId, cardId)} className="ctx-menu-item danger">删除卡片</button>
      </div>
    </>
  )
}

function SearchModal({ query, setQuery, results, onClose, inputRef, switchPage }: {
  query: string; setQuery: (v: string) => void; results: Array<{ pageId: string; card: Card; match: string }>; onClose: () => void
  inputRef: React.RefObject<HTMLInputElement>; switchPage: (pageId: string) => void
}) {
  const pageDefs = useWorkbenchStore((s) => s.getPageDef)

  const highlightText = (text: string, q: string) => {
    if (!q.trim()) return text.length > 120 ? text.substring(0, 120) + '...' : text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text.length > 120 ? text.substring(0, 120) + '...' : text
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + q.length + 80)
    const before = text.substring(start, idx)
    const match = text.substring(idx, idx + q.length)
    const after = text.substring(idx + q.length, end)
    return <>{start > 0 && '...'}{before}<mark className="bg-yellow-200 dark:bg-yellow-600 dark:text-white rounded px-0.5">{match}</mark>{after}{end < text.length && '...'}</>
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 top-[15%] z-[801] flex justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[60vh] flex flex-col border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
            <Search size={16} className="text-[var(--muted)] shrink-0" />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索所有页面中的卡片内容... (Esc 关闭)"
              className="flex-1 text-[14px] outline-none bg-transparent text-[var(--ink)] placeholder:text-[var(--muted)]"
              onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} />
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)] shrink-0"><X size={16} /></button>
          </div>
          <div className="overflow-y-auto p-2">
            {!query.trim() && <p className="text-[13px] text-[var(--muted)] text-center py-8">输入关键词搜索所有卡片</p>}
            {query.trim() && results.length === 0 && <p className="text-[13px] text-[var(--muted)] text-center py-8">未找到相关卡片</p>}
            {results.map((r, i) => {
              const pageDef = pageDefs(r.pageId)
              const previewText = r.card.fields.main || r.match
              return (
                <button key={i} onClick={() => switchPage(r.pageId)}
                  className="w-full text-left p-3 rounded-lg hover:bg-[var(--accent-light)] transition-colors border border-transparent hover:border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-[var(--ink)]">{r.card.title}</span>
                    {pageDef && <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.5 bg-[var(--bg-rule)] rounded">{pageDef.title}</span>}
                  </div>
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed line-clamp-2">{highlightText(previewText, query)}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

function QuickCaptureModal({ text, setText, onSave, onClose }: { text: string; setText: (v: string) => void; onSave: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[801] flex items-center justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 w-full max-w-lg pointer-events-auto border border-[var(--border)]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2"><Zap size={18} className="text-accent" /> 快速记录</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={18} /></button>
          </div>
          <p className="text-[12px] text-[var(--muted)] mb-3">记录一闪而过的想法，自动保存到当前页面</p>
          <textarea
            id="qc-input"
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="写下你的想法..."
            rows={4}
            className="w-full text-[14px] px-3 py-2.5 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)] bg-transparent resize-none"
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSave(); if (e.key === 'Escape') onClose() }}
          />
          <div className="flex gap-2 justify-end mt-3">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-rule)] transition-colors">取消</button>
            <button onClick={onSave} className="px-6 py-2 text-[13px] font-medium text-white bg-[var(--accent)] rounded-md hover:opacity-90 transition-opacity">记录 <span className="text-[10px] opacity-60 ml-1">Ctrl+Enter</span></button>
          </div>
        </div>
      </div>
    </>
  )
}

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: 'Ctrl+K', desc: '全局搜索' },
    { keys: 'Ctrl+N', desc: '新建卡片' },
    { keys: 'Ctrl+Enter', desc: '快速记录' },
    { keys: 'Ctrl+Z', desc: '撤销' },
    { keys: 'Ctrl+Shift+Z', desc: '重做' },
    { keys: 'Ctrl+/', desc: '显示快捷键面板' },
    { keys: '右键卡片', desc: '复制/删除/在上方新建' },
    { keys: '拖拽卡片', desc: '调整顺序' },
    { keys: '点击昵称', desc: '修改 Dashboard 昵称' },
  ]
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[800] backdrop-blur-sm dark:bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[801] flex items-center justify-center pointer-events-none">
        <div className="bg-white dark:bg-[var(--bg-card)] rounded-xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto border border-[var(--border)]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2"><Command size={16} className="text-accent" /> 快捷键</h2>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={18} /></button>
          </div>
          <div className="space-y-2">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[13px] py-1.5 border-b border-[var(--border)] last:border-b-0">
                <span className="text-[var(--ink)]">{s.desc}</span>
                <kbd className="px-2 py-0.5 bg-[var(--bg-rule)] rounded text-[11px] font-mono text-[var(--muted)]">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
