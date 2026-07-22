import { GripVertical, ChevronDown, ChevronRight, Pencil, X, Check } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Card, formatFieldLabel, PAGE_DEFS } from '@/types/workbench'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { useToast } from './Toast'
import ProjectTable from './ProjectTable'
import NotifyGenerator from './NotifyGenerator'
import SystemAnalyzer from './SystemAnalyzer'
import AskAI from './AskAI'
import NotebookCard from './NotebookCard'
import ErrorSummary from './ErrorSummary'
import { Markdown } from './Markdown'
import { autoFormatText } from '@/utils/autoFormat'
import SpeakButton from './SpeakButton'

/**
 * Smart field renderer:
 * - Short text (< 60 chars, no newlines): inline contentEditable (quick edit)
 * - Long text: Markdown-rendered view mode + textarea edit mode (click to edit)
 */
function FieldContent({ value, placeholder, onSave, renderKey }: {
  value: string
  placeholder: string
  onSave: (text: string) => void
  renderKey: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync external value changes (e.g. import)
  useEffect(() => {
    setDraft(value)
    setEditing(false)
  }, [renderKey, value])

  // Auto-resize textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = Math.max(80, ta.scrollHeight + 8) + 'px'
    }
  }, [editing, draft])

  const isLong = value.length > 60 || value.includes('\n')

  // --- Edit mode (textarea) ---
  if (editing) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            onSave(draft.trim())
            setEditing(false)
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setDraft(value)
              setEditing(false)
            }
            // Ctrl/Cmd + Enter to save
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              onSave(draft.trim())
              setEditing(false)
            }
          }}
          className="field-edit-area"
          placeholder={placeholder}
        />
        <div className="field-edit-bar">
          <button className="btn-save" onMouseDown={e => { e.preventDefault(); onSave(draft.trim()); setEditing(false) }}>
            <Check size={11} className="inline -mt-0.5 mr-0.5" />保存
          </button>
          <button className="btn-cancel" onMouseDown={e => { e.preventDefault(); setDraft(value); setEditing(false) }}>
            取消
          </button>
          <span className="text-[10px] text-muted self-center ml-auto">Esc 取消 · Ctrl+Enter 保存</span>
        </div>
      </div>
    )
  }

  // --- Long text: Markdown view mode ---
  if (isLong) {
    return (
      <div
        className="field-value-rich"
        onClick={() => setEditing(true)}
      >
        {value ? (
          <Markdown text={autoFormatText(value)} />
        ) : (
          <span className="field-empty-hint">{placeholder}</span>
        )}
        <span className="edit-hint">点击编辑</span>
      </div>
    )
  }

  // --- Short text: inline contentEditable ---
  return (
    <span
      className="field-value"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => onSave(e.currentTarget.textContent?.trim() || '')}
    >
      {value}
    </span>
  )
}

export default function CardRenderer({ card, pageId, index }: { card: Card; pageId: string; index: number }) {
  const { updateCardField, addCardEntry, deleteCardEntry, updateCardEntry, appendCardEntries, setContextMenu } = useWorkbenchStore()
  const pages = useWorkbenchStore(s => s.pages)
  const { toast } = useToast()
  const [renderKey, setRenderKey] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const lastCardId = useRef(card.id)

  useEffect(() => {
    if (lastCardId.current !== card.id) {
      lastCardId.current = card.id
      setRenderKey(k => k + 1)
    }
  }, [card.id])

  const fieldsHash = JSON.stringify(card.fields)
  useEffect(() => {
    setRenderKey(k => k + 1)
  }, [fieldsHash])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, pageId, cardId: card.id, index })
  }

  const handleFieldBlur = (key: string) => (text: string) => {
    updateCardField(pageId, card.id, key, text)
  }

  const handleCoachCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const [collapsedEntries, setCollapsedEntries] = useState<Set<number>>(new Set())
  const [editingEntry, setEditingEntry] = useState<number | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})

  const toggleCollapse = (i: number) => {
    setCollapsedEntries(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })
  }

  const startEditEntry = (i: number, entry: Record<string, string>) => {
    setEditingEntry(i)
    setEditData({ ...entry })
  }

  const saveEditEntry = (i: number) => {
    updateCardEntry(pageId, card.id, i, editData)
    setEditingEntry(null)
  }

  const handleAddEntry = () => {
    addCardEntry(pageId, card.id)
  }

  const renderFields = () => {
    return Object.entries(card.fields).map(([key, value]) => {
      if (key === 'prompt') return null
      return (
        <div key={`${key}-${renderKey}`} className="field-row">
          <span className="field-label">{formatFieldLabel(key)}</span>
          <FieldContent
            value={value}
            placeholder="点击编辑..."
            onSave={handleFieldBlur(key)}
            renderKey={renderKey}
          />
        </div>
      )
    })
  }

  const renderCardBody = () => {
    switch (card.type) {
      case 'info': {
        const infoText = card.fields.main || ''
        const isLongInfo = infoText.length > 80 || infoText.includes('\n')
        if (isLongInfo) {
          return (
            <div className="prose-wb text-[13px] text-muted">
              <Markdown text={autoFormatText(infoText)} />
            </div>
          )
        }
        return (
          <p className="text-[13px] text-muted leading-relaxed">{infoText}</p>
        )
      }

      case 'skill':
        if (card.skillName === 'community-notify') {
          return <NotifyGenerator cardId={card.id} pageId={pageId} />
        }
        if (card.skillName === 'english-error-summary') {
          return <ErrorSummary card={card} pageId={pageId} />
        }
        return (
          <>
            {['trigger', 'need', 'output', 'example'].map((key) => (
              <div key={key} className="field-row">
                <span className="field-label">{formatFieldLabel(key)}</span>
                <FieldContent
                  value={card.fields[key]}
                  placeholder="点击编辑..."
                  onSave={handleFieldBlur(key)}
                  renderKey={renderKey}
                />
              </div>
            ))}
          </>
        )

      case 'coach':
        return (
          <div className="coach-card">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => handleCoachCopy(card.fields.prompt || '')}
                className="coach-btn"
              >
                🚀 复制提示词给AI
              </button>
            </div>
            {card.fields.result !== undefined && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-muted mb-1.5">结果</div>
                <FieldContent
                  value={card.fields.result}
                  placeholder="AI 分析结果会显示在这里..."
                  onSave={handleFieldBlur('result')}
                  renderKey={renderKey}
                />
              </div>
            )}
            {['daily', 'focus', 'milestone', 'progress', 'adjust', 'nextFocus'].map((key) => {
              if (card.fields[key] === undefined) return null
              return (
                <div key={key} className="field-row">
                  <span className="field-label">{formatFieldLabel(key)}</span>
                  <FieldContent
                    value={card.fields[key]}
                    placeholder="点击编辑..."
                    onSave={handleFieldBlur(key)}
                    renderKey={renderKey}
                  />
                </div>
              )
            })}
          </div>
        )

      case 'table':
        if (card.tableType === 'projects') {
          return <ProjectTable />
        }
        return <p className="text-muted text-sm">未知表格类型</p>

      case 'milestones':
        return (
          <>
            <div className="plan-milestone">
              <div className="milestone-icon current">🎯</div>
              <div>
                <div className="font-semibold text-sm">Q3 目标</div>
                <div className="text-xs text-muted">设定你的 Q3 学习目标</div>
              </div>
            </div>
            <div className="plan-milestone">
              <div className="milestone-icon upcoming">📘</div>
              <div>
                <div className="font-semibold text-sm">月度里程碑</div>
                <div className="text-xs text-muted">每月一个可衡量的进步</div>
              </div>
            </div>
            <div className="plan-milestone">
              <div className="milestone-icon upcoming">🌟</div>
              <div>
                <div className="font-semibold text-sm">能力突破点</div>
                <div className="text-xs text-muted">你希望在哪个时刻感觉"我做到了"？</div>
              </div>
            </div>
          </>
        )

      case 'analyze':
        if (card.analyzeType === 'system') {
          return <SystemAnalyzer />
        }
        return <p className="text-muted text-sm">未知分析类型</p>

      case 'chat':
        return <AskAI pageId={pageId} />

      case 'notebook':
        return <NotebookCard card={card} pageId={pageId} />

      case 'scenario': {
        const entries = card.entries || []
        const total = entries.length
        const mastered = entries.filter((e) => e.level === '2').length
        const pct = total ? Math.round((mastered / total) * 100) : 0
        const LEVELS = [
          { v: '0', label: '❌ 不会', cls: 'border-[var(--border)] text-[var(--muted)]' },
          { v: '1', label: '🟡 磕巴', cls: 'border-yellow-400 text-yellow-600 bg-yellow-50' },
          { v: '2', label: '🟢 流利', cls: 'border-green-500 text-green-600 bg-green-50' },
        ]
        return (
          <>
            {card.fields.tip && (
              <div className="text-[11px] text-[var(--muted)] leading-relaxed mb-2 p-2 bg-accent/5 rounded">
                {card.fields.tip}
              </div>
            )}
            <div className="mb-3 p-2.5 rounded-md bg-accent/5 border border-accent/20">
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="font-semibold">📊 能力总览</span>
                <span className="text-[var(--muted)]">已掌握 {mastered} / 共 {total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="space-y-2.5">
              {entries.map((entry, i) => {
                const isEditing = editingEntry === i
                if (isEditing) {
                  const ek = ['title', 'goal', 'phrases', 'notes']
                  return (
                    <div key={i} className="p-3 bg-white rounded-md border border-accent/30 space-y-2">
                      {ek.map((k) => (
                        <div key={k}>
                          <span className="text-[11px] font-semibold text-muted block mb-0.5">{k === 'title' ? '场景名' : k === 'goal' ? '目标' : k === 'phrases' ? '关键句（每行一句）' : '练习笔记'}</span>
                          <textarea
                            value={editData[k] || ''}
                            onChange={(e) => setEditData({ ...editData, [k]: e.target.value })}
                            className="w-full text-[13px] px-2 py-1.5 border border-accent/30 rounded outline-none focus:border-accent bg-white resize-none"
                            rows={k === 'phrases' || k === 'notes' ? 4 : 2}
                          />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button onClick={() => saveEditEntry(i)} className="text-[11px] px-2.5 py-1 bg-accent text-white rounded hover:opacity-90">保存</button>
                        <button onClick={() => setEditingEntry(null)} className="text-[11px] px-2.5 py-1 bg-gray-200 text-ink rounded hover:bg-gray-300">取消</button>
                      </div>
                    </div>
                  )
                }
                return (
                <div key={i} className="p-3 bg-white rounded-md border border-[var(--border)] group/sc">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[13px] text-[var(--ink)] flex items-center gap-1.5">
                      {entry.title}
                      <SpeakButton text={entry.phrases || entry.goal || entry.title} className="text-[12px]" title="朗读整段" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/sc:opacity-100 transition-all">
                        <button onClick={() => startEditEntry(i, entry)} className="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded hover:opacity-90" title="编辑">✎</button>
                        <button onClick={() => { deleteCardEntry(pageId, card.id, i); toast('场景已删除') }} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600" title="删除">✕</button>
                      </div>
                    </div>
                    {entry.goal && <div className="text-[11px] text-[var(--muted)] mt-0.5">🎯 {entry.goal}</div>}
                    {entry.phrases && (
                      <div className="mt-1.5 space-y-1">
                        {entry.phrases.split('\n').filter(Boolean).map((p, pi) => (
                          <div key={pi} className="text-[12px] text-[var(--ink)] flex items-start gap-1.5">
                            <span className="text-accent shrink-0 mt-0.5">▸</span>
                            <span className="flex-1">{p}</span>
                            <SpeakButton text={p} className="shrink-0 text-[12px] mt-0.5" title="朗读这句" />
                          </div>
                        ))}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="mt-2 p-2 bg-accent/5 rounded text-[11px] text-[var(--muted)] whitespace-pre-wrap border-l-2 border-accent/30 pl-2.5">{entry.notes}</div>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      {LEVELS.map((l) => (
                        <button
                          key={l.v}
                          onClick={() => updateCardEntry(pageId, card.id, i, { level: l.v })}
                          className={`text-[11px] px-2 py-1 rounded border transition-all ${entry.level === l.v ? l.cls + ' font-semibold ring-1 ring-current' : 'border-[var(--border)] text-[var(--muted)] hover:border-accent'}`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => appendCardEntries(pageId, card.id, [{ title: '新场景', goal: '', phrases: '', level: '0' }])}
              className="mt-3 w-full text-[12px] py-2 rounded-md border border-dashed border-accent text-accent hover:bg-accent/5 transition-colors"
            >
              ＋ 添加场景
            </button>
          </>
        )
      }

      default:
        return (
          <>
            {renderFields()}
            {card.listMode && (
              <>
                <div className="mt-2 pt-2 border-t border-dashed border-rule-bg">
                  <button onClick={handleAddEntry} className="card-save-btn">💾 保存本条摘录</button>
                </div>
                {(card.entries || []).map((entry, i) => {
                  const isEditing = editingEntry === i
                  const isCollapsed = collapsedEntries.has(i)
                  const keys = Object.keys(entry)
                  const doneKey = keys.find(k => k === 'done')
                  const quoteKey = keys.find(k => k === 'quote') || keys.find(k => k === 'main')
                  const thoughtKey = keys.find(k => k === 'thought')
                  // labelKeys exclude special keys
                  const labelKeys = keys.filter(k => k !== 'quote' && k !== 'main' && k !== 'thought' && k !== 'done')
                  const hasThought = thoughtKey && entry[thoughtKey]
                  const isDone = doneKey && entry[doneKey] === 'true'

                  return (
                  <div key={i} className="mt-2 p-3 bg-accent/3 rounded-md group/entry relative">
                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/entry:opacity-100 transition-all">
                      <button
                        onClick={() => startEditEntry(i, entry)}
                        className="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded hover:opacity-90 flex items-center gap-0.5"
                        title="编辑此条目"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => { deleteCardEntry(pageId, card.id, i); toast('条目已删除') }}
                        className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-0.5"
                        title="删除此条目"
                      >
                        <X size={10} />
                      </button>
                    </div>

                    {isEditing ? (
                      /* 编辑模式 */
                      <div className="space-y-2">
                        {keys.map(k => (
                          <div key={k}>
                            <span className="text-[11px] font-semibold text-muted block mb-0.5">{formatFieldLabel(k)}</span>
                            <textarea
                              value={editData[k] || ''}
                              onChange={e => setEditData({ ...editData, [k]: e.target.value })}
                              className="w-full text-[13px] px-2 py-1.5 border border-accent/30 rounded outline-none focus:border-accent bg-white resize-none"
                              rows={k === 'thought' ? 4 : 2}
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button onClick={() => saveEditEntry(i)} className="text-[11px] px-2.5 py-1 bg-accent text-white rounded hover:opacity-90">保存</button>
                          <button onClick={() => setEditingEntry(null)} className="text-[11px] px-2.5 py-1 bg-gray-200 text-ink rounded hover:bg-gray-300">取消</button>
                        </div>
                      </div>
                    ) : (
                      /* 展示模式 — 按内容长度智能分流 */
                      <>
                        {/* 复选框 — done 字段 */}
                        {doneKey && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              onClick={() => updateCardEntry(pageId, card.id, i, { done: isDone ? 'false' : 'true' })}
                              className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center text-[11px] transition-all cursor-pointer ${isDone ? 'bg-[var(--accent2)] border-[var(--accent2)] text-white scale-90' : 'border-[var(--border)] hover:border-[var(--accent2)]'}`}
                            >
                              {isDone ? '✓' : ''}
                            </span>
                            <span className={`text-[13px] font-medium ${isDone ? 'line-through text-[var(--muted)] opacity-60' : 'text-[var(--ink)]'}`}>
                              {labelKeys.filter(k => entry[k] && entry[k].length > 0).map(k => (
                                <span key={k}>{entry[k]}</span>
                              ))}
                            </span>
                          </div>
                        )}

                        {/* 标签行 — 只展示短文本 labelKeys */}
                        {!doneKey && labelKeys.filter(k => {
                          const v = entry[k] || ''
                          return v.length > 0 && v.length < 60 && !v.includes('\n')
                        }).length > 0 && (
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {labelKeys.filter(k => entry[k] && entry[k].length < 60 && !entry[k].includes('\n')).map(k => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-medium">{entry[k]}</span>
                            ))}
                          </div>
                        )}

                        {/* quote/main 短文本 → 引用样式 */}
                        {quoteKey && entry[quoteKey] && entry[quoteKey].length < 80 && !entry[quoteKey].includes('\n') && (
                          <div className="text-[15px] leading-relaxed text-ink font-medium italic border-l-[3px] border-accent2/30 pl-3 py-0.5">
                            {entry[quoteKey]}
                          </div>
                        )}

                        {/* quote/main 长文本 → Markdown 渲染 */}
                        {quoteKey && entry[quoteKey] && (entry[quoteKey].length >= 80 || entry[quoteKey].includes('\n')) && (
                          <div>
                            <div className="text-[11px] font-semibold text-muted mb-1 flex items-center gap-1.5">
                              <span className="inline-block w-[3px] h-[10px] bg-accent rounded-sm" />
                              {formatFieldLabel(quoteKey)}
                            </div>
                            <div className="pl-2">
                              <Markdown text={autoFormatText(entry[quoteKey])} />
                            </div>
                          </div>
                        )}

                        {/* labelKeys 长文本 — 带标签的 Markdown 文本块 */}
                        {labelKeys.filter(k => {
                          const v = entry[k] || ''
                          return v.length >= 60 || v.includes('\n')
                        }).map(k => (
                          <div key={k} className="mt-2">
                            <div className="text-[11px] font-semibold text-muted mb-1 flex items-center gap-1.5">
                              <span className="inline-block w-[3px] h-[10px] bg-accent rounded-sm" />
                              {formatFieldLabel(k)}
                            </div>
                            <div className="pl-2">
                              <Markdown text={autoFormatText(entry[k])} />
                            </div>
                          </div>
                        ))}

                        {/* 感悟 — 可折叠，支持 Markdown */}
                        {hasThought && (entry[thoughtKey] || '').length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleCollapse(i)}
                              className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors"
                            >
                              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                              我的想法
                            </button>
                            {!isCollapsed && (
                              <div className="mt-1.5 pl-1">
                                <Markdown text={autoFormatText(entry[thoughtKey])} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 知识关联：找到其他页面中的相关内容 */}
                        {(() => {
                          const entryText = Object.values(entry).join(' ')
                          if (entryText.length < 50) return null
                          const keywords = entryText
                            .replace(/[，。！？、；：""''（）【】\n]/g, ' ')
                            .split(/\s+/)
                            .filter(w => w.length >= 2 && !['的是', '一个', '这个', '可以', '我们', '自己', '就是', '不是', '什么', '他们', '没有', '已经', '还是', '因为', '所以', '如果', '但是', '不过', '而且'].includes(w))
                            .slice(0, 8)
                          if (keywords.length === 0) return null

                          const related: Array<{ text: string; title: string; pageId: string }> = []
                          Object.entries(pages).forEach(([pid, cards]) => {
                            if (pid === pageId) return
                            cards.forEach(c => {
                              if (!c.entries) return
                              c.entries.forEach(e => {
                                const t = Object.entries(e).find(([k]) => k !== 'done')?.[1]
                                if (!t || t.length < 20) return
                                const matchCount = keywords.filter(kw => t.includes(kw)).length
                                if (matchCount >= 2 && related.length < 3 && !related.some(r => r.text === t)) {
                                  related.push({ text: t.substring(0, 60), title: c.title, pageId: pid })
                                }
                              })
                            })
                          })
                          if (related.length === 0) return null
                          return (
                            <div className="mt-2 pt-2 border-t border-dashed border-[var(--border)]">
                              <div className="text-[10px] font-semibold text-[var(--muted)] mb-1">💡 相关内容</div>
                              <div className="space-y-1">
                                {related.map((r, ri) => {
                                  const pageTitle = PAGE_DEFS.find(p => p.id === r.pageId)?.title || r.pageId
                                  return (
                                    <div key={ri} className="text-[11px] text-[var(--muted)] leading-relaxed flex items-start gap-1.5">
                                      <span className="text-[var(--accent)] shrink-0 mt-0.5">▸</span>
                                      <span>
                                        <span className="text-[var(--ink)]">{r.text}...</span>
                                        <span className="text-[10px] ml-1">—「{r.title}」{pageTitle}</span>
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )})}
              </>
            )}
          </>
        )
    }
  }

  return (
    <div
      className="card"
      onContextMenu={handleContextMenu}
      draggable
      data-card-id={card.id}
      data-page={pageId}
      data-index={index}
    >
      <div className={`card-header ${card.fixed ? 'text-accent' : ''}`}>
        {!card.fixed && <GripVertical size={14} className="text-muted opacity-30 cursor-grab active:cursor-grabbing" />}
        {card.fixed && <span className="text-base">🤖</span>}
        <span className="flex-1">{card.title}</span>
        {!card.fixed && (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed) }}
            className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors ml-2"
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="card-body">
          {renderCardBody()}
        </div>
      )}
    </div>
  )
}
