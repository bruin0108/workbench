import { useState } from 'react'
import { Sparkles, Loader2, Copy, RefreshCw } from 'lucide-react'
import { generateNotify } from '@/utils/ai'
import { Markdown } from './Markdown'
import { autoFormatText } from '@/utils/autoFormat'

const CATEGORIES = [
  { key: 'company-exec', label: '🏢 公司级干部培训' },
  { key: 'dept-exec', label: '🏛️ 部门级干部培训' },
  { key: 'empowerment', label: '⚡ 赋能培训' },
  { key: 'staff', label: '👥 员工培训' },
]

const PHASES = [
  { key: 'before', label: '📋 培训前' },
  { key: 'during', label: '📌 培训中' },
  { key: 'after', label: '✅ 培训后' },
]

const FIELD_CONFIG = [
  { key: 'projectName', label: '项目名称', placeholder: '例如：服务业务综合特训营第二期' },
  { key: 'audience', label: '学员画像', placeholder: '例如：一线服务人员 30人' },
  { key: 'extra', label: '特殊要求', placeholder: '例如：需要强调打卡规则、着装要求等（可选）' },
]

function getTemplate(category: string, phase: string): string {
  try {
    const raw = localStorage.getItem('wb_react_v1')
    if (!raw) return ''
    const data = JSON.parse(raw)
    const templateCards = data.pages?.community || []
    const cardIdMap: Record<string, string> = {
      'company-exec': 'comm-company-exec',
      'dept-exec': 'comm-dept-exec',
      empowerment: 'comm-empowerment',
      staff: 'comm-staff',
    }
    const templateCard = templateCards.find((c: { id: string }) => c.id === cardIdMap[category])
    if (!templateCard) return ''
    // 合并已保存条目 + 当前输入框内容
    const entries = (templateCard.entries || []) as Array<Record<string, string>>
    const savedTexts = entries.map((e) => e[phase]).filter(Boolean)
    const currentText = templateCard.fields?.[phase] || ''
    const allTexts = [...savedTexts, currentText].filter(Boolean)
    return allTexts.join('\n\n---\n\n')
  } catch {
    return ''
  }
}

export default function NotifyGenerator({ cardId: _cardId, pageId: _pageId }: { cardId: string; pageId: string }) {
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [category, setCategory] = useState('company-exec')
  const [phase, setPhase] = useState('before')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const template = getTemplate(category, phase)
  const hasTemplate = template.length > 20

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handleGenerate = async () => {
    const projectName = inputs.projectName?.trim()
    if (!projectName) {
      setError('请至少填写"项目名称"')
      return
    }
    setError('')
    setLoading(true)
    setResult('')
    try {
      const text = await generateNotify({ ...inputs, category, phase, template })
      setResult(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
    }
  }

  return (
    <div className="notify-generator">
      <div className="flex items-center mb-3">
        <span className="text-[13px] font-semibold text-ink">📝 填写信息</span>
        <span className="ml-auto text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
          免费 AI
        </span>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-muted mb-1">通知类别</label>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
                category === cat.key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-muted border-rule-bg hover:border-accent/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {hasTemplate && (
          <div className="mt-2 text-[11px] text-accent bg-accent/3 px-2 py-1 rounded">
            将参考「{CATEGORIES.find(c => c.key === category)?.label}」·「{PHASES.find(p => p.key === phase)?.label}」模板生成
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-muted mb-1">时间场景</label>
        <div className="flex gap-1.5 flex-wrap">
          {PHASES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPhase(p.key)}
              className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${
                phase === p.key
                  ? 'bg-accent2 text-white border-accent2'
                  : 'bg-white text-muted border-rule-bg hover:border-accent2/30'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {FIELD_CONFIG.map((field) => (
        <div key={field.key} className="mb-2.5">
          <label className="block text-[11px] font-semibold text-muted mb-1">{field.label}</label>
          <input
            type="text"
            value={inputs[field.key] || ''}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full text-[13px] px-2.5 py-2 border border-rule-bg rounded-md outline-none
                       focus:border-accent bg-white transition-colors placeholder:text-[#c4bfb7]"
          />
        </div>
      ))}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 text-sm font-medium
                   text-white bg-gradient-to-r from-accent to-[#2d5a60] rounded-lg
                   hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            正在生成...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            生成通知
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-[12px] text-red-500">{error}</p>
      )}

      {result && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-muted">📋 生成结果</span>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="flex items-center gap-1 text-[11px] text-accent hover:underline">
                <Copy size={12} /> 复制
              </button>
              <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-1 text-[11px] text-muted hover:text-ink">
                <RefreshCw size={12} /> 重新生成
              </button>
            </div>
          </div>
          <div className="p-4 bg-accent/3 border border-dashed border-accent/20 rounded-lg">
            <Markdown text={autoFormatText(result)} />
          </div>
        </div>
      )}
    </div>
  )
}
