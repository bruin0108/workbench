import { useState, useMemo, Component, type ReactNode } from 'react'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { getReminderSettings, saveReminderSettings, requestNotificationPermission, startReminderLoop, stopReminderLoop } from '@/utils/reminder'
import { pickSyncFile } from '@/utils/autoSync'
import SpeakButton from './SpeakButton'
import { REVIEW_SENTENCES } from '@/data/reviewSentences'

// --- User name (from localStorage) ---
function getUserName(): string {
  try { return localStorage.getItem('wb_user_name') || '小熊' } catch { return '小熊' }
}

// --- SVG Progress Ring ---
function ProgressRing({ pct, size = 80, strokeWidth = 6 }: { pct: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)
  const color = pct >= 80 ? '#52c41a' : pct >= 50 ? '#c4946a' : '#e8e2d9'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border, #e8e2d9)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{pct}%</span>
    </div>
  )
}

// --- Weekly completion bar ---
function WeeklyBars({ history }: { history: Array<{ date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean }> }) {
  const TASKS = ['morning', 'noon', 'eveningJournal', 'eveningNce', 'eveningPhilosophy', 'eveningCoach', 'reading', 'review', 'exercise']
  const LABELS: Record<string, string> = { morning: '跟读', noon: 'Anki', eveningJournal: '外刊', eveningNce: '新概念', eveningPhilosophy: '哲学', eveningCoach: '教练', reading: '阅读', review: '复盘', exercise: '运动' }

  const days: Array<{ ds: string; label: string; pct: number }> = []
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    const h = (history || []).filter((h: any) => h.date === ds)
    let done = 0
    if (h.length > 0) TASKS.forEach(t => { if ((h[0] as any)[t]) done++ })
    days.push({ ds, label: dayLabels[d.getDay()], pct: Math.round(done / TASKS.length * 100) })
  }

  const hasData = days.some(d => d.pct > 0)

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-4">
      <div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2 mb-3">📊 近 7 天完成率</div>
      <div className="flex gap-2 items-end justify-around" style={{ height: 100 }}>
        {days.map((day) => {
          const has = day.pct > 0
          const today2 = new Date().toISOString().slice(0, 10) === day.ds
          const color = today2 ? 'var(--accent)' : has ? 'var(--accent2)' : 'var(--border)'
          return (
            <div key={day.ds} className="flex flex-col items-center gap-1">
              <div className={`text-lg font-bold ${has ? '' : 'text-[var(--muted)]'}`} style={has ? { color } : {}}>
                {has ? `${day.pct}%` : '—'}
              </div>
              <div className="w-7 rounded-full" style={{ height: 4, background: 'var(--border)' }}>
                <div className="rounded-full" style={{ width: `${day.pct}%`, height: 4, background: color }} />
              </div>
              <span className={`text-[11px] ${today2 ? 'font-bold text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{day.label}</span>
            </div>
          )
        })}
      </div>
      {!hasData && (
        <div className="text-center text-[12px] text-[var(--muted)] py-2">
          📝 开始打卡，这里会显示近 7 天的完成率趋势
        </div>
      )}
    </div>
  )
}

// --- Error boundary: keep one broken block from blanking the whole page ---
class SafeBlock extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('[SafeBlock] block crashed:', err) }
  render() { return this.state.failed ? null : this.props.children }
}

// --- Today's Focus: show real learning content, not cold stats ---
interface CardMini { id: string; title: string; type?: string; entries?: Array<Record<string, string>>; notebooks?: Array<{ name: string; lessons: Array<{ title: string; content: string }> }> }
function TodayFocus({ pages }: { pages: Record<string, CardMini[]> }) {
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const emoji = hour < 11 ? '🌅' : hour < 14 ? '☀️' : hour < 18 ? '🌤' : '🌙'

  const now = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`

  // --- Collect real content from learning records ---
  const snippets: Array<{ text: string; source: string; type: 'dialogue' | 'review' | 'peppa' | 'vocab' }> = []

  const engPage = pages['life-english'] || []

  // 1. Scenario key sentences (from learned/in-progress scenarios)
  const scenarioCard = engPage.find(c => c.id === 'eng-scenario-map')
  const rawEntries = scenarioCard?.entries || []
  const scenarios = rawEntries.map(e => ({
    name: e.name || e.title || '',
    level: parseInt(e.level || '0', 10),
    notes: e.notes || '',
  }))
  // Only get from scenarios that have been touched (level >= 1)
  scenarios.filter(s => s.level >= 1 && s.notes).forEach(s => {
    const sections = s.notes.split(/\n(?=##)/)
    const keySection = sections.find(sec => sec.includes('关键句') || sec.includes('Key'))
    if (keySection) {
      // Extract You:/Me: dialogue lines
      const lines = keySection.split('\n').filter(l =>
        /You:|Me \(/.test(l) && l.length > 10
      )
      lines.forEach(l => {
        const clean = l.replace(/^\*+\s*/, '').replace(/`[^`]*`/g, '').trim()
        if (clean.length > 10 && clean.length < 300) {
          snippets.push({ text: clean, source: s.name, type: 'dialogue' })
        }
      })
    }
  })

  // 2. Review dialogues (from eng-weakspots / daily review)
  engPage.forEach(card => {
    if (!card.entries) return
    card.entries.forEach(entry => {
      const v = Object.entries(entry).find(([k]) => k !== 'done')?.[1]
      if (v && v.length > 30 && /[a-zA-Z]{5,}/.test(v)) {
        // Grab English-looking sentences
        const sents = v.split(/[。\n]/).filter(s =>
          /^[^a-zA-Z]*[a-zA-Z]{8,}/.test(s) && s.length < 250 && !s.startsWith('http')
        )
        sents.slice(0, 3).forEach(s =>
          snippets.push({ text: s.trim(), source: card.title, type: 'review' })
        )
      }
    })
  })

  // 3. Peppa translation practice (from notebook card)
  const peppaCard = engPage.find(c => c.id === 'eng-peppa')
  if (peppaCard?.notebooks) {
    peppaCard.notebooks.forEach(nb => {
      if (!nb.lessons) return
      nb.lessons.forEach(ls => {
        // For practice lessons, content has Chinese question + English answer
        if (ls.content && ls.content.length > 5) {
          const lines = ls.content.split('\n').filter(l =>
            /^[a-zA-Z]/.test(l.trim()) && l.trim().length > 8 && l.trim().length < 200
          )
          lines.slice(0, 2).forEach(l =>
            snippets.push({ text: l.trim(), source: `佩奇·${nb.name}`, type: 'peppa' })
          )
        }
      })
    })
  }

  // --- Pick 2-3 diverse snippets for display ---
  const daySeed = Math.floor(now.getTime() / 86400000)
  const picked: typeof snippets = []
  const usedTypes = new Set<string>()
  const usedSources = new Set<string>()
  // Shuffle by day seed and pick diverse ones
  const sorted = [...snippets].sort((a, b) => {
    const ha = (a.source.charCodeAt(0) * 31 + a.text.charCodeAt(0)) % 9999
    const hb = (b.source.charCodeAt(0) * 31 + b.text.charCodeAt(0)) % 9999
    return ((ha + daySeed * 17) % 9999) - ((hb + daySeed * 17) % 9999)
  })
  for (const s of sorted) {
    if (picked.length >= 3) break
    // Prefer diversity: don't pick same type twice unless we run out
    if (usedTypes.has(s.type) && snippets.filter(x => x.type === s.type).length > picked.filter(x => x.type === s.type).length && usedTypes.size < 3) continue
    if (usedSources.has(s.source) && snippets.length > 3) continue
    picked.push(s)
    usedTypes.add(s.type)
    usedSources.add(s.source)
  }

  // Fallback: if no extracted snippets (e.g. scenario notes empty / peppa id mismatch),
  // pull from the static practiced-sentences list so the homepage always shows something useful.
  const isEmpty = picked.length === 0
  let displayItems = picked
  if (isEmpty && REVIEW_SENTENCES.length > 0) {
    const all: typeof snippets = []
    REVIEW_SENTENCES.forEach((g) => {
      g.sentences.forEach((s) => {
        all.push({ text: s, source: g.scene, type: 'dialogue' })
      })
    })
    const start = daySeed % all.length
    const take: typeof snippets = []
    for (let i = 0; i < 3 && all.length > 0; i++) {
      take.push(all[(start + i) % all.length])
    }
    displayItems = take
  }
  const trulyEmpty = displayItems.length === 0

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-[var(--muted)]">{emoji} {greeting}，{getUserName()}</div>
        <div className="text-[10px] text-[var(--muted)]/60">{dateStr}</div>
      </div>

      {trulyEmpty ? (
        <div className="text-[13px] text-[var(--muted)]/60 leading-relaxed py-2 text-center">
          开始一场英语对话，这里就会显示你练过的内容 ✨
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-rule)]/40 hover:bg-[var(--bg-rule)]/60 transition-colors">
              <span className="text-xs mt-0.5 shrink-0">
                {item.type === 'dialogue' ? '💬' : item.type === 'peppa' ? '🐷' : item.type === 'review' ? '📝' : '📌'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--ink)] leading-relaxed">{item.text}</div>
                <div className="text-[10px] text-[var(--muted)]/70 mt-0.5">— {item.source}</div>
              </div>
              <SpeakButton text={item.text} className="shrink-0 mt-0.5" title="朗读" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Learning progress (expanded) ---
function ReadingProgress() {
  const [progress, setProgress] = useState<Record<string, { current: number; total: number }>>(() => {
    try {
      const raw = localStorage.getItem('wb_learning_progress')
      if (raw) return JSON.parse(raw)
    } catch {}
    // Try migrate old format
    try {
      const old = localStorage.getItem('wb_reading_progress')
      if (old) {
        const o = JSON.parse(old)
        const migrated: Record<string, { current: number; total: number }> = {
          nce: { current: 0, total: 96 },
          philo: { current: 0, total: 403 },
          pron: { current: 0, total: 100 },
        }
        if (o.duan) migrated.duan = o.duan
        else migrated.duan = { current: 0, total: 500 }
        if (o.naval) migrated.naval = o.naval
        else migrated.naval = { current: 0, total: 250 }
        localStorage.setItem('wb_learning_progress', JSON.stringify(migrated))
        localStorage.removeItem('wb_reading_progress')
        return migrated
      }
    } catch {}
    return {
      nce: { current: 0, total: 96 },
      philo: { current: 0, total: 403 },
      pron: { current: 0, total: 100 },
      duan: { current: 0, total: 500 },
      naval: { current: 0, total: 250 },
    }
  })

  const updateProgress = (key: string, value: number) => {
    const updated = { ...progress, [key]: { ...progress[key], current: Math.max(0, Math.min(value, progress[key].total)) } }
    setProgress(updated)
    try { localStorage.setItem('wb_learning_progress', JSON.stringify(updated)) } catch {}
  }

  const items = [
    { key: 'nce', name: '新概念第2册', unit: '课', color: 'var(--accent)', icon: '📗' },
    { key: 'philo', name: '哲学简史', unit: '课', color: 'var(--accent2)', icon: '🏛️' },
    { key: 'pron', name: '发音练习', unit: '次', color: '#7c3aed', icon: '🗣️' },
    { key: 'duan', name: '段永平问答录', unit: '页', color: 'var(--accent)', icon: '📘' },
    { key: 'naval', name: '纳瓦尔宝典', unit: '页', color: 'var(--accent2)', icon: '📙' },
  ]

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 animate-fade-in">
      <div className="text-[11px] font-semibold text-[var(--muted)] mb-3">📊 学习进度</div>
      <div className="space-y-2.5">
        {items.map(b => {
          const data = progress[b.key] || { current: 0, total: b.total }
          const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0
          return (
            <div key={b.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-[var(--ink)] font-medium">{b.icon} {b.name}</span>
                <span className="text-[var(--muted)] text-[11px]">
                  <input
                    type="number"
                    value={data.current || ''}
                    onChange={e => updateProgress(b.key, parseInt(e.target.value) || 0)}
                    className="w-10 text-center text-[11px] border border-[var(--border)] rounded px-1 py-0.5 outline-none focus:border-[var(--accent)] bg-transparent"
                    min={0} max={data.total}
                  /> / {data.total} {b.unit}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-rule)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: b.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- 30-day trend line chart ---
function TrendChart({ history }: { history: Array<{ date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean }> }) {
  const TASK_KEYS = ['morning', 'noon', 'eveningJournal', 'eveningNce', 'eveningPhilosophy', 'eveningCoach', 'reading', 'review', 'exercise'] as const
  if (history.length < 3) return null

  // Last 30 days
  const now = new Date()
  const days: Array<{ date: string; rate: number }> = []
  const dateMap: Record<string, number> = {}
  history.forEach(h => {
    const done = TASK_KEYS.filter(k => h[k]).length
    dateMap[h.date] = Math.round((done / TASK_KEYS.length) * 100)
  })

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    days.push({ date: ds, rate: dateMap[ds] ?? -1 })
  }

  const W = 320; const H = 140; const pad = { l: 30, r: 10, t: 10, b: 25 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b

  const validDays = days.filter(d => d.rate >= 0)
  const points = validDays.length > 1 ? validDays.map((d, i) => ({
    x: pad.l + (i / (validDays.length - 1)) * plotW,
    y: pad.t + (1 - d.rate / 100) * plotH,
  })) : []

  const pathD = points.length > 1
    ? `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}`
    : ''

  const maxRate = validDays.length > 0 ? Math.max(...validDays.map(d => d.rate)) : 0

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2 mb-3">
        <span>📈</span> 30天趋势
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line
              x1={pad.l} y1={pad.t + (1 - v / 100) * plotH}
              x2={pad.l + plotW} y2={pad.t + (1 - v / 100) * plotH}
              stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"
            />
            <text x={pad.l - 6} y={pad.t + (1 - v / 100) * plotH + 4} textAnchor="end" className="text-[9px] fill-[var(--muted)]">{v}%</text>
          </g>
        ))}
        {/* Trend line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* End point dot */}
        {points.length > 0 && (
          <>
            <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="var(--accent)" />
            <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8} textAnchor="middle" className="text-[10px] font-semibold fill-[var(--accent)]">
              {validDays[validDays.length - 1].rate}%
            </text>
          </>
        )}
        {/* X axis labels */}
        {[0, Math.floor(validDays.length / 2), validDays.length - 1].filter(i => i < validDays.length).map(i => (
          <text key={i} x={pad.l + (i / (validDays.length - 1)) * plotW} y={H - 4} textAnchor="middle" className="text-[9px] fill-[var(--muted)]">
            {validDays[i]?.date.slice(5) || ''}
          </text>
        ))}
      </svg>
    </div>
  )
}

// --- Daily AI Summary ---
function DailySummary({ history, stats, pages }: { history: Array<{ date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean }>; stats: { total: number; streak: number; rate: number }; pages: Record<string, Array<{ id: string; entries?: Array<Record<string, string>> }>> }) {
  if (history.length === 0) return null

  const TASK_KEYS = ['morning', 'noon', 'eveningJournal', 'eveningNce', 'eveningPhilosophy', 'eveningCoach', 'reading', 'review', 'exercise'] as const
  const TASK_LABELS: Record<string, string> = { morning: '早课', noon: 'Anki', eveningJournal: '外刊', eveningNce: '新概念', eveningPhilosophy: '哲学', eveningCoach: 'AI教练', reading: '阅读', review: '复盘', exercise: '运动' }

  // Last 7 days
  const last7 = history.slice(-7)
  if (last7.length < 3) return null

  const taskRates = TASK_KEYS.map(k => ({
    label: TASK_LABELS[k],
    rate: Math.round((last7.filter(h => h[k]).length / last7.length) * 100),
  }))

  const sorted = [...taskRates].sort((a, b) => b.rate - a.rate)
  const strongest = sorted.slice(0, 2)
  const weakest = sorted.slice(-2).reverse()

  // Weekly completion rate
  const weeklyTotal = last7.reduce((s, h) => {
    const done = TASK_KEYS.filter(k => h[k]).length
    return s + done / TASK_KEYS.length
  }, 0)
  const weeklyRate = Math.round((weeklyTotal / last7.length) * 100)

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2 mb-3">
        <span>🤖</span> AI 每日摘要
      </div>
      <div className="space-y-3 text-[13px]">
        <div className="leading-relaxed">
          <p className="text-[var(--muted)] mb-1">📊 近 7 天整体完成率 <span className="font-bold text-[var(--accent)]">{weeklyRate}%</span>，连续打卡 <span className="font-bold text-[var(--accent2)]">{stats.streak}</span> 天。</p>
          <p className="text-[var(--muted)]">
            💪 最强项：{strongest.map(t => <span key={t.label} className="text-green-600 font-semibold">{t.label}</span>).reduce((a, b) => <>{a}、{b}</>)}
          </p>
          <p className="text-[var(--muted)]">
            🎯 待加强：{weakest.map(t => <span key={t.label} className="text-red-500 font-semibold">{t.label}({t.rate}%)</span>).reduce((a, b) => <>{a}、{b}</>)}
          </p>
          {/* 学习计划里程碑进度 */}
          {(() => {
            const planCards = pages['life-plan'] || []
            const milesCard = planCards.find((c: any) => c.id === 'plan-milestones')
            if (!milesCard?.entries) return null
            const done = milesCard.entries.filter((e: any) => e.done === 'true').length
            const total = milesCard.entries.length
            if (total === 0) return null
            return (
              <p className="text-[var(--muted)]">
                🏆 学习里程碑：<span className="font-bold text-[var(--accent)]">{done}/{total}</span> 已完成
                {' '}({Math.round((done / total) * 100)}%)
              </p>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

function WeeklyInsight({ history }: { history: Array<{ date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean }> }) {
  const TASK_KEYS = ['morning', 'noon', 'eveningJournal', 'eveningNce', 'eveningPhilosophy', 'eveningCoach', 'reading', 'review', 'exercise'] as const
  const TASK_LABELS: Record<string, string> = { morning: '早课', noon: 'Anki', eveningJournal: '外刊', eveningNce: '新概念', eveningPhilosophy: '哲学', eveningCoach: 'AI教练', reading: '阅读', review: '复盘', exercise: '运动' }

  if (history.length < 3) return null

  // Compare last 7 days vs 7-14 days ago
  const now = new Date()
  const cutoff1 = new Date(now); cutoff1.setDate(cutoff1.getDate() - 7)
  const cutoff2 = new Date(now); cutoff2.setDate(cutoff2.getDate() - 14)

  const recent = history.filter(h => new Date(h.date) >= cutoff1)
  const older = history.filter(h => new Date(h.date) >= cutoff2 && new Date(h.date) < cutoff1)

  if (recent.length === 0 || older.length === 0) return null

  // Find weakest and strongest tasks
  const taskRates = TASK_KEYS.map(k => {
    const recentRate = recent.filter(h => h[k]).length / recent.length
    const olderRate = older.filter(h => h[k]).length / older.length
    return { key: k, label: TASK_LABELS[k], recentRate, olderRate, diff: recentRate - olderRate }
  })

  const weakest = taskRates.reduce((a, b) => a.recentRate < b.recentRate ? a : b)
  const mostImproved = taskRates.reduce((a, b) => a.diff > b.diff ? a : b)

  const recentTotal = taskRates.reduce((s, t) => s + t.recentRate, 0)
  const olderTotal = taskRates.reduce((s, t) => s + t.olderRate, 0)
  const trend = recentTotal - olderTotal

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-4">
      <div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2 mb-3">
        <span>📊</span> 周洞察
      </div>
      <div className="space-y-2 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">趋势：</span>
          <span className={trend >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
            {trend >= 0 ? '📈' : '📉'} {trend >= 0 ? '上升' : '下降'} {Math.abs(Math.round(trend * 100))}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">最薄弱：</span>
          <span className="text-red-500 font-semibold">{weakest.label}（{Math.round(weakest.recentRate * 100)}%）</span>
          <span className="text-[10px] text-[var(--muted)]">建议优先加强</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">进步最大：</span>
          <span className="text-green-600 font-semibold">{mostImproved.label}（{mostImproved.diff > 0 ? '+' : ''}{Math.round(mostImproved.diff * 100)}%）</span>
        </div>
      </div>
    </div>
  )
}

export default function WorkbenchDashboard() {
  const { pages, activity, toggleDailyTask, getTodayTasks, getDailyStats, dailyTaskContent, setDailyTaskContent, setDailyTaskNotes, dailyTaskHistory } = useWorkbenchStore()

  const todayTasks = getTodayTasks()
  const stats = getDailyStats()
  // 把"今天"的实时打卡状态并入历史，让下方所有图表即时反映当日进度
  const effectiveHistory = useMemo(() => {
    const base = dailyTaskHistory || []
    const td = todayTasks?.date
    if (!td) return base
    const withoutToday = base.filter((h) => h.date !== td)
    return [...withoutToday, todayTasks]
  }, [dailyTaskHistory, todayTasks])
  const [userName, setUserName] = useState(getUserName)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(userName)

  const handleToggleSync = async () => {
    const picked = await pickSyncFile()
    if (picked) setSyncEnabled(true)
  }

  const handleToggleReminder = async () => {
    if (!reminderEnabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        const settings = getReminderSettings(); settings.enabled = true; saveReminderSettings(settings)
        setReminderEnabled(true); startReminderLoop(() => getTodayTasks())
      }
    } else {
      stopReminderLoop()
      const settings = getReminderSettings(); settings.enabled = false; saveReminderSettings(settings)
      setReminderEnabled(false)
    }
  }

  const saveName = () => {
    const n = nameDraft.trim() || '小熊'
    setUserName(n)
    try { localStorage.setItem('wb_user_name', n) } catch {}
    setEditingName(false)
  }

  const [syncEnabled, setSyncEnabled] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(() => getReminderSettings().enabled)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [lastSaved, setLastSaved] = useState('')

  const dailyTasks = [
    { key: 'eveningCoach', icon: '🗣️', label: '英语对话', time: '1轮·15min', task: dailyTaskContent.eveningCoach },
    { key: 'eveningNce', icon: '🪨', label: '新概念跟读', time: '1课·30min', task: dailyTaskContent.eveningNce },
    { key: 'noon', icon: '📝', label: '每日单词', time: '30词·15min', task: dailyTaskContent.noon },
    { key: 'reading', icon: '📖', label: '阅读/听书', time: '1章·30min', task: dailyTaskContent.reading },
    { key: 'eveningPhilosophy', icon: '💧', label: '哲学简史', time: '1章·30min', task: dailyTaskContent.eveningPhilosophy },
    { key: 'exercise', icon: '🏃', label: '运动', time: '30min', task: dailyTaskContent.exercise },
    { key: 'review', icon: '📝', label: '复盘', time: '10min', task: dailyTaskContent.review },
  ]

  const startEdit = (key: string) => {
    setEditingTask(key)
    setEditValue(dailyTaskContent[key as keyof typeof dailyTaskContent])
  }

  const saveEdit = () => {
    if (editingTask && editValue.trim()) {
      setDailyTaskContent({ ...dailyTaskContent, [editingTask]: editValue.trim() })
    }
    setEditingTask(null)
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`

  // useMemo for expensive computations
  const chatStats = useMemo(() => {
    try {
      const counts: Record<string, number> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('wb_chat_')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const msgs = JSON.parse(raw)
            counts[key.replace('wb_chat_', '')] = Array.isArray(msgs) ? msgs.length : 0
          }
        }
      }
      const total = Object.values(counts).reduce((s, n) => s + n, 0)
      const active = Object.entries(counts).filter(([, n]) => n > 0).length
      return { total, active }
    } catch { return { total: 0, active: 0 } }
  }, [])

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const recentActivity = useMemo(() =>
    activity.filter((a) => new Date(a.time) > weekAgo).length,
    [activity]
  )

  const totalCards = useMemo(() =>
    Object.values(pages).reduce((s, c) => s + c.length, 0),
    [pages]
  )
  const pageCount = Object.keys(pages).length

  const recentActs = useMemo(() => activity.slice(-10).reverse(), [activity])

  const todayDone = Object.values(todayTasks).filter((v) => v === true).length
  const todayTotal = dailyTasks.length
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  // Daily quote memoized — only from personal pages, not work content
  const dailyQuote = useMemo(() => {
    const personalPages = ['life-plan', 'life-english', 'life-reading', 'life-review', 'inspire']
    const allQuotes: Array<{ quote: string; source: string }> = []
    Object.entries(pages).forEach(([pageId, cards]) => {
      if (!personalPages.includes(pageId)) return
      cards.forEach((card) => {
        if (card.entries && card.listMode) {
          card.entries.forEach((entry) => {
            const quoteKey = Object.keys(entry).find(k => k === 'quote' || k === 'main')
            if (quoteKey && entry[quoteKey]?.trim()) {
              allQuotes.push({ quote: entry[quoteKey].trim(), source: card.title })
            }
          })
        }
      })
    })
    if (allQuotes.length === 0) return null
    const dayOfYear = Math.floor((Date.now() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
    return allQuotes[dayOfYear % allQuotes.length]
  }, [pages])

  const getTips = () => {
    const tips = []
    if (hour < 10) tips.push('☀️ 早上记忆力最好，适合背单词或跟读新概念')
    else if (hour < 14) tips.push('🌤️ 午休碎片时间刷30个单词，或看两页书')
    else if (hour < 18) tips.push('💪 下午适合练英语对话，来一场 Volka 场景练习吧')
    else if (hour < 21) tips.push('🌙 晚上黄金时间：佩奇翻译 + 哲学简史 + 阅读')
    else tips.push('😴 夜深了，复盘一下今天，早点休息')
    if (stats.streak > 0) tips.push(`🔥 连续 ${stats.streak} 天打卡，保持节奏！`)
    if (stats.rate < 50) tips.push('📊 今天完成率偏低，挑一件最小的先做起来')
    // Backup: Gist auto-sync handles this, no manual reminder needed
    return tips
  }
  const tips = getTips()

  return (
    <div>
      {/* Hero */}
      <div className="mb-5 pb-4 border-b border-[var(--border)] flex items-end flex-wrap gap-2">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
            className="text-2xl font-bold text-[var(--ink)] bg-transparent border-b-2 border-[var(--accent)] outline-none max-w-[200px]"
          />
        ) : (
          <h1 className="text-2xl font-bold text-[var(--ink)] cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => { setNameDraft(userName); setEditingName(true) }} title="点击修改昵称">
            {greeting}，{userName}
          </h1>
        )}
        <span className="text-sm text-[var(--muted)]">{dateStr}</span>
        <button
          onClick={() => {
            const s = useWorkbenchStore.getState()
            const { saveAllToStorage } = { saveAllToStorage: ((state: any) => {
              try {
                localStorage.setItem('wb_react_v1', JSON.stringify({
                  pages: state.pages, projects: state.projects, activity: state.activity,
                  pageTitles: state.pageTitles, pageOrder: state.pageOrder,
                  _dailyTasks: state.dailyTasks, _dailyTaskHistory: state.dailyTaskHistory,
                }))
                localStorage.setItem('wb_daily_tasks', JSON.stringify({ tasks: state.dailyTasks, history: state.dailyTaskHistory }))
                const now = new Date()
                setLastSaved(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
                setTimeout(() => setLastSaved(''), 2000)
              } catch {}
            }) as any }
            saveAllToStorage(s)
          }}
          className="ml-auto text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
          title="手动保存数据"
        >
          <span>💾</span> {lastSaved || '保存'}
        </button>
        <div className="text-sm text-[var(--accent)] mt-0.5 w-full">🤖 AI 智能工作台 — 你只需要告诉我项目信息，我来帮你整理分析</div>
      </div>

      {/* Today's Focus */}
      <SafeBlock><TodayFocus pages={pages} /></SafeBlock>

      {/* Daily Quote */}
      {dailyQuote && (
        <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-4 animate-fade-in">
          <div className="text-[11px] font-semibold text-[var(--muted)] mb-1.5">📖 今日一言 · {dailyQuote.source}</div>
          <div className="text-[15px] leading-relaxed text-[var(--ink)] font-medium italic border-l-[3px] border-[var(--accent2)] pl-3 py-0.5">
            "{dailyQuote.quote}"
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-[var(--accent2-light)] dark:bg-[var(--accent2-light)] border border-[var(--accent2)]/20 rounded-xl p-4 mb-4 animate-fade-in">
        <div className="text-[11px] font-semibold text-[var(--accent2)] mb-1.5">💡 今日提示</div>
        <div className="space-y-1">
          {tips.map((tip, i) => (
            <div key={i} className="text-[13px] text-[var(--ink)] leading-relaxed">{tip}</div>
          ))}
        </div>
      </div>

      {/* Tasks + Progress Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 border-l-[3px] border-l-[var(--accent2)]">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-[var(--accent2)] text-sm flex items-center gap-1.5">
              <span>📋</span> 今日任务
            </div>
            {stats.total > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                <span>🔥 连续 {stats.streak} 天</span>
                <span>·</span>
                <span>完成率 {stats.rate}%</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {dailyTasks.map((t) => {
              const done = todayTasks[t.key as keyof typeof todayTasks] as boolean
              const isEditing = editingTask === t.key
              return (
                <div key={t.key} className="flex items-center gap-2 text-[13px] rounded-lg px-2.5 py-1.5 -mx-2 group hover:bg-[var(--accent-light)] transition-colors">
                  <span onClick={() => toggleDailyTask(t.key)}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center text-[11px] transition-all cursor-pointer ${done ? 'bg-[var(--accent2)] border-[var(--accent2)] text-white scale-90' : 'border-[var(--border)] hover:border-[var(--accent2)]'}`}>
                    {done ? '✓' : ''}
                  </span>
                  <span className="flex-shrink-0">{t.icon}</span>
                  <span className="text-[var(--muted)] flex-shrink-0 w-16">{t.label} <span className="text-[10px]">{t.time}</span></span>
                  {isEditing ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingTask(null) }}
                      className="flex-1 text-[13px] px-2 py-1 border border-[var(--accent)] rounded-md outline-none bg-[var(--accent-light)]" />
                  ) : (
                    <>
                      <span className={done ? 'line-through text-[var(--muted)] opacity-60' : 'text-[var(--ink)]'}>{t.task}</span>
                      <button onClick={() => startEdit(t.key)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-[var(--muted)] hover:text-[var(--accent)] transition-all ml-1" title="编辑任务内容">✎</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-[var(--border)]">
            <input type="text" value={todayTasks.notes || ''} onChange={(e) => setDailyTaskNotes(e.target.value)}
              placeholder="+ 今天还做了什么？记录一下..."
              className="w-full text-[12px] px-3 py-2 border border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] rounded-lg outline-none bg-transparent transition-all placeholder:text-[var(--muted)]/50" />
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-2">点击 ✎ 编辑任务，备注自动保存</p>
        </div>

        <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center">
          <div className="text-[11px] font-semibold text-[var(--muted)] mb-3">今日完成进度</div>
          <ProgressRing pct={todayPct} size={100} strokeWidth={8} />
          <div className="text-[var(--ink)] text-sm mt-3 font-medium">{todayDone}/{todayTotal} 项已完成</div>
          {stats.streak > 3 && <div className="mt-2 text-[11px] text-[var(--accent2)] font-semibold">🔥 连续 {stats.streak} 天全勤</div>}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[var(--border)] w-full justify-center">
            <button onClick={handleToggleSync}
              className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg transition-all ${syncEnabled ? 'bg-[var(--accent)] text-white' : 'bg-gray-100 dark:bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]'}`}>
              {syncEnabled ? '💾 同步中' : '💾 同步到本地'}
            </button>
            <button onClick={handleToggleReminder}
              className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg transition-all ${reminderEnabled ? 'bg-[var(--accent2)] text-white' : 'bg-gray-100 dark:bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent2-light)] hover:text-[var(--accent2)]'}`}>
              {reminderEnabled ? '🔔 已开启' : '🔕 开启提醒'}
            </button>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="mb-4">
        <ReadingProgress />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-4 stagger">
        <div className="stat-card text-center">
          <div className="text-[var(--accent)] stat-value">{pageCount}</div>
          <div className="stat-label">活跃页面</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-[var(--accent2)] stat-value">{totalCards}</div>
          <div className="stat-label">卡片总数</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-[var(--accent)] stat-value">{chatStats.total}</div>
          <div className="stat-label">AI 对话消息</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-[var(--accent2)] stat-value">{recentActivity}</div>
          <div className="stat-label">本周动态</div>
        </div>
      </div>

      {/* Weekly Insight */}
      <WeeklyInsight history={effectiveHistory} />

      {/* Trend Chart + Daily Summary — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <TrendChart history={effectiveHistory} />
        <DailySummary history={effectiveHistory} stats={stats} pages={pages} />
      </div>

      {/* Weekly completion bars */}
      <WeeklyBars history={effectiveHistory} />

      {/* AI Stats & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--muted)] mb-3">💬 AI 对话统计</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--ink)]">消息总数</span>
              <span className="text-xl font-bold text-[var(--accent)]">{chatStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--ink)]">活跃对话页</span>
              <span className="text-xl font-bold text-[var(--accent2)]">{chatStats.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--ink)]">累计项目</span>
              <span className="text-xl font-bold text-[var(--accent)]">{useWorkbenchStore.getState().projects.length}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="font-semibold text-sm text-[var(--ink)] mb-3">🤖 AI 最近更新了这些</div>
          {recentActs.length === 0 ? (
            <div className="flex items-start gap-3 text-[13px] py-2.5">
              <span className="text-base flex-shrink-0">🤖</span>
              <span className="flex-1 text-[var(--ink)]">AI 工作台已就绪。在对话里告诉我你的项目，我来帮你整理。</span>
              <span className="text-[11px] text-[var(--muted)] flex-shrink-0 w-12">就绪</span>
            </div>
          ) : (
            <div className="space-y-0">
              {recentActs.map((a, i) => {
                const d = new Date(a.time)
                const todayStr = new Date().toDateString()
                const timeLabel = d.toDateString() === todayStr ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`
                return (
                  <div key={i} className="flex items-start gap-3 text-[13px] py-2.5 border-b border-[var(--border)] last:border-b-0">
                    <span className="text-base flex-shrink-0">{a.icon}</span>
                    <span className="flex-1 text-[var(--ink)]">{a.text}</span>
                    <span className="text-[11px] text-[var(--muted)] flex-shrink-0 w-10">{timeLabel}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
