import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, BookMarked, Eraser } from 'lucide-react'
import { Card } from '@/types/workbench'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { useToast } from './Toast'
import { freeChat } from '@/utils/freeAI'

type Correction = { wrong: string; right: string; reason: string }
type Vocab = { word: string; meaning: string }
type SumResult = {
  corrections: Correction[]
  vocab: Vocab[]
  suggestions: string[]
}

const chatKey = (pageId: string) => `wb_chat_${pageId}`

/** 容错解析 AI 返回的 JSON（可能带 markdown 代码块包裹） */
function parseAI(text: string): SumResult {
  let t = (text || '').trim()
  // 去掉 ```json ... ``` 包裹
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const tryParse = (s: string): SumResult | null => {
    try {
      const obj = JSON.parse(s)
      return {
        corrections: Array.isArray(obj.corrections) ? obj.corrections : [],
        vocab: Array.isArray(obj.vocab) ? obj.vocab : [],
        suggestions: Array.isArray(obj.suggestions) ? obj.suggestions : [],
      }
    } catch {
      return null
    }
  }
  const direct = tryParse(t)
  if (direct) return direct
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const block = tryParse(t.slice(start, end + 1))
    if (block) return block
  }
  // 兜底：当成一段纯文本建议
  return { corrections: [], vocab: [], suggestions: [t] }
}

const CATEGORY_STYLE: Record<string, string> = {
  纠错: 'bg-red-500/10 text-red-500',
  新词: 'bg-emerald-500/10 text-emerald-600',
  建议: 'bg-sky-500/10 text-sky-600',
}

export default function ErrorSummary({ card, pageId }: { card: Card; pageId: string }) {
  const { appendCardEntries } = useWorkbenchStore()
  // 实时订阅本卡片的 entries，保证保存后列表立刻刷新
  const liveCard = useWorkbenchStore((s) => s.pages[pageId]?.find((c) => c.id === card.id))
  const entries = liveCard?.entries || []
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SumResult | null>(null)
  const [error, setError] = useState('')

  const loadChat = (): Array<{ role: 'user' | 'ai'; text: string }> => {
    try {
      const raw = localStorage.getItem(chatKey(pageId))
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return []
  }

  const summarize = async () => {
    const chat = loadChat()
    if (!chat || chat.length === 0) {
      setError('还没有英语对话记录。先在上方「💬 AI 英语教练」里练一段对话吧～')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)

    const convo = chat
      .slice(-12)
      .map((m) => `${m.role === 'ai' ? 'AI' : '你'}: ${m.text}`)
      .join('\n')

    const prompt = `你是英语纠错收纳助手。下面是用户和 AI 英语教练的一段对话（用户用英语练习，AI 会用中文纠正）。
请只分析【用户】说的话里的错误，不要纠正 AI 的回复。

-- 对话 --
${convo}
-- 结束 --

请只关注用户英语中的错误与可改进点，输出 JSON（不要任何多余文字、不要 markdown 代码块）：
{
  "corrections": [ { "wrong": "用户原句", "right": "正确或更地道的表达", "reason": "简短中文解释原因（语法/词汇/书写习惯等）" } ],
  "vocab": [ { "word": "生词或短语", "meaning": "中文释义" } ],
  "suggestions": [ "给用户的下一步学习建议（1-3 条，口语化中文）" ]
}
如果用户英语没有错误，corrections 和 vocab 可为空数组，suggestions 给鼓励性建议。`

    try {
      const text = await freeChat(prompt, '你是严谨但温暖的英语纠错助手，只输出要求的 JSON，不要解释。')
      setResult(parseAI(text))
    } catch (e: any) {
      setError(e?.message || 'AI 总结失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const save = () => {
    if (!result) return
    const newEntries: Record<string, string>[] = []
    result.corrections.forEach((c) =>
      newEntries.push({ category: '纠错', note: `${c.wrong}\n→ ${c.right}\n${c.reason}` })
    )
    result.vocab.forEach((v) =>
      newEntries.push({ category: '新词', note: `${v.word}：${v.meaning}` })
    )
    result.suggestions.forEach((s) => newEntries.push({ category: '建议', note: s }))

    if (newEntries.length === 0) {
      toast('没有可保存的内容')
      return
    }
    appendCardEntries(pageId, card.id, newEntries)
    toast(`已收纳 ${newEntries.length} 条`)
    setResult(null)
  }

  const clearChat = () => {
    try { localStorage.removeItem(chatKey(pageId)) } catch { /* ignore */ }
    toast('已清空对话记录')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 操作区 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={summarize}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-accent rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? '分析中...' : '总结本段对话'}
        </button>
        <span className="text-[11px] text-[var(--muted)]">
          读取上方「AI 英语教练」的最新对话，自动提炼纠错 / 生词 / 建议
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[12px] text-red-500 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 预览区 */}
      {result && (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          {result.corrections.length > 0 && (
            <div className="p-3 border-b border-[var(--border)]">
              <div className="text-[12px] font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                <span className="w-[3px] h-[11px] bg-red-500 rounded-sm" />纠错（{result.corrections.length}）
              </div>
              <div className="space-y-2">
                {result.corrections.map((c, i) => (
                  <div key={i} className="text-[13px] leading-relaxed bg-red-500/5 rounded-md p-2">
                    <div className="text-[var(--muted)] line-through decoration-red-400">{c.wrong}</div>
                    <div className="text-[var(--ink)] font-medium">→ {c.right}</div>
                    <div className="text-[12px] text-[var(--muted)] mt-0.5">{c.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.vocab.length > 0 && (
            <div className="p-3 border-b border-[var(--border)]">
              <div className="text-[12px] font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                <span className="w-[3px] h-[11px] bg-emerald-500 rounded-sm" />生词（{result.vocab.length}）
              </div>
              <div className="space-y-1.5">
                {result.vocab.map((v, i) => (
                  <div key={i} className="text-[13px] leading-relaxed bg-emerald-500/5 rounded-md p-2">
                    <span className="font-medium text-[var(--ink)]">{v.word}</span>
                    <span className="text-[var(--muted)]">：{v.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="p-3">
              <div className="text-[12px] font-semibold text-sky-600 mb-2 flex items-center gap-1.5">
                <span className="w-[3px] h-[11px] bg-sky-500 rounded-sm" />建议
              </div>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-[13px] text-[var(--ink)] leading-relaxed flex items-start gap-1.5">
                    <span className="text-sky-500 mt-1.5 shrink-0">▸</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-[var(--bg-rule)]/30 border-t border-[var(--border)]">
            <button
              onClick={save}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-all"
            >
              <BookMarked size={13} />保存到收纳
            </button>
            <button
              onClick={() => setResult(null)}
              className="text-[12px] px-2 py-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
            >
              取消
            </button>
            <span className="text-[10px] text-[var(--muted)] ml-auto">保存后可在下方「收纳记录」回看</span>
          </div>
        </div>
      )}

      {/* 已收纳记录 */}
      {entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              收纳记录（{entries.length}）
            </div>
            <button
              onClick={clearChat}
              className="text-[10px] text-[var(--muted)] hover:text-red-500 flex items-center gap-1"
              title="清空 AI 英语教练的对话记录"
            >
              <Eraser size={11} />清空对话
            </button>
          </div>
          <div className="space-y-1.5">
            {entries.map((e, i) => {
              const cat = e.category || ''
              const style = CATEGORY_STYLE[cat] || 'bg-[var(--accent)]/10 text-[var(--accent)]'
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-[var(--bg-card)] border border-[var(--border)]">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${style}`}>{cat}</span>
                  <span className="text-[12px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed flex-1">{e.note}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!result && entries.length === 0 && !error && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/8 mb-2">
            <Sparkles size={18} className="text-accent" />
          </div>
          <p className="text-[12px] text-[var(--muted)] leading-relaxed max-w-[280px] mx-auto">
            和 AI 英语教练练完对话后，点「总结本段对话」，<br />AI 会自动帮你提炼错误和生词并收纳在这里。
          </p>
        </div>
      )}
    </div>
  )
}
