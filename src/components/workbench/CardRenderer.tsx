import { GripVertical, ChevronDown, ChevronRight, Pencil, X, Check } from 'lucide-react'
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
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
import { generateChat, hasPaidKey } from '@/utils/ai'

// --- Coach Card: extraction module (top) + collapsible records (bottom) ---
interface CoachRecord {
  id: string
  content: string      // 提炼结果 or 手动输入
  createdAt: string
  source: 'ai' | 'manual'
}

/** Aggressively merge broken-line text into readable paragraphs */
function mergeBrokenLines(raw: string): string {
  if (!raw) return ''
  let t = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Phase 1: If 3+ short lines with no blank-line separators → merge all into one paragraph
  const lines = t.split('\n')
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (nonEmpty.length >= 3 && !t.includes('\n\n')) {
    let cur = ''
    const paras: string[] = []
    for (const l of nonEmpty) {
      const trimmed = l.trim()
      // Start new paragraph only at clear boundaries
      if (/[。！？!?]$/.test(cur) && /^[【①②③④⑤⑥⑦⑧⑨⑩\d「"'\d]/.test(trimmed)) {
        paras.push(cur); cur = trimmed
      } else if (/^【[^】]+】$/.test(trimmed) || /^\d+[.、]\s/.test(trimmed)) {
        if (cur) paras.push(cur)
        cur = trimmed
      } else {
        cur += (cur && !/[：:，,、]$/.test(cur) ? ' ' : '') + trimmed
      }
    }
    if (cur) paras.push(cur)
    t = paras.join('\n\n')
  }
  // Phase 2: Clean up ALL remaining single newlines (join mid-sentence breaks)
  t = t.replace(/(?<![。！？!?…\n])\n(?![\n])/g, '')
  return t.trim()
}

function parseRecords(raw: string | undefined): CoachRecord[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      // Normalize old format (had prompt/standard/result) → new (content)
      return parsed.map((e: any) => ({
        id: e.id || Date.now().toString(36),
        content: e.content || e.result || e.prompt || '',
        createdAt: e.createdAt || new Date().toISOString(),
        source: e.source || (e.result ? 'ai' : 'manual'),
      }))
    }
  } catch { /* ignore */ }
  return []
}

function CoachCard({ card, pageId, updateCardField, toast }: {
  card: Card; pageId: string;
  updateCardField: (pid: string, cid: string, field: string, val: string) => void;
  toast: (msg: string, type?: string) => void;
}) {
  // ===== Top extraction module (local input state) =====
  const [inputPrompt, setInputPrompt] = useState('')
  const [inputStandard, setInputStandard] = useState('')
  const [loading, setLoading] = useState(false)

  // ===== Bottom records list =====
  const [records, setRecords] = useState<CoachRecord[]>(() => parseRecords(card.fields.coach_entries))
  const [openId, setOpenId] = useState<string | null>(null)

  const saveRecords = (updated: CoachRecord[]) => {
    setRecords(updated)
    updateCardField(pageId, card.id, 'coach_entries', JSON.stringify(updated))
  }

  const cleanPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/(?<!\n)\n(?!\n)/g, ' ')
    document.execCommand('insertText', false, cleaned)
  }

  // Run AI extraction from top module → creates a new record at top
  const runExtraction = async () => {
    if (!hasPaidKey()) { toast('请先在顶部「⚙️ AI 配置」配置 API 密钥', 'info'); return }
    if (inputPrompt.trim().length < 5) { toast('请先在上方填写讲话内容（至少5字）', 'info'); return }
    const standard = inputStandard.trim()
    const fullPrompt = standard.length > 0
      ? `【讲话内容】\n${inputPrompt}\n\n【参考范例】（这是一条之前做过的、用户满意的结果，请严格模仿它的风格、格式、结构和语言习惯来处理上面的新内容）\n${standard}`
      : inputPrompt
    const system = standard.length > 0
      ? '你是一位资深的企业培训简报撰写人。用户会提供一段新内容和一条参考范例（满意的过往提炼结果）。请严格模仿范例的风格、格式、结构和语言习惯来处理新内容。文体要求：培训简报风格，300字左右，总分总结构——先点明核心主题，再分述要点（保留1-2个关键案例名作为信息锚点但不展开细节），最后以寄语收尾。核心要点用对仗或排比短句呈现。不要编造原文没有的信息。绝对不要每句话单独换行，不要用换行分隔短句，输出必须是完整的段落。'
      : '你是一位资深的企业培训简报撰写人。请将用户提供的内容提炼为培训简报。要求：300字左右，总分总结构——先点明核心主题，再分述要点（保留1-2个关键案例名作为信息锚点但不展开细节），最后以寄语收尾。核心要点用对仗或排比短句呈现。不要堆流水账、不按时间线罗列。绝对不要每句话单独换行，输出必须是完整的段落。'
    setLoading(true)
    try {
      const rawResult = await generateChat(fullPrompt, system)
      const normalized = mergeBrokenLines(rawResult)
      const rec: CoachRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        content: normalized,
        createdAt: new Date().toISOString(),
        source: 'ai',
      }
      saveRecords([rec, ...records])
      setInputPrompt('')
      setInputStandard('')
      setOpenId(rec.id)
      toast('提炼完成 ✅ 已生成新记录', 'success')
    } catch (e: any) {
      toast('AI 调用失败：' + (e?.message || '未知错误'), 'error')
    } finally { setLoading(false) }
  }

  // Manual add empty record
  const addManualRecord = () => {
    const rec: CoachRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content: '',
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
    saveRecords([rec, ...records])
    setOpenId(rec.id)
  }

  const updateContent = (id: string, content: string) => {
    saveRecords(records.map(r => r.id === id ? { ...r, content } : r))
  }

  const removeRecord = (id: string) => {
    saveRecords(records.filter(r => r.id !== id))
    if (openId === id) setOpenId(null)
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }

  // First line preview for collapsed record
  const firstLine = (content: string) => {
    const merged = mergeBrokenLines(content)
    const line = merged.split('\n')[0] || ''
    return line.length > 48 ? line.slice(0, 48) + '…' : line
  }

  return (
    <div className="coach-card space-y-4">
      {/* ===== TOP: Extraction Module ===== */}
      <div className="space-y-3 p-3 rounded-xl bg-accent/5 border border-accent/20">
        <div className="text-[13px] font-semibold text-accent flex items-center gap-1">
          🤖 AI 提炼模块
        </div>
        <div>
          <div className="text-[13px] font-semibold text-muted mb-1.5">📝 讲话内容</div>
          <textarea
            className="w-full min-h-[110px] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[14px] leading-relaxed text-[var(--ink)] placeholder:text-muted/50 resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="粘贴或输入讲话内容（自动清除碎行）..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onPaste={cleanPaste}
          />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-muted mb-1.5">📎 参考范例（可选）</div>
          <textarea
            className="w-full min-h-[60px] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[14px] leading-relaxed text-[var(--ink)] placeholder:text-muted/50 resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="粘贴满意的历史结果，AI 会模仿风格..."
            value={inputStandard}
            onChange={(e) => setInputStandard(e.target.value)}
            onPaste={cleanPaste}
          />
        </div>
        <button
          onClick={runExtraction}
          className="w-full py-2.5 text-[13px] font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          disabled={loading}
        >
          {loading ? '⏳ AI 处理中...' : '🚀 AI 一键提炼'}
        </button>
      </div>

      {/* ===== BOTTOM: Records List ===== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-muted">📋 提炼记录（{records.length}）</span>
          <button onClick={addManualRecord} className="text-[13px] text-accent hover:opacity-80 font-medium">
            ＋ 手动添加
          </button>
        </div>

        {records.length === 0 && (
          <div className="text-[12px] text-muted/50 text-center py-5 border border-dashed border-[var(--border)] rounded-lg">
            暂无记录，提炼或手动添加
          </div>
        )}

        {records.map((rec) => {
          const isOpen = openId === rec.id
          return (
            <div key={rec.id} className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
              {/* Collapsed header — shows only first line */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--bg)] transition-colors text-left"
                onClick={() => setOpenId(isOpen ? null : rec.id)}
              >
                <span className="shrink-0 text-[12px]">
                  {rec.source === 'ai' ? '🤖' : '✍️'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[var(--ink)] leading-snug truncate">
                    {rec.content.trim() ? firstLine(rec.content) : <span className="text-muted/50 italic">（空记录，点击编辑）</span>}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5">{formatDate(rec.createdAt)}</div>
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[11px] text-muted/40 hover:text-red-500 cursor-pointer px-1 py-0.5 rounded transition-colors"
                    onClick={(e) => { e.stopPropagation(); removeRecord(rec.id) }}
                  >删</span>
                  {isOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                </span>
              </button>

              {/* Expanded body — editable content */}
              {isOpen && (
                <div className="px-3 pb-3 pt-2 border-t border-[var(--border)]">
                  <textarea
                    className="w-full min-h-[120px] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[14px] leading-relaxed text-[var(--ink)] placeholder:text-muted/50 resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="在此输入或编辑记录内容..."
                    value={rec.content}
                    onChange={(e) => updateContent(rec.id, e.target.value)}
                    onPaste={cleanPaste}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
          <span className="text-[11px] text-muted self-center ml-auto">Esc 取消 · Ctrl+Enter 保存</span>
        </div>
      </div>
    )
  }

  // --- Long text: Markdown view mode (merged broken lines) ---
  if (isLong) {
    // Use mergeBrokenLines for aggressive broken-line merging, then render as paragraphs
    // Do NOT pass through autoFormatText — it re-splits merged text!
    const merged = value ? mergeBrokenLines(value) : ''
    return (
      <div
        className="field-value-rich select-text"
        onClick={() => setEditing(true)}
      >
        {merged ? (
          <div className="text-[14px] text-[var(--ink)] leading-relaxed">
            {merged.split('\n\n').map((para, pi) => (
              <p key={pi} className="mb-2 last:mb-0">{para}</p>
            ))}
          </div>
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

export default function CardRenderer({ card, pageId, index, onDragStartCard }: { card: Card; pageId: string; index: number; onDragStartCard?: (e: React.DragEvent, idx: number) => void }) {
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

  // openEntries: set of entry indices that are expanded (default: all collapsed = empty set)
  const [openEntries, setOpenEntries] = useState<Set<number>>(new Set())
  const [editingEntry, setEditingEntry] = useState<number | null>(null)
  const [editData, setEditData] = useState<Record<string, string>>({})
  // scenario 色块地图：当前点开看笔记的色块索引
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null)
  // scenario 四大框临时编辑值（用 ref 避免 hooks 嵌套在条件渲染里）
  const sVocabRef = useRef('')
  const sPhrasesRef = useRef('')
  const sCorrRef = useRef('')
  const sNextRef = useRef('')
  // scenario 词块（生词本）：已掌握词集合 + 只看不会的开关（避免 hooks 嵌套在展开 IIFE 里，故置于组件级）
  const [knownVocab, setKnownVocab] = useState<string[]>([])
  const [showUnknownOnly, setShowUnknownOnly] = useState(true)
  const [showKnownPanel, setShowKnownPanel] = useState(false)

  const startEditEntry = (i: number, entry: Record<string, string>) => {
    setEditingEntry(i)
    setEditData({ ...entry })
    // 初始化四大框 ref（从 notes 按 Markdown 标题拆段）
    const rawNotes = (entry.notes ?? '') as string
    const section = (hdr: string) => {
      const re = new RegExp(`\\*\\*${hdr}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i')
      const m = rawNotes.match(re)
      return m ? m[1].trim() : ''
    }
    sVocabRef.current = section('学到的词块') || section('词块')
    sPhrasesRef.current = (entry.phrases ?? '') as string
    sCorrRef.current = section('纠错笔记') || section('纠错')
    sNextRef.current = section('下次加难') || section('加难')
    // 已掌握词块：从 notes 的 **已掌握词块** 段解析
    const knownSection = section('已掌握词块') || section('已掌握')
    setKnownVocab(knownSection ? knownSection.split('\n').map((s) => s.trim()).filter(Boolean) : [])
    setShowUnknownOnly(true)
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
        return <CoachCard card={card} pageId={pageId} updateCardField={updateCardField} toast={toast} />

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
          { v: '0', label: '○ 没学过', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
          { v: '1', label: '🟡 磕巴', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
          { v: '2', label: '🟢 流利', cls: 'bg-green-50 text-green-700 border-green-300' },
        ]
        const levelCls = (lv: string) => (LEVELS.find((l) => l.v === lv) || LEVELS[0]).cls
        // 根据场景标题/分类匹配可爱图标
        const sceneIcon = (title: string, cat: string): string => {
          const t = title + ' ' + cat
          if (/问路|指路|方向|地铁|公交|打车|交通|路口|步行|transit|direction|subway|bus|taxi/i.test(t)) return '🗺️'
          if (/咖啡|coffee|cafe|星巴克/i.test(t)) return '☕'
          if (/餐厅|点餐|饭店|吃饭|restaurant|order|menu/i.test(t)) return '🍽️'
          if (/购物|商场|超市|买|商店|shop|store|mall|market/i.test(t)) return '🛒'
          if (/机场|飞机|登机|行李|airport|flight|boarding/i.test(t)) return '✈️'
          if (/酒店|入住|前台|hotel|check.?in|lobby/i.test(t)) return '🏨'
          if (/银行|取款|存钱|bank|atm|account/i.test(t)) return '🏦'
          if (/医院|看病|医生|药|hospital|doctor|pharmacy/i.test(t)) return '🏥'
          if (/理发|剪发|发型|hair|barber|salon|cut/i.test(t)) return '💇'
          if (/健身|运动|gym|workout|exercise/i.test(t)) return '🏋️'
          if (/公园|户外|野餐|park|picnic|outdoor/i.test(t)) return '🌳'
          if (/图书馆|借书|library|book/i.test(t)) return '📚'
          if (/电影|影院|cinema|movie|ticket/i.test(t)) return '🎬'
          if (/电话|打电话|phone|call|ring/i.test(t)) return '📞'
          if (/邮局|寄信|快递|post|mail|package|deliver/i.test(t)) return '📦'
          if (/厨房|做饭|切菜|洗碗|冰箱|烘焙|调味|厨房/i.test(t)) return '🍳'
          if (/客厅|卧室|浴室|洗衣|打扫|家具|水电煤|搬家|居家|household|living|bedroom|bathroom|laundry|clean/i.test(t)) return '🏠'
          if (/办公|开会|面试|邮件|打印|office|meeting|interview|email|print/i.test(t)) return '💼'
          if (/学校|上课|考试|老师|school|class|exam|teacher/i.test(t)) return '🎓'
          if (/天气|温度|下雨|晴天|weather|rain|sunny|temperature/i.test(t)) return '🌤️'
          if (/时间|日期|几点|今天|明天|time|date|today|tomorrow/i.test(t)) return '⏰'
          if (/数字|号码|价格|钱|number|price|money|count/i.test(t)) return '🔢'
          if (/颜色|大小|长短|color|size|length/i.test(t)) return '🎨'
          if (/家人|亲戚|朋友|邻居|family|friend|neighbor/i.test(t)) return '👨‍👩‍👧'
          if (/宠物|猫|狗|pet|cat|dog/i.test(t)) return '🐾'
          if (/自我介绍|名字|年龄|来自|introduce|name|age|from/i.test(t)) return '👋'
          // 默认按分类兜底
          if (/居家/i.test(cat)) return '🏠'
          if (/厨房/i.test(cat)) return '🍳'
          if (/出行/i.test(cat)) return '🚗'
          if (/社交/i.test(cat)) return '🤝'
          if (/购物/i.test(cat)) return '🛒'
          if (/服务/i.test(cat)) return '🔧'
          if (/校园/i.test(cat)) return '🎓'
          if (/职场/i.test(cat)) return '💼'
          if (/休闲/i.test(cat)) return '🎮'
          return '📌'  // 兜底
        }
        // 按分类分组（保持插入顺序）
        const groups: Record<string, Array<Record<string, string> & { _i: number }>> = {}
        entries.forEach((e, i) => {
          const cat = e.category || '其他'
          ;(groups[cat] = groups[cat] || []).push({ ...e, _i: i })
        })
        return (
          <>
            {card.fields.tip && (
              <div className="text-[12px] text-[var(--muted)] leading-relaxed mb-2 p-2 bg-accent/5 rounded">
                {card.fields.tip}
              </div>
            )}
            {/* 进度总览 */}
            <div className="mb-3 p-2.5 rounded-md bg-accent/5 border border-accent/20">
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="font-semibold">📊 进度</span>
                <span className="text-[var(--muted)]">已掌握 {mastered} / 共 {total} · {pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {/* 分类色块网格 */}
            <div className="space-y-3">
              {Object.entries(groups).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[12px] font-semibold text-[var(--ink)] mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                    {cat} <span className="text-[var(--muted)] font-normal">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {items.map((entry) => {
                      const i = entry._i
                      const isOpen = expandedScenario === i
                      return (
                        <Fragment key={i}>
                          <button
                            onClick={() => {
                              if (isOpen) { setExpandedScenario(null); setEditingEntry(null) }
                              else { setExpandedScenario(i); startEditEntry(i, entry) }
                            }}
                            className={`relative text-left text-[12px] px-2 py-2 pr-6 rounded-md border transition-all cursor-pointer select-none ${levelCls(entry.level)} ${isOpen ? 'ring-2 ring-accent shadow-sm' : 'hover:shadow-sm'}`}
                          >
                            <div className="flex items-center gap-1 leading-tight">
                              <span className="font-medium truncate">{entry.title}</span>
                            </div>
                            <Pencil size={11} className="absolute right-1.5 top-1.5 text-[var(--muted)] opacity-40" />
                          </button>
                          {isOpen && (() => {
                            const saveScenario = () => {
                              const combinedNotes = [
                                sVocabRef.current ? `**学到的词块**\n${sVocabRef.current}` : '',
                                sCorrRef.current ? `**纠错笔记**\n${sCorrRef.current}` : '',
                                sNextRef.current ? `**下次加难**\n${sNextRef.current}` : '',
                                knownVocab.length ? `**已掌握词块**\n${knownVocab.join('\n')}` : '',
                              ].filter(Boolean).join('\n\n')
                              updateCardEntry(pageId, card.id, i, { phrases: sPhrasesRef.current, notes: combinedNotes })
                              setExpandedScenario(null)
                              setEditingEntry(null)
                              toast('已保存 ✅')
                            }

                            const BOX_CLS = "w-full text-[14px] px-3 py-2 border border-accent/30 rounded-md outline-none focus:border-accent bg-white resize-y leading-relaxed"
                            // ── 词块生词本：chip 列表 + 打叉标记掌握 + 只看不会的 ──
                            const vocabLines = (sVocabRef.current || '').split('\n').map((s) => s.trim()).filter(Boolean)
                            const knownSet = new Set(knownVocab)
                            const unknownLines = vocabLines.filter((l) => !knownSet.has(l))
                            const knownLines = vocabLines.filter((l) => knownSet.has(l))
                            // chip 标签：取「单词 + 音标」部分，释义放到 title 悬浮显示，避免 chip 过长
                            const chipLabel = (line: string) => {
                              const m = line.match(/^(.*?\])\s/)
                              return m ? m[1] : line
                            }
                            const cleanForSpeak = (t: string) => t
                              .replace(/\*\*([^*]+)\*\*/g, '$1') // 去加粗 **
                              .replace(/\/[^/]+\//g, '')          // 去音标 /.../
                              .replace(/[•·▪]/g, '')             // 去项目符号
                              .replace(/—/g, ' ')               // 长破折号转空格
                              .replace(/→/g, ' to ')             // 箭头转 to
                              .replace(/\s+/g, ' ')
                              .trim()
                            // 关键句(对话)：去掉说话人前缀 You: / Me (摊主): 等，只念句子
                            const cleanDialogue = (t: string) => t
                              .split(/\n+/)
                              .map((line) => line.replace(/^\s*(You|Me(?:\s*\([^)]*\)|\s*（[^）]*）)?)\s*:\s*/i, '').trim())
                              .filter(Boolean)
                              .join(' ')
                              .replace(/\s+/g, ' ')
                              .trim()
                            const SEC = (label: string, refObj: React.RefObject<string>, rows: number, speakText?: string) => (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[13px] font-semibold text-[var(--ink)]">{label}</span>
                                  {speakText ? <SpeakButton text={speakText} className="text-[12px]" title={`朗读${label.replace(/[（(].*$/, '')}`} /> : null}
                                </div>
                                <textarea className={BOX_CLS} value={refObj.current} onChange={(e) => { refObj.current = e.target.value }} rows={rows} />
                              </div>
                            )

                            return (
                              <div className="col-span-full mt-2 mb-1 p-4 bg-white rounded-lg border border-accent/30 space-y-3">
                                {/* 四大框 */}
                                {/* 四大框：一行一个，上下堆叠 */}
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[13px] font-semibold text-[var(--ink)]">📝 词块（生词本）</span>
                                      <div className="flex items-center gap-2">
                                        <button type="button"
                                          onClick={() => setShowKnownPanel((v) => !v)}
                                          className="text-[11px] text-[var(--muted)] hover:text-accent underline decoration-dotted cursor-pointer"
                                          title="点击展开/收起已掌握词汇（可逐个恢复）">
                                          已掌握 {knownVocab.length}/{vocabLines.length}
                                        </button>
                                        <SpeakButton text={cleanForSpeak(sVocabRef.current)} className="text-[12px]" title="朗读生词" />
                                      </div>
                                    </div>
                                    {unknownLines.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {unknownLines.map((line, k) => (
                                          <span key={'u' + k} title={line}
                                            className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                            {chipLabel(line)}
                                            <button type="button"
                                              onClick={() => setKnownVocab((prev) => [...prev, line])}
                                              className="leading-none text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-full w-4 h-4 flex items-center justify-center"
                                              title="我会了，叉掉">✕</button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {showKnownPanel && knownLines.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="w-full text-[11px] text-[var(--muted)] mb-1">点击 ↩ 可逐个恢复（误删补救）</div>
                                        {knownLines.map((line, k) => (
                                          <span key={'k' + k} title={line}
                                            className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 line-through">
                                            {chipLabel(line)}
                                            <button type="button"
                                              onClick={() => setKnownVocab((prev) => prev.filter((x) => x !== line))}
                                              className="leading-none text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full w-4 h-4 flex items-center justify-center"
                                              title="我忘了，恢复">↩</button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer mb-2">
                                      <input type="checkbox" checked={showUnknownOnly} onChange={(e) => setShowUnknownOnly(e.target.checked)} />
                                      只看不会的（{unknownLines.length}）
                                    </label>
                                    <textarea className={BOX_CLS} value={showUnknownOnly ? unknownLines.join('\n') : sVocabRef.current} onChange={(e) => { sVocabRef.current = e.target.value }} rows={6} />
                                  </div>
                                  {SEC('💬 关键句（每行一句）', sPhrasesRef, 6, cleanDialogue(sPhrasesRef.current))}
                                  {SEC('✅ 纠错', sCorrRef, 5)}
                                  {sNextRef.current && SEC('🎯 下次加难', sNextRef, 4)}
                                </div>
                                {/* 底部操作栏 */}
                                <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-accent/10 mt-1">
                                  <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer ml-2">
                                    <input type="checkbox" checked={editData.practicing === '1'} onChange={(e) => setEditData({ ...editData, practicing: e.target.checked ? '1' : '0' })} />
                                    计划重点练
                                  </label>
                                  <span className="text-[11px] text-muted ml-auto">熟练度：</span>
                                  {LEVELS.map((l) => (
                                    <button
                                      key={l.v}
                                      onClick={() => updateCardEntry(pageId, card.id, i, { level: l.v })}
                                      className={`text-[12px] px-2 py-1 rounded border transition-all ${entry.level === l.v ? l.cls + ' font-semibold ring-1 ring-current' : 'border-[var(--border)] text-[var(--muted)] hover:border-accent'}`}
                                    >
                                      {l.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button onClick={saveScenario} className="text-[13px] px-3 py-1.5 bg-accent text-white rounded-md hover:opacity-90 font-medium">💾 保存</button>
                                  <button onClick={() => { setExpandedScenario(null); setEditingEntry(null) }} className="text-[13px] px-3 py-1.5 bg-gray-200 text-ink rounded-md hover:bg-gray-300">收起</button>
                                  <button onClick={() => { deleteCardEntry(pageId, card.id, i); setExpandedScenario(null); setEditingEntry(null); toast('场景已删除') }} className="text-[12px] text-muted/40 hover:text-red-500 ml-auto">删</button>
                                </div>
                              </div>
                            )
                          })()}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => appendCardEntries(pageId, card.id, [{ title: '新场景', category: '其他', goal: '', phrases: '', notes: '', level: '0', practicing: '0' }])}
              className="mt-3 w-full text-[12px] py-2 rounded-md border border-dashed border-accent text-accent hover:bg-accent/5 transition-colors"
            >
              ＋ 添加场景
            </button>
          </>
        )
      }

      case 'volka': {
        const volkaEntries = card.entries || []
        const scene = card.fields.scenario || ''
        const words = (card.fields.words || '').split('\n').filter(Boolean)
        const buildPrompt = () => {
          const wordList = words.join(', ')
          const prompt = `我们用英语做一个场景对话练习。\n场景：「${scene || '（先填一下场景名）'}」\n请主要用到这些词：${wordList || '（先填一下词表）'}\n\n规则：\n1. 你先用轻松口语开场，给我一个这个场景下的小任务（描述 / 提问 / 角色扮演都行）。\n2. 我会先试着说，错了没关系。\n3. 纠正我时给三档标注：✅native（母语者真这么说）/ ⚠️formal（语法对但太书面，聊天别用）/ ❌Chinglish-risk（中式直译），并给自然版。\n4. 练完帮我归纳这个场景最该记住的 3 句话。`
          navigator.clipboard.writeText(prompt)
          toast('提示词已复制 → 去本页「💬 AI 英语教练」粘贴开始')
        }
        return (
          <>
            <div className="text-[12px] text-[var(--muted)] leading-relaxed mb-2 p-2 bg-accent/5 rounded">
              Volka 场景词闭环：①看视频记词 → ②填场景名+词表 → ③点「复制提示词」去 AI 教练对话 → ④练完把易错点记到下方复盘。
            </div>
            <div className="field-row">
              <span className="field-label">场景名</span>
              <FieldContent value={scene} placeholder="如：Household / Bathroom" onSave={handleFieldBlur('scenario')} renderKey={renderKey} />
            </div>
            <div className="mt-2">
              <span className="field-label block mb-1">词表（每行一个）</span>
              <textarea
                defaultValue={card.fields.words || ''}
                onBlur={(e) => updateCardField(pageId, card.id, 'words', e.target.value)}
                placeholder={'Blanket\nToilet\nPlunger\nShower Head\nTowel Rack\nSoap dispenser'}
                className="w-full text-[14px] px-2 py-1.5 border border-[var(--border)] rounded outline-none focus:border-accent bg-white resize-none"
                rows={6}
              />
            </div>
            <button onClick={buildPrompt} className="mt-2 w-full text-[12px] py-2 rounded-md bg-accent text-white hover:opacity-90 transition-opacity">
              🚀 复制 AI 对话提示词
            </button>
            <div className="mt-3 p-2 bg-amber-50 rounded text-[12px] text-[var(--muted)] leading-relaxed">
              <div className="font-semibold mb-1 text-[var(--ink)]">⚠️ 复盘时自查（防中式英语石化）</div>
              <div>• 书面词别当口语：utilize→use · commence→start · purchase→buy</div>
              <div>• 中文直译：open the light→turn on · I very like→I really like</div>
              <div>• 缺缩写：do not→don't · I am→I'm · it is→it's</div>
              <div>• very+形容词：very tired→exhausted · very big→huge</div>
              <div>• 语序像中文：How to say→How do you say</div>
            </div>
            <div className="mt-3">
              <div className="text-[12px] font-semibold mb-1.5">📝 我的复盘记录</div>
              <div className="space-y-2">
                {volkaEntries.map((e, i) => (
                  <div key={i} className="p-2.5 bg-white rounded-md border border-[var(--border)]">
                    <textarea
                      defaultValue={e.content || ''}
                      onBlur={(ev) => updateCardEntry(pageId, card.id, i, { content: ev.target.value, date: e.date || new Date().toISOString().slice(0, 10) })}
                      placeholder="记下这局的易错点 + 标准说法..."
                      className="w-full text-[14px] px-2 py-1.5 border border-accent/30 rounded outline-none focus:border-accent bg-white resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-[var(--muted)]">{e.date || ''}</span>
                      <button onClick={() => { deleteCardEntry(pageId, card.id, i); toast('复盘已删除') }} className="text-[11px] text-red-500 hover:underline">删除</button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => appendCardEntries(pageId, card.id, [{ date: new Date().toISOString().slice(0, 10), content: '' }])}
                className="mt-2 w-full text-[12px] py-2 rounded-md border border-dashed border-accent text-accent hover:bg-accent/5 transition-colors"
              >
                ＋ 添加复盘记录
              </button>
            </div>
          </>
        )
      }

      default:
        // --- listMode cards: quick-input area + collapsible records ---
        if (card.listMode) {
          const [quickInput, setQuickInput] = useState('')
          const [quickSaving, setQuickSaving] = useState(false)
          const [selectedProject, setSelectedProject] = useState('')
          const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
          const [groupsInitialized, setGroupsInitialized] = useState(false)

          // Build project list: unique values from existing entries + default
          const allProjects = useMemo(() => {
            const set_ = new Set<string>()
            ;(card.entries || []).forEach(e => { if (e.project) set_.add(e.project) })
            // If no projects yet, add a sensible default based on card title
            if (set_.size === 0) set_.add(card.title || '未分类')
            return Array.from(set_)
          }, [card.entries, card.title])

          // Initialize selectedProject once from available projects
          useEffect(() => {
            if (!selectedProject && allProjects.length > 0) {
              setSelectedProject(allProjects[0])
            }
          }, [allProjects])

          // Default: collapse all groups on first render
          useEffect(() => {
            if (!groupsInitialized && (card.entries || []).length > 0) {
              const names = new Set<string>()
              ;(card.entries || []).forEach(e => { if (e.project) names.add(e.project) })
              if (names.size === 0) names.add(card.title || '未分类')
              setCollapsedGroups(new Set(names))
              setGroupsInitialized(true)
            }
          }, [groupsInitialized, card.entries, card.title])

          const handleQuickSave = () => {
            const text = quickInput.trim()
            if (!text) { toast('请先输入内容', 'info'); return }
            // Clean broken lines on paste
            const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/(?<!\n)\n(?!\\n)/g, ' ').trim()
            setQuickSaving(true)
            // Detect first field name from existing entries
            const firstEntry = (card.entries || [])[0]
            const quoteKey = firstEntry ? (Object.keys(firstEntry).find(k => k === 'quote' || k === 'main') || 'content') : 'content'
            appendCardEntries(pageId, card.id, [{ [quoteKey]: cleaned, project: selectedProject || (card.title || '未分类') }])
            setQuickInput('')
            setQuickSaving(false)
            toast('已保存为记录 ✅', 'success')
          }

          return (
            <div className="space-y-2">
              {/* Quick input area — always visible */}
              <div className="border border-dashed border-[var(--border)] rounded-lg p-3 bg-[var(--bg)]">
                <div className="text-[13px] font-semibold text-muted mb-1.5">📝 快速录入</div>
                <textarea
                  className="w-full min-h-[100px] p-2.5 rounded-lg border border-[var(--border)] bg-white text-[14px] leading-relaxed text-[var(--ink)] placeholder:text-muted/50 resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="粘贴或输入内容（自动清除碎行），点保存变为下方一条记录..."
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleQuickSave() }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={selectedProject}
                      onChange={e => setSelectedProject(e.target.value)}
                      placeholder="输入或选择项目名"
                      className="text-[12px] px-2 py-1 border border-[var(--border)] rounded-md bg-white text-[var(--ink)] outline-none focus:border-accent w-[160px]"
                    />
                    {/* Quick-select chips for existing projects */}
                    {allProjects.filter(p => p !== selectedProject).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProject(p)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                        title={`切换到「${p}」`}
                      >{p.length > 10 ? p.slice(0, 9) + '…' : p}</button>
                    ))}
                    <span className="text-[12px] text-muted/50">Ctrl+Enter 保存</span>
                  </div>
                  <button
                    onClick={handleQuickSave}
                    disabled={quickSaving || !quickInput.trim()}
                    className="text-[12px] px-3 py-1.5 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
                  >
                    {quickSaving ? '保存中...' : '💾 保存为记录'}
                  </button>
                </div>
              </div>

              {/* Records list — grouped by project */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">📋 记录（{(card.entries || []).length}）</span>
                </div>
                {(card.entries || []).length === 0 && (
                  <div className="text-[12px] text-muted/50 text-center py-4 border border-dashed border-[var(--border)] rounded-lg">
                    暂无记录，在上方输入内容后点击保存
                  </div>
                )}
                {(() => {
                  // Group entries by project
                  const entries = card.entries || []
                  const groups: Record<string, typeof entries> = {}
                  entries.forEach((entry, idx) => {
                    const proj = entry.project || '未分类'
                    if (!groups[proj]) groups[proj] = []
                    groups[proj].push({ entry, originalIndex: idx })
                  })
                  const groupNames = Object.keys(groups)

                  return groupNames.map((groupName, gi) => {
                    const isCollapsed = collapsedGroups.has(groupName)
                    const toggleGroup = () => {
                      setCollapsedGroups(prev => {
                        const next = new Set(prev)
                        if (next.has(groupName)) next.delete(groupName)
                        else next.add(groupName)
                        return next
                      })
                    }
                    // Show first N items when collapsed
                    const collapsedPreviewCount = 2

                    return (
                    <div key={groupName}>
                      {/* Group header — clickable to collapse/expand */}
                      <button
                        onClick={toggleGroup}
                        className="flex items-center gap-2 px-1 py-1.5 bg-accent/5 rounded-md mb-0.5 w-full text-left hover:bg-accent/10 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={14} className={`text-accent transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} />
                        <span className="text-[13px] font-semibold text-accent">📂 {groupName}</span>
                        <span className="text-[11px] text-muted/50">{groups[groupName].length} 条记录</span>
                        {!isCollapsed && groups[groupName].length > 3 && (
                          <span className="text-[11px] text-muted/30 ml-auto">点击收起</span>
                        )}
                      </button>

                      {/* Records — hidden when collapsed, or show preview */}
                      {isCollapsed ? (
                        /* Collapsed preview */
                        <div className="px-1 pb-1 space-y-0.5">
                          {groups[groupName].slice(0, 2).map(({ entry, originalIndex: i }) => {
                            const keys = Object.keys(entry)
                            const qk = keys.find(k => k === 'quote' || k === 'main')
                            const txt = qk && entry[qk] ? mergeBrokenLines(entry[qk]).trim() : ''
                            const short = txt.length > 45 ? txt.slice(0, 42) + '…' : txt
                            return (
                              <div key={i} className="text-[12px] text-muted/60 truncate pl-6">
                                {short || '(空记录)'}
                              </div>
                            )
                          })}
                          {groups[groupName].length > 2 && (
                            <div className="text-[11px] text-accent/60 pl-6">
                              …还有 {groups[groupName].length - 2} 条，点击展开
                            </div>
                          )}
                        </div>
                      ) : groups[groupName].map(({ entry, originalIndex: i }) => {
                        const isOpen = openEntries.has(i)
                        const keys = Object.keys(entry)
                        const quoteKey = keys.find(k => k === 'quote') || keys.find(k => k === 'main')
                        const thoughtKey = keys.find(k => k === 'thought')
                        const doneKey = keys.find(k => k === 'done')
                        const labelKeys = keys.filter(k => k !== 'quote' && k !== 'main' && k !== 'thought' && k !== 'done' && k !== 'project')

                        // Preview: 取第一句话（以句号/感叹号/问号为界），最多35字
                        const getPreviewText = () => {
                          if (quoteKey && entry[quoteKey]) {
                            const merged = mergeBrokenLines(entry[quoteKey]).trim()
                            const sentenceEnd = merged.search(/[。！？\n]/)
                            if (sentenceEnd > 0 && sentenceEnd <= 40) {
                              return merged.slice(0, sentenceEnd + 1)
                            }
                            if (merged.length <= 35) return merged
                            return merged.slice(0, 32) + '…'
                          }
                          if (labelKeys.length > 0) return labelKeys.filter(k => entry[k]).map(k => entry[k]).join(' · ')
                          return ''
                        }
                        const preview = getPreviewText()

                        return (
                          <div key={i} className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
                            {/* Header — strictly one line, click to open (=edit) */}
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg)] transition-colors text-left"
                              onClick={() => {
                                if (isOpen) {
                                  setOpenEntries(prev => { const n = new Set(prev); n.delete(i); return n })
                                  if (editingEntry === i) setEditingEntry(null)
                                } else {
                                  setOpenEntries(new Set([i]))
                                  startEditEntry(i, entry)
                                }
                              }}
                            >
                              <ChevronRight size={13} className={`text-muted transition-transform duration-150 ${isOpen ? 'rotate-90' : ''} shrink-0`} />
                              <span className="flex-1 text-[14px] text-[var(--ink)] overflow-hidden whitespace-nowrap text-ellipsis leading-snug min-h-[24px]">
                                {preview || <span className="text-muted/40 italic">(空记录)</span>}
                              </span>
                              <span className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteCardEntry(pageId, card.id, i); toast('已删除') }}
                                  className="text-[11px] text-muted/30 hover:text-red-500 transition-colors"
                                  title="删除"
                                >删</button>
                              </span>
                            </button>

                            {/* Expanded body — always editable (no separate view mode) */}
                            {isOpen && (
                              <div className="px-3 pb-3 border-t border-[var(--border)] space-y-2 pt-2">
                                {doneKey && (
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editData[doneKey] === 'true'}
                                      onChange={e => setEditData({ ...editData, [doneKey]: e.target.checked ? 'true' : 'false' })}
                                      className="rounded"
                                    />
                                    <span className="text-[12px] text-muted">完成</span>
                                  </label>
                                )}
                                {keys.filter(k => k !== 'done' && k !== 'project').map(k => (
                                  <div key={k}>
                                    <span className="text-[13px] font-semibold text-muted block mb-0.5">{formatFieldLabel(k)}</span>
                                    <textarea
                                      value={editData[k] || ''}
                                      onChange={e => setEditData({ ...editData, [k]: e.target.value })}
                                      className="w-full text-[14px] px-2 py-1.5 border border-accent/30 rounded outline-none focus:border-accent bg-white resize-none"
                                      rows={k === 'thought' || (quoteKey && k === quoteKey) ? 5 : 3}
                                    />
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <button onClick={() => saveEditEntry(i)} className="text-[12px] px-2.5 py-1 bg-accent text-white rounded hover:opacity-90">保存</button>
                                  <button
                                    onClick={() => { setOpenEntries(prev => { const n = new Set(prev); n.delete(i); return n }); setEditingEntry(null) }}
                                    className="text-[12px] px-2.5 py-1 bg-gray-200 text-ink rounded hover:bg-gray-300"
                                  >收起</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                      )}
                    </div>
                    )
                  })
                })()}
              </div>
            </div>
          )
        }

        // Non-listMode cards: render fields normally
        return <>{renderFields()}</>
    }
  }

  return (
    <div
      className="card"
      onContextMenu={handleContextMenu}
      data-card-id={card.id}
      data-page={pageId}
      data-index={index}
    >
      <div className={`card-header ${card.fixed ? 'text-accent' : ''}`}>
        {!card.fixed && (
          <span
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStartCard?.(e, index) }}
            className="cursor-grab active:cursor-grabbing touch-none"
            title="拖动排序"
          >
            <GripVertical size={14} className="text-muted opacity-30" />
          </span>
        )}
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
