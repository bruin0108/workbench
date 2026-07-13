import { useState, useMemo } from 'react'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { Pencil, Check, X, ArrowUpDown, LayoutList, GanttChart } from 'lucide-react'

const TYPE_NAMES: Record<string, string> = {
  leadership: '领导力', technical: '专业技术', newcomer: '新人/通用', service: '服务业务', other: '其他',
}
const TYPE_COLORS: Record<string, string> = {
  leadership: 'bg-accent/10 text-accent',
  technical: 'bg-accent2/10 text-accent2',
  newcomer: 'bg-green-100 text-green-600',
  service: 'bg-purple-100 text-purple-600',
  other: 'bg-gray-100 text-gray-500',
}

const STATUS_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'upcoming', label: '即将开始' },
  { key: 'done', label: '已完成' },
]

const DEMO_PROJECTS = [
  { name: '服务业务综合特训营', type: 'service', audience: '一线服务 30人', duration: '3天', date: '2025-07-15', learning: '', status: 'upcoming' },
  { name: '新员工入职集训', type: 'newcomer', audience: '应届生 45人', duration: '5天', date: '2025-06-01', learning: '企业文化+岗位技能', status: 'done' },
  { name: '中层管理领导力', type: 'leadership', audience: '部门经理 20人', duration: '2天', date: '2025-08-10', learning: '', status: 'upcoming' },
]

export default function ProjectTable() {
  const { projects, updateProject } = useWorkbenchStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date')
  const [sortAsc, setSortAsc] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')
  const [editLearning, setEditLearning] = useState('')

  const rawProjects = projects.length > 0 ? projects : DEMO_PROJECTS
  const displayProjects = useMemo(() => {
    let list = rawProjects.filter((p) => statusFilter === 'all' || p.status === statusFilter)
    list = [...list].sort((a, b) => {
      const va = a[sortBy] || ''
      const vb = b[sortBy] || ''
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [rawProjects, statusFilter, sortBy, sortAsc])

  const handleSort = (col: 'name' | 'date' | 'type') => {
    if (sortBy === col) setSortAsc(!sortAsc)
    else { setSortBy(col); setSortAsc(true) }
  }

  const startEdit = (id: string, current: string) => { setEditingId(id); setEditLearning(current) }

  const saveEdit = (id: string) => {
    if (editingId) { updateProject(id, { learning: editLearning }) }
    setEditingId(null)
  }

  const toggleStatus = (id: string, current: string) => {
    const newStatus = current === 'done' ? 'active' : 'done'
    updateProject(id, { status: newStatus })
  }

  return (
    <div className="overflow-x-auto">
      {projects.length === 0 && (
        <p className="text-[12px] text-muted mb-2">👆 以下为示例数据。在对话里告诉AI你做过的项目，AI帮你自动填入替换。</p>
      )}
      <div className="flex items-center gap-1.5 mb-2">
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.key} onClick={() => setStatusFilter(opt.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${statusFilter === opt.key ? 'bg-accent text-white border-accent' : 'bg-white text-muted border-rule-bg hover:border-accent/30'}`}>
            {opt.label}
          </button>
        ))}
        <span className="text-[11px] text-muted ml-1">{displayProjects.length} 个项目</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setViewMode('table')}
            className={`text-[11px] px-2 py-1 rounded border transition-colors ${viewMode === 'table' ? 'bg-accent text-white border-accent' : 'bg-white text-muted border-rule-bg hover:border-accent/30'}`}
            title="表格视图"><LayoutList size={12} /></button>
          <button onClick={() => setViewMode('timeline')}
            className={`text-[11px] px-2 py-1 rounded border transition-colors ${viewMode === 'timeline' ? 'bg-accent text-white border-accent' : 'bg-white text-muted border-rule-bg hover:border-accent/30'}`}
            title="时间线视图"><GanttChart size={12} /></button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <div className="timeline-view mt-2">
          {displayProjects.map((p, i) => {
            const isDemo = projects.length === 0
            const pid = isDemo ? 'demo-' + i : (p as unknown as { id: string }).id
            return (
              <div key={i} className={`timeline-item ${isDemo ? 'opacity-60' : ''} status-${p.status}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-semibold text-ink">{p.name}</span>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.type] || 'bg-gray-100 text-gray-500'}`}>{TYPE_NAMES[p.type] || p.type}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] ${p.status === 'done' ? 'text-muted' : p.status === 'upcoming' ? 'text-accent2' : 'text-green-600'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.status === 'done' ? 'bg-muted' : p.status === 'upcoming' ? 'bg-accent2' : 'bg-green-500'}`} />
                    {p.status === 'done' ? '已完成' : p.status === 'upcoming' ? '即将开始' : '进行中'}
                  </span>
                  {!isDemo && (
                    <button onClick={() => toggleStatus(pid, p.status)} className="ml-auto text-[10px] text-muted hover:text-ink">
                      {p.status === 'done' ? '↩ 重新打开' : '✔ 标记完成'}
                    </button>
                  )}
                </div>
                <div className="flex gap-4 text-[12px] text-muted">
                  <span>{p.audience}</span><span>{p.duration}</span><span>{p.date}</span>
                </div>
                {p.learning && <p className="text-[12px] text-ink mt-1.5 border-t border-[var(--border)] pt-1.5">📝 {p.learning}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-ink transition-colors">项目名称 <ArrowUpDown size={10} className={sortBy === 'name' ? 'text-accent' : ''} /></button>
                </th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">
                  <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-ink transition-colors">类型 <ArrowUpDown size={10} className={sortBy === 'type' ? 'text-accent' : ''} /></button>
                </th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">学员</th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">时长</th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">状态</th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">📝 复盘</th>
                <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider border-b-2 border-rule-bg">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-ink transition-colors">时间 <ArrowUpDown size={10} className={sortBy === 'date' ? 'text-accent' : ''} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayProjects.map((p, i) => {
                const isDemo = projects.length === 0
                const pid = isDemo ? 'demo-' + i : (p as unknown as { id: string }).id
                const isEditing = pid === editingId
                return (
                  <tr key={i} className={`hover:bg-accent/3 group ${isDemo ? 'opacity-60' : ''}`}>
                    <td className="py-2 px-2.5 border-b border-rule-bg text-ink font-medium">{p.name}</td>
                    <td className="py-2 px-2.5 border-b border-rule-bg">
                      <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.type] || 'bg-gray-100 text-gray-500'}`}>{TYPE_NAMES[p.type] || p.type}</span>
                    </td>
                    <td className="py-2 px-2.5 border-b border-rule-bg text-ink">{p.audience}</td>
                    <td className="py-2 px-2.5 border-b border-rule-bg text-ink">{p.duration}</td>
                    <td className="py-2 px-2.5 border-b border-rule-bg text-ink">
                      <button onClick={() => !isDemo && toggleStatus(pid, p.status)}
                        className={`inline-flex items-center gap-1 text-[11px] cursor-pointer ${isDemo ? 'cursor-default' : ''}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${p.status === 'done' ? 'bg-muted' : p.status === 'upcoming' ? 'bg-accent2' : 'bg-green-500'}`} />
                        {p.status === 'done' ? '已完成' : p.status === 'upcoming' ? '即将开始' : '进行中'}
                      </button>
                    </td>
                    <td className="py-2 px-2.5 border-b border-rule-bg">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <textarea autoFocus value={editLearning} onChange={(e) => setEditLearning(e.target.value)}
                            className="flex-1 text-[12px] px-2 py-1 border border-accent/30 rounded outline-none focus:border-accent bg-white resize-none" rows={2} placeholder="这个项目学到了什么？" />
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => saveEdit(pid)} className="text-[10px] p-1 bg-accent text-white rounded hover:opacity-90"><Check size={10} /></button>
                            <button onClick={() => setEditingId(null)} className="text-[10px] p-1 bg-gray-200 text-ink rounded hover:bg-gray-300"><X size={10} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 min-w-[80px]">
                          {p.learning ? <span className="text-[12px] text-ink leading-relaxed">{p.learning}</span> : <span className="text-[11px] text-muted italic">暂无复盘</span>}
                          {!isDemo && <button onClick={() => startEdit(pid, p.learning)} className="opacity-0 group-hover:opacity-100 text-[10px] text-muted hover:text-accent transition-all flex-shrink-0"><Pencil size={10} /></button>}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2.5 border-b border-rule-bg text-ink">{p.date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-muted mt-2">点击状态切换完成/进行中 · 悬停复盘列编辑学到的东西</p>
        </>
      )}
    </div>
  )
}
