import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, Sparkles, ArrowRight, Check, Layers, Lightbulb } from 'lucide-react'
import { analyzeSystemDocument, crossAnalyzeProjects } from '@/utils/systemAnalyzer'
import { normalizeSpaces } from '@/utils/text'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { Markdown } from './Markdown'
import { autoFormatText } from '@/utils/autoFormat'

const PAGE_ID = 'system'

interface SavedProject {
  project: string
  overview: string
  courses: string
  ops: string
}

export default function SystemAnalyzer() {
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [crossLoading, setCrossLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{ overview: string; courses: string; ops: string } | null>(null)
  const [filled, setFilled] = useState(false)
  const [crossResults, setCrossResults] = useState<{ patterns: string; unique: string; gaps: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateCardField = useWorkbenchStore((s) => s.updateCardField)
  const addCardEntry = useWorkbenchStore((s) => s.addCardEntry)
  const pages = useWorkbenchStore((s) => s.pages)

  const systemCards = pages[PAGE_ID] || []
  const overviewCard = systemCards.find((c) => c.id === 'sys-overview')
  const savedCount = overviewCard?.entries?.length || 0

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
    setResults(null)
    setFilled(false)
    setCrossResults(null)

    // 自动生成项目名
    if (!projectName.trim()) {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').slice(0, 30)
      setProjectName(name)
    }

    const ext = f.name.split('.').pop()?.toLowerCase()
    try {
      if (ext === 'txt') {
        const text = await f.text()
        setContent(normalizeSpaces(text))
        handleAnalyzeWithContent(normalizeSpaces(text))
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })
        setContent(normalizeSpaces(result.value))
        handleAnalyzeWithContent(normalizeSpaces(result.value))
      } else {
        setError('仅支持 .txt 和 .docx 文件')
        setContent('')
      }
    } catch {
      setError('文件读取失败，请确认文件未损坏')
      setContent('')
    }
  }

  const handleAnalyzeWithContent = async (text: string) => {
    setError('')
    setLoading(true)
    setResults(null)
    setCrossResults(null)
    try {
      const res = await analyzeSystemDocument(text)
      setResults(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }

  // 一次填入全部三个卡片：先设置 fields，再调用 addCardEntry 保存为条目
  const handleFillAllCards = () => {
    if (!results || !projectName.trim()) return
    const pname = projectName.trim()

    // sys-overview: 设置 project 和 main 字段，然后保存
    updateCardField(PAGE_ID, 'sys-overview', 'project', pname)
    updateCardField(PAGE_ID, 'sys-overview', 'main', results.overview)
    addCardEntry(PAGE_ID, 'sys-overview')

    // sys-courses
    updateCardField(PAGE_ID, 'sys-courses', 'project', pname)
    updateCardField(PAGE_ID, 'sys-courses', 'main', results.courses)
    addCardEntry(PAGE_ID, 'sys-courses')

    // sys-ops
    updateCardField(PAGE_ID, 'sys-ops', 'project', pname)
    updateCardField(PAGE_ID, 'sys-ops', 'main', results.ops)
    addCardEntry(PAGE_ID, 'sys-ops')

    setFilled(true)
    setProjectName('')
  }

  // 跨项目提炼共性
  const handleCrossAnalyze = async () => {
    const overviewEntries = overviewCard?.entries || []
    if (overviewEntries.length < 2) {
      setError('至少需要 2 个项目才能提炼共性，请先上传更多项目')
      return
    }

    const coursesCard = systemCards.find((c) => c.id === 'sys-courses')
    const opsCard = systemCards.find((c) => c.id === 'sys-ops')
    const coursesEntries = coursesCard?.entries || []
    const opsEntries = opsCard?.entries || []

    const projects: SavedProject[] = overviewEntries.map((e, i) => ({
      project: e.project || '项目' + (i + 1),
      overview: e.main || '',
      courses: coursesEntries[i]?.main || '',
      ops: opsEntries[i]?.main || '',
    }))

    setCrossLoading(true)
    setCrossResults(null)
    setError('')
    try {
      const res = await crossAnalyzeProjects(projects)
      setCrossResults(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '提炼共性失败')
    } finally {
      setCrossLoading(false)
    }
  }

  // 填充提炼结果到体系提炼卡片
  const handleFillPatterns = () => {
    if (!crossResults) return
    updateCardField(PAGE_ID, 'sys-patterns', 'patterns', crossResults.patterns)
    updateCardField(PAGE_ID, 'sys-patterns', 'unique', crossResults.unique)
    updateCardField(PAGE_ID, 'sys-patterns', 'gaps', crossResults.gaps)
  }

  return (
    <div className="system-analyzer">
      <div className="flex items-center mb-3">
        <span className="text-[13px] font-semibold text-ink">📄 上传文档</span>
        <span className="ml-auto text-[10px] text-muted">支持 .txt / .docx</span>
      </div>

      {/* 项目计数 + 提炼共性按钮 */}
      {savedCount > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-accent2/5 border border-accent2/20 rounded-lg text-[12px]">
          <Layers size={14} className="text-accent2" />
          <span className="text-ink">已收录 <strong className="text-accent2">{savedCount}</strong> 个项目</span>
          {savedCount >= 2 && (
            <button
              onClick={handleCrossAnalyze}
              disabled={crossLoading}
              className="ml-auto flex items-center gap-1 text-[11px] px-2.5 py-1 bg-accent2 text-white rounded-md hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {crossLoading ? (
                <><Loader2 size={12} className="animate-spin" /> 提炼中...</>
              ) : (
                <><Lightbulb size={12} /> 提炼共性</>
              )}
            </button>
          )}
        </div>
      )}

      {/* 项目名称输入 */}
      <div className="mb-3">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="输入项目名称（如：服务业务综合特训营）"
          className="w-full text-[13px] px-3 py-2 border border-rule-bg rounded-lg outline-none focus:border-accent transition-colors bg-white placeholder:text-muted/50"
        />
      </div>

      {/* 上传区域 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all mb-3
          ${file ? 'border-accent/50 bg-accent/3' : 'border-rule-bg hover:border-accent/40 hover:bg-accent/2'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={18} className="text-accent" />
            <span className="text-[13px] font-medium text-ink">{file.name}</span>
            <span className="text-[11px] text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
        ) : (
          <div>
            <Upload size={22} className="text-muted mx-auto mb-1.5" />
            <p className="text-[13px] text-muted">点击上传培训文档</p>
            <p className="text-[11px] text-muted mt-0.5">每个项目独立分析，积累后提炼共性</p>
          </div>
        )}
      </div>

      <button
        onClick={() => handleAnalyzeWithContent(content)}
        disabled={loading || !content}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-medium
                   text-white bg-gradient-to-r from-accent to-[#2d5a60] rounded-lg
                   hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            AI 正在分析...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            开始分析
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-[12px] text-red-500">{error}</p>
      )}

      {/* 单项目分析结果 */}
      {results && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-muted">分析结果</span>
            <button
              onClick={handleFillAllCards}
              disabled={!projectName.trim()}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded transition-colors ${
                filled
                  ? 'text-green-600 bg-green-50'
                  : 'text-white bg-accent hover:opacity-90'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {filled ? <Check size={11} /> : <ArrowRight size={11} />}
              {filled ? '已保存' : '保存全部三张卡片'}
            </button>
          </div>
          {[
            { key: 'overview' as const, label: '项目概览 → 项目档案' },
            { key: 'courses' as const, label: '关键洞察 → 课程&师资' },
            { key: 'ops' as const, label: '可提取复用 → 制度&交付' },
          ].map((item) => (
            <div key={item.key} className="border border-rule-bg rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-accent/3 border-b border-rule-bg">
                <span className="text-[11px] font-semibold text-accent">{item.label}</span>
              </div>
              <div className="p-3 max-h-[200px] overflow-y-auto">
                <Markdown text={autoFormatText(results[item.key])} />
              </div>
            </div>
          ))}
          {!projectName.trim() && (
            <p className="text-[11px] text-muted">请输入项目名称后保存</p>
          )}
        </div>
      )}

      {/* 跨项目提炼结果 */}
      {crossResults && (
        <div className="mt-4 pt-4 border-t-2 border-accent2/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-accent2 flex items-center gap-1">
              <Lightbulb size={14} /> 跨项目提炼
            </span>
            <button
              onClick={handleFillPatterns}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded text-white bg-accent2 hover:opacity-90 transition-opacity"
            >
              <ArrowRight size={11} /> 填入体系提炼卡片
            </button>
          </div>
          {[
            { key: 'patterns' as const, label: '共同模式 — 这些项目的结构共性' },
            { key: 'unique' as const, label: '独特亮点 & 差异化 — 可复用的创新做法' },
            { key: 'gaps' as const, label: '能力覆盖盲区 — 还没覆盖的培训需求' },
          ].map((item) => (
            <div key={item.key} className="border border-accent2/20 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-accent2/5 border-b border-accent2/20">
                <span className="text-[11px] font-semibold text-accent2">{item.label}</span>
              </div>
              <div className="p-3 max-h-[250px] overflow-y-auto">
                <Markdown text={autoFormatText(crossResults[item.key])} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
