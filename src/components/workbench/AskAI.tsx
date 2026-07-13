import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Sparkles, Trash2, Copy, Check, User } from 'lucide-react'
import { generateChat } from '@/utils/ai'
import { Markdown } from './Markdown'
import { autoFormatText } from '@/utils/autoFormat'

const TOPIC_PROMPTS: Record<string, string> = {
  theory: '你是一个企业培训领域的知识专家。用户会向你咨询培训模型、方法论、教学设计相关问题。请用专业但易懂的中文回答，给出具体例子和应用场景。',
  office: '你是一个办公软件培训专家。用户会向你咨询PPT设计、Excel数据处理、商务写作等问题。请给出实用、可操作的建议和小技巧。',
  tools: '你是一个数字化工具专家。用户会向你咨询各类AI工具、效率工具的使用方法和推荐。请给出实用建议。',
  'life-review': '你是一个培训人复盘教练。用户会告诉你本周/本月的工作和学习情况，你帮用户做结构化复盘。用温暖鼓励的语气，像朋友一样帮用户看到自己的成长。',
  'life-plan': '你是一个学习教练。用户会告诉你他们的学习目标、当前水平和时间安排。请帮用户：1) 评估目标合理性；2) 制定分阶段计划；3) 指出盲区。',
  'life-english': '你是一个英语学习教练。用户的目标是一年内达到出国交流水平。请用英文和用户对话，根据水平调整难度。遇到用户不懂的地方用中文解释。纠正语法错误，扮演各种场景角色陪练。保持耐心和鼓励。',
  default: '你是一个智能助手。请用专业但易懂的中文回答用户的问题，给出具体建议。',
}

const STORAGE_PREFIX = 'wb_chat_'

function loadHistory(pageId: string): Array<{ role: 'user' | 'ai'; text: string }> {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + pageId); if (raw) return JSON.parse(raw) } catch {}
  return []
}

export default function AskAI({ pageId }: { pageId: string }) {
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<Array<{ role: 'user' | 'ai'; text: string }>>(() => loadHistory(pageId))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [chat, loading])

  const save = useCallback((h: Array<{ role: 'user' | 'ai'; text: string }>) => {
    setChat(h); try { localStorage.setItem(STORAGE_PREFIX + pageId, JSON.stringify(h)) } catch {}
  }, [pageId])

  const sys = TOPIC_PROMPTS[pageId] || TOPIC_PROMPTS.default

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput(''); setError('')
    const updated = [...chat, { role: 'user', text: q } as const]
    save(updated)
    setLoading(true)
    try {
      const ctx = updated.slice(-10).map(m => `${m.role === 'ai' ? 'AI' : '用户'}: ${m.text}`).join('\n')
      const prompt = ctx ? `--- 对话历史 ---\n${ctx}\n---\n用户最新问题: ${q}` : q
      const answer = await generateChat(prompt, sys)
      save([...updated, { role: 'ai', text: answer }])
    } catch (e: any) {
      setError(e?.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const info: Record<string, { title: string; desc: string }> = {
    theory: { title: '培训模型 & 方法论', desc: 'ADDIE、柯氏四级、行动学习... 直接问我任何培训理论问题' },
    office: { title: '办公技能助手', desc: 'PPT排版、Excel公式、商务写作... 直接问，我给你技巧' },
    tools: { title: '数字化工具助手', desc: 'AI工具、效率工具、自动化工具... 告诉我你的需求' },
    'life-review': { title: 'AI 复盘教练', desc: '告诉我你这周做了什么，我帮你做结构化复盘' },
    'life-plan': { title: 'AI 学习教练', desc: '告诉我你的学习目标、当前水平和时间安排，我帮你评估和规划' },
    'life-english': { title: 'AI 英语教练', desc: '用英语和我对话，我会纠正你的表达、陪你练习场景对话' },
  }
  const pi = info[pageId] || { title: 'AI 助手', desc: '向我提问' }

  return (
    <div className="ask-ai">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={15} className="text-accent" />
        <span className="text-[13px] font-semibold text-ink">{pi.title}</span>
        {chat.length > 0 && (
          <button onClick={() => save([])} className="ml-auto text-[10px] text-muted hover:text-red-500 flex items-center gap-1">
            <Trash2 size={12} /> 清空
          </button>
        )}
      </div>

      {chat.length > 0 && (
        <div ref={listRef} className="max-h-[460px] overflow-y-auto mb-3 space-y-3 pr-1">
          {chat.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`chat-avatar ${msg.role === 'ai' ? 'ai' : 'user'}`}>
                {msg.role === 'ai' ? <Sparkles size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble-wrap">
                <div className={`text-[10px] font-semibold mb-1 ${msg.role === 'user' ? 'text-right text-[var(--accent2)]' : 'text-[var(--muted)]'}`}>
                  {msg.role === 'user' ? '你' : 'AI'}
                </div>
                <div className={`chat-bubble ${msg.role} select-text`}>
                  {msg.role === 'ai' ? <Markdown text={autoFormatText(msg.text)} /> : <span className="whitespace-pre-wrap">{msg.text}</span>}
                  {msg.role === 'ai' && (
                    <button className="chat-copy-btn" onClick={() => navigator.clipboard.writeText(msg.text).catch(()=>{})}>
                      <Copy size={11} /> 复制
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg"><div className="chat-avatar ai"><Sparkles size={16} /></div>
              <div className="chat-bubble-wrap"><div className="text-[10px] font-semibold text-[var(--muted)] mb-1">AI</div>
                <div className="chat-bubble ai flex items-center gap-2"><Loader2 size={14} className="animate-spin text-accent" /><span className="text-[13px] text-muted">思考中...</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {chat.length === 0 && !loading && (
        <div className="text-center py-8 mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/8 mb-3"><Sparkles size={22} className="text-accent" /></div>
          <p className="text-[14px] text-muted leading-relaxed max-w-[280px] mx-auto">{pi.desc}</p>
        </div>
      )}

      {error && <p className="text-[12px] text-red-500 mb-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">{error}</p>}

      {pageId === 'life-english' && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {[
            { l: '📖 精读外刊', p: '帮我精读今天这篇友邻外刊文章，分析重点句型，出3道仿写题' },
            { l: '🗣️ 发音纠正', p: '帮我纠正发音。我说一段英语，你帮我指出需要注意的发音点' },
            { l: '✍️ 日记反馈', p: '我写了一段英文日记，帮我检查语法错误并给出更地道的表达：' },
            { l: '🎭 场景对话', p: '我们来做一个场景对话练习。你扮演机场工作人员，我扮演乘客，用英语对话。' },
          ].map(q => (
            <button key={q.l} onClick={() => setInput(q.p)} disabled={loading}
              className="text-[11px] px-2 py-1 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-50">
              {q.l}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder="输入问题，Enter 发送..." disabled={loading}
          className="flex-1 text-[13px] px-3 py-2 border border-rule-bg rounded-lg outline-none focus:border-accent bg-white transition-colors" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="text-[10px] text-muted mt-1.5">对话自动保存 · Enter 发送</p>
    </div>
  )
}
