export interface Card {
  id: string
  title: string
  type: 'info' | 'content' | 'skill' | 'table' | 'coach' | 'tab' | 'milestones' | 'analyze' | 'chat' | 'notebook' | 'scenario'
  fields: Record<string, string>
  fixed?: boolean
  tabGroup?: string
  tabLabel?: string
  listMode?: boolean
  entries?: Array<Record<string, string>>
  skillName?: string
  tableType?: string
  analyzeType?: string
  notebooks?: Array<{ name: string; lessons: Array<{ title: string; content: string }> }>
}

export interface Project {
  id: string
  name: string
  type: string
  audience: string
  duration: string
  learning: string
  status: string
  date: string
}

export interface Activity {
  type: string
  icon: string
  text: string
  time: string
}

export interface PageDef {
  id: string
  group: string
  title: string
  desc: string
  badge: string
  isDashboard?: boolean
}

export interface PageGroup {
  id: string
  label: string
}

export interface WorkbenchData {
  pages: Record<string, Card[]>
  projects: Project[]
  activity: Activity[]
  version?: number
}

export const PAGE_DEFS: PageDef[] = [
  { id: 'dashboard', group: 'work', title: '首页', desc: 'AI 智能工作台', badge: 'AI驱动', isDashboard: true },
  { id: 'system', group: 'work', title: '体系拆解库', desc: '你告诉AI项目信息，AI反向分析', badge: 'AI自动梳理' },
  { id: 'creative', group: 'work', title: '培训创意工坊', desc: '培训创意和灵感收集', badge: '' },
  { id: 'speeches', group: 'work', title: '领导致辞记录', desc: 'AI自动提炼核心观点', badge: 'AI提炼' },
  { id: 'community', group: 'work', title: '社群运营话术', desc: '配置通知模板 + AI自动生成话术', badge: 'AI自动生成' },
  { id: 'projects', group: 'work', title: '项目看板', desc: 'AI自动分类、记录、分析', badge: 'AI自动归案' },
  { id: 'skills', group: 'work', title: 'Skill管理', desc: '查看已安装的 AI 技能', badge: '' },
  { id: 'theory', group: 'growth', title: '理论知识体系', desc: '工作中学到的理论和方法论', badge: '' },
  { id: 'office', group: 'growth', title: '办公技能精进', desc: 'PPT、Excel、写作等办公技能', badge: '' },
  { id: 'tools', group: 'growth', title: '数字化工具', desc: '效率工具和数字化工具的学习', badge: '' },
  { id: 'life-plan', group: 'better', title: '学习计划', desc: 'AI帮你评估目标和制定计划', badge: 'AI教练' },
  { id: 'life-english', group: 'better', title: '英语学习', desc: '学习资源库 + 词汇积累 + 每周复盘', badge: 'AI陪跑' },
  { id: 'life-reading', group: 'better', title: '看书', desc: 'AI陪读：引导→记录→提炼→串联', badge: 'AI陪读' },
  { id: 'life-review', group: 'better', title: '学习复盘', desc: 'AI帮你做结构化复盘', badge: '' },
  { id: 'inspire', group: 'future', title: '也许有一天有可能', desc: '探索自己真正擅长和热爱的事', badge: '自我探索' },
]

export const PAGE_GROUPS: PageGroup[] = [
  { id: 'work', label: '培训交付 · 工作中心' },
  { id: 'growth', label: '专业能力成长库' },
  { id: 'better', label: '小熊要更好' },
  { id: 'future', label: '也许有一天有可能' },
]

export const FIELD_LABEL_MAP: Record<string, string> = {
  main: '内容', project: '项目名称', name: '名称', desc: '描述', suitable: '适用场景', effect: '效果',
  sample1: '话术1', sample2: '话术2', sample3: '话术3',
  'company-exec': '🏢 公司级干部培训', 'dept-exec': '🏛️ 部门级干部培训', empowerment: '⚡ 赋能培训', staff: '👥 员工培训',
  before: '📋 培训前', during: '📌 培训中', after: '✅ 培训后',
  trigger: '触发词', need: '需要提供', output: '输出', example: '示例',
  english: '英语目标', reading: '阅读目标', career: '职业学习目标', other: '其他目标',
  currentReading: '正在读的书', want: '想读清单',
  today: '今日完成', vocab: '新学词汇', difficulty: '遇到的困难',
  workUse: '培训场景', emailUse: '邮件写作', dailyUse: '日常对话',
  youlin: '友邻优课', nce: '新概念英语', philosophy: '哲学简史', anki: 'Anki 闪卡', vocabulary: '单词/短语', expressions: '句型/表达',
  chapter: '当前章节', rhythm: '阅读节奏', quote: '摘录', thought: '我的想法',
  keep: 'Keep 保持', improve: 'Improve 改进', start: 'Start 开始', stop: 'Stop 停止',
  done: '已完成', learned: '学到了什么', challenge: '遇到了什么困难', next: '下周重点',
  review: '📝 复盘',
  q1: 'Q1 目标', q2: 'Q2 目标', q3: 'Q3 目标', q4: 'Q4 目标',
  m1: '里程碑 1', m2: '里程碑 2', m3: '里程碑 3', m4: '最终目标',
  core: '最擅长', unique: '独特之处', enjoy: '享受的事', avoid: '不想做的事',
  interest: '愿意做的事', curious: '好奇的事', admire: '羡慕的人', energy: '有精力的事',
  ideas: '尝试方向', info: '了解到的信息', firstStep: '第一步', timeline: '时间规划',
  see: '看到的机会', people: '想认识的人', saying: '心动的句子',
  achievement: '本月成就', gap: '发现的能力差距', growth: '本月成长', goal: '下月目标',
  match: '匹配度', needs: '需要的能力', have: '我已具备', path: '转型路径',
  result: '评估结果', daily: '每日学习时长', focus: '本周重点', milestone: '月度里程碑',
  progress: '本周进步', adjust: '需要调整', nextFocus: '下周重点',
  prompt: '提示词',
}

export function formatFieldLabel(key: string): string {
  return FIELD_LABEL_MAP[key] || key
}
