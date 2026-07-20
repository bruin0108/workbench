import { create } from 'zustand'
import { Card, Project, Activity, PageDef, PAGE_DEFS } from '@/types/workbench'
import { getDefaultCards } from '@/utils/workbenchDefaults'
import { SEED_DATA } from '@/utils/seedData'

interface WorkbenchState {
  pages: Record<string, Card[]>
  projects: Project[]
  activity: Activity[]
  pageTitles: Record<string, string>
  pageOrder: Record<string, string[]>
  dailyTasks: { date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean; notes: string }
  dailyTaskHistory: Array<{ date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean; notes: string }>
  dailyTaskContent: { morning: string; noon: string; eveningJournal: string; eveningNce: string; eveningPhilosophy: string; eveningCoach: string; reading: string; review: string; exercise: string }
  currentPage: string
  collapsedGroups: Set<string>
  aiPanelOpen: boolean
  helpOpen: boolean
  contextMenu: { x: number; y: number; pageId: string; cardId: string; index: number } | null
  initialized: boolean

  init: () => void
  switchPage: (pageId: string) => void
  toggleGroup: (groupId: string) => void
  getPageDef: (pageId: string) => PageDef | undefined
  getPageTitle: (pageId: string) => string
  setPageTitle: (pageId: string, title: string) => void
  getPageOrder: (groupId: string) => string[]
  movePage: (groupId: string, fromIdx: number, toIdx: number) => void
  toggleDailyTask: (taskKey: string) => void
  getTodayTasks: () => { date: string; morning: boolean; noon: boolean; eveningJournal: boolean; eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean; reading: boolean; review: boolean; exercise: boolean; notes: string }
  getDailyStats: () => { total: number; streak: number; rate: number }
  setDailyTaskContent: (content: { morning: string; noon: string; eveningJournal: string; eveningNce: string; eveningPhilosophy: string; eveningCoach: string; reading: string; review: string; exercise: string }) => void
  setDailyTaskNotes: (notes: string) => void

  addCard: (pageId: string) => void
  deleteCard: (pageId: string, cardId: string) => void
  duplicateCard: (pageId: string, cardId: string) => void
  moveCard: (pageId: string, fromIdx: number, toIdx: number) => void
  updateCardField: (pageId: string, cardId: string, key: string, value: string) => void
  addCardEntry: (pageId: string, cardId: string) => void
  deleteCardEntry: (pageId: string, cardId: string, entryIndex: number) => void
  updateCardEntry: (pageId: string, cardId: string, entryIndex: number, data: Record<string, string>) => void
  appendCardEntries: (pageId: string, cardId: string, entries: Array<Record<string, string>>) => void
  updateCardNotebooks: (pageId: string, cardId: string, notebooks: Array<{ name: string; lessons: Array<{ title: string; content: string }> }>) => void

  addProject: (project: Project) => void
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void
  logActivity: (activity: Activity) => void

  setAIPanelOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setContextMenu: (menu: { x: number; y: number; pageId: string; cardId: string; index: number } | null) => void

  exportData: () => string
  importData: (json: string) => boolean
  mergeFromCloud: (json: string) => boolean
  resetData: () => void
  copyToClipboard: () => number
  pasteFromClipboard: () => Promise<boolean>
}

const STORAGE_KEY = 'wb_react_v1'

function todayStr(): string {
  // 每天 9:30 刷新，9:30 之前算前一天
  const now = new Date()
  if (now.getHours() < 9 || (now.getHours() === 9 && now.getMinutes() < 30)) {
    now.setDate(now.getDate() - 1)
  }
  return now.toISOString().slice(0, 10)
}

const DEFAULT_TASK_CONTENT = {
  morning: '友邻每日一句跟读 3 遍 + 影子跟读（🪨 核心 · 20min）',
  eveningNce: '新概念第 2 册 听写/背诵 1 课（🪨 核心 · 30min）',
  eveningCoach: 'AI 英语教练场景对话练习（🪨 核心 · 15min）',
  noon: 'Anki 闪卡 30 张（🪨 核心 · 15min）',
  eveningJournal: '友邻外刊精读 1 篇（💧 弹性 · 20min）',
  eveningPhilosophy: '哲学简史听课 2 节（💧 弹性 · 30min）',
  reading: '碎片阅读 10 页 · 段永平/纳瓦尔（📖 · 30min）',
  review: 'KISS 复盘：Keep / Improve / Start / Stop → 写到备注（📝 · 10min）',
  exercise: '运动 30 分钟（🏃 · 30min）',
}

function saveToStorage(state: Pick<WorkbenchState, 'pages' | 'projects' | 'activity' | 'pageTitles' | 'pageOrder'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pages: state.pages,
      projects: state.projects,
      activity: state.activity,
      pageTitles: state.pageTitles,
      pageOrder: state.pageOrder,
      _version: 36,
    }))
  } catch { /* ignore */ }
}

function saveAllToStorage(state: WorkbenchState) {
  try {
    const pkg = {
      pages: state.pages,
      projects: state.projects,
      activity: state.activity,
      pageTitles: state.pageTitles,
      pageOrder: state.pageOrder,
      _dailyTasks: state.dailyTasks,
      _dailyTaskHistory: state.dailyTaskHistory,
      _version: 36,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pkg))
    localStorage.setItem('wb_daily_tasks', JSON.stringify({
      tasks: state.dailyTasks,
      history: state.dailyTaskHistory,
    }))
  } catch { /* ignore */ }
}

function loadFromStorage(): { pages: Record<string, Card[]>; projects: Project[]; activity: Activity[]; pageTitles: Record<string, string>; pageOrder: Record<string, string[]>; _version?: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.pages) return data
    }
  } catch { /* ignore */ }
  return null
}

// 按 id 合并数组（本地优先，云端补本地没有的）
function unionById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const byId = new Map(local.map((x) => [x.id, x]))
  const out = [...local]
  for (const c of cloud) {
    if (!byId.has(c.id)) out.push(c)
  }
  return out
}

// 按 time|text 去重合并活动流
function unionByTime(local: any[], cloud: any[]): any[] {
  const seen = new Set(local.map((x) => (x.time || '') + '|' + (x.text || '')))
  const out = [...local]
  for (const c of cloud) {
    const key = (c.time || '') + '|' + (c.text || '')
    if (!seen.has(key)) { seen.add(key); out.push(c) }
  }
  return out
}

function migrateData(data: { pages: Record<string, Card[]>; projects: Project[]; activity: Activity[]; _version?: number }): boolean {
  const currentVersion = 36
  if (data._version && data._version >= currentVersion) return false

  // 迁移前备份，防止数据丢失
  try {
    const backupKey = STORAGE_KEY + '_backup'
    if (!localStorage.getItem(backupKey)) {
      localStorage.setItem(backupKey, JSON.stringify(data))
    }
  } catch { /* ignore */ }

  // 仅初始化不存在的页面（首次使用），不覆盖已有数据
  const initPages = ['system', 'speeches', 'office', 'skills', 'theory', 'tools', 'life-plan', 'life-english', 'life-review', 'life-reading', 'creative', 'community', 'project-kanban']
  initPages.forEach((pid) => {
    if (!data.pages[pid] || data.pages[pid].length === 0) {
      data.pages[pid] = getDefaultCards(pid)
    }
  })

  // 精准插入 Skill 卡片到社群页面，不动已有模板
  const communityCards = data.pages.community || []
  if (!communityCards.find((c: Card) => c.id === 'skill-notify')) {
    const skillCard = getDefaultCards('community').find((c: Card) => c.id === 'skill-notify')
    if (skillCard) {
      const genIdx = communityCards.findIndex((c: Card) => c.id === 'comm-generated')
      if (genIdx >= 0) {
        communityCards.splice(genIdx, 0, skillCard)
      } else {
        communityCards.push(skillCard)
      }
    }
  }

  // 迁移旧 plan-daily 卡片 → 一年规划 + 每日任务内容独立存储
  const planCards = data.pages['life-plan'] || []
  const oldPlanDaily = planCards.find((c: Card) => c.id === 'plan-daily')
  if (oldPlanDaily) {
    // 把旧卡片里的每日任务内容迁移到独立存储
    const content: Record<string, string> = {}
    if (oldPlanDaily.fields.morning) content.morning = oldPlanDaily.fields.morning.replace(/^☀️ 早上.*?：/, '')
    if (oldPlanDaily.fields.noon) content.noon = oldPlanDaily.fields.noon.replace(/^🌤️ 中午.*?：/, '')
    if (oldPlanDaily.fields.evening) content.evening = oldPlanDaily.fields.evening.replace(/^🌙 晚上.*?：/, '').replace(/^[•-]\s*/, '')
    if (oldPlanDaily.fields.reading) content.reading = oldPlanDaily.fields.reading.replace(/^📖 阅读.*?：/, '')
    if (oldPlanDaily.fields.review) content.review = oldPlanDaily.fields.review.replace(/^📝 复盘.*?：/, '')
    try { localStorage.setItem('wb_daily_task_content', JSON.stringify(content)) } catch {}
    // 替换为新的 plan-year 卡片
    const idx = planCards.findIndex((c: Card) => c.id === 'plan-daily')
    if (idx >= 0) {
      const newPlanYear = getDefaultCards('life-plan').find((c: Card) => c.id === 'plan-year')
      if (newPlanYear) {
        if (oldPlanDaily.fields.overview) newPlanYear.fields.overview = oldPlanDaily.fields.overview
        planCards[idx] = newPlanYear
      }
    }
  }
  // 确保 plan-year 卡片存在
  if (!planCards.find((c: Card) => c.id === 'plan-year')) {
    const newPlanYear = getDefaultCards('life-plan').find((c: Card) => c.id === 'plan-year')
    if (newPlanYear) {
      const chatIdx = planCards.findIndex((c: Card) => c.id === 'plan-chat')
      if (chatIdx >= 0) planCards.splice(chatIdx + 1, 0, newPlanYear)
      else planCards.unshift(newPlanYear)
    }
  }
  // 升级旧 milestones 卡片
  const oldMilestone = planCards.find((c: Card) => c.id === 'plan-milestones' && c.type === 'milestones')
  if (oldMilestone) {
    const newMile = getDefaultCards('life-plan').find((c: Card) => c.id === 'plan-milestones')
    if (newMile) {
      const idx = planCards.indexOf(oldMilestone)
      planCards[idx] = newMile
    }
  }

  // 升级旧 speech skill 卡片 → coach 类型
  const speechCards = data.pages.speeches || []
  const oldSpeechSkill = speechCards.find((c: Card) => c.id === 'skill-speech' && c.type === 'skill')
  if (oldSpeechSkill) {
    const newSpeech = getDefaultCards('speeches').find((c: Card) => c.id === 'skill-speech')
    if (newSpeech) {
      const idx = speechCards.indexOf(oldSpeechSkill)
      speechCards[idx] = { ...newSpeech }
    }
  }

  // 给 speech-list 添加 listMode
  const speechList2 = speechCards.find((c: Card) => c.id === 'speech-list')
  if (speechList2 && speechList2.listMode === undefined) {
    speechList2.listMode = true
    if (!speechList2.entries) speechList2.entries = []
  }

  // 给社群模板卡片添加 listMode
  const templateIds = ['comm-company-exec', 'comm-dept-exec', 'comm-empowerment', 'comm-staff']
  templateIds.forEach((tid) => {
    const card = communityCards.find((c: Card) => c.id === tid)
    if (card && card.listMode === undefined) {
      card.listMode = true
      if (!card.entries) card.entries = []
    }
  })

  // 合并 plan-goals + plan-milestones → plan-year
  const planYear2 = planCards.find((c: Card) => c.id === 'plan-year')
  const planGoals = planCards.find((c: Card) => c.id === 'plan-goals')
  const planMiles = planCards.find((c: Card) => c.id === 'plan-milestones')
  if (planYear2 && (planGoals || planMiles)) {
    if (planGoals?.fields) {
      if (!planYear2.fields.english || planYear2.fields.english === '') planYear2.fields.english = planGoals.fields.english || ''
      if (!planYear2.fields.reading || planYear2.fields.reading === '') planYear2.fields.reading = planGoals.fields.reading || ''
      if (!planYear2.fields.career || planYear2.fields.career === '') planYear2.fields.career = planGoals.fields.career || ''
      if (!planYear2.fields.other || planYear2.fields.other === '') planYear2.fields.other = planGoals.fields.other || ''
    }
    if (planMiles?.fields) {
      if (!planYear2.fields.m1 || planYear2.fields.m1 === '') planYear2.fields.m1 = planMiles.fields.m1 || ''
      if (!planYear2.fields.m2 || planYear2.fields.m2 === '') planYear2.fields.m2 = planMiles.fields.m2 || ''
      if (!planYear2.fields.m3 || planYear2.fields.m3 === '') planYear2.fields.m3 = planMiles.fields.m3 || ''
      if (!planYear2.fields.m4 || planYear2.fields.m4 === '') planYear2.fields.m4 = planMiles.fields.m4 || ''
    }
    const defaultPlanYear = getDefaultCards('life-plan').find((c: Card) => c.id === 'plan-year')
    if (defaultPlanYear?.fields) {
      Object.keys(defaultPlanYear.fields).forEach((k) => {
        if (!(k in planYear2.fields)) planYear2.fields[k] = defaultPlanYear.fields[k]
      })
    }
    data.pages['life-plan'] = planCards.filter((c: Card) => c.id !== 'plan-goals' && c.id !== 'plan-milestones')
  }

  // 替换旧 inspire 卡片（培训设计/TD/OD → 自我探索）
  const inspireCards = data.pages.inspire || []
  const oldInspireIds = ['inspire-design', 'inspire-td', 'inspire-od']
  const hasOldInspire = inspireCards.some((c: Card) => oldInspireIds.includes(c.id))
  if (hasOldInspire || inspireCards.length === 0) {
    const newDefaults = getDefaultCards('inspire')
    // 保留 inspire-self 和 inspire-box 的已有内容
    const oldSelf = inspireCards.find((c: Card) => c.id === 'inspire-self')
    const oldBox = inspireCards.find((c: Card) => c.id === 'inspire-box')
    const merged = newDefaults.map((card: Card) => {
      if (card.id === 'inspire-self' && oldSelf?.fields) {
        return { ...card, fields: { ...card.fields, ...oldSelf.fields } }
      }
      if (card.id === 'inspire-box' && oldBox?.fields) {
        return { ...card, fields: { ...card.fields, ...oldBox.fields, saying: oldBox.fields.quote || oldBox.fields.saying || card.fields.saying } }
      }
      return card
    })
    data.pages.inspire = merged
  }

  // 给创意工坊卡片添加 listMode
  const creativeCards = data.pages.creative || []
  creativeCards.forEach((c: Card) => {
    if (c.listMode === undefined) c.listMode = true
    if (!c.entries) c.entries = []
  })

  // v19: 拆分 evening 为 4 个独立任务 + 更新每日任务内容为简洁版
  try {
    // 更新每日任务内容模板
    const raw = localStorage.getItem('wb_daily_task_content')
    if (raw) {
      const content = JSON.parse(raw)
      if (content.evening && !content.eveningJournal) {
        // 旧版有 evening 字段，直接替换为新的拆分版本
        localStorage.setItem('wb_daily_task_content', JSON.stringify(DEFAULT_TASK_CONTENT))
      }
    }
    // 更新每日任务历史（旧 evening → 新拆分字段）
    const tasksRaw = localStorage.getItem('wb_daily_tasks')
    if (tasksRaw) {
      const tasksData = JSON.parse(tasksRaw)
      let tasksChanged = false
      if (tasksData.tasks && tasksData.tasks.evening !== undefined && tasksData.tasks.eveningJournal === undefined) {
        tasksData.tasks.eveningJournal = tasksData.tasks.evening
        tasksData.tasks.eveningNce = tasksData.tasks.evening
        tasksData.tasks.eveningPhilosophy = tasksData.tasks.evening
        tasksData.tasks.eveningCoach = tasksData.tasks.evening
        delete tasksData.tasks.evening
        tasksChanged = true
      }
      if (tasksData.history) {
        tasksData.history = tasksData.history.map((h: any) => {
          if (h.evening !== undefined && h.eveningJournal === undefined) {
            const { evening, ...rest } = h
            return { ...rest, eveningJournal: evening, eveningNce: evening, eveningPhilosophy: evening, eveningCoach: evening }
          }
          return h
        })
        tasksChanged = true
      }
      if (tasksChanged) {
        localStorage.setItem('wb_daily_tasks', JSON.stringify(tasksData))
      }
    }
  } catch { /* ignore */ }

  // v20: 填写学习计划空字段 + 更新英语学习模块去掉重合
  try {
    const defaults = getDefaultCards('life-plan')
    const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard && defaultYear?.fields) {
      // 只填充空的/模板字段，不覆盖用户已填内容
      const emptyFields = ['q1', 'q2', 'q3', 'q4', 'english', 'reading', 'career', 'other', 'm1', 'm2', 'm3', 'm4']
      emptyFields.forEach((f) => {
        const val = yearCard.fields[f]
        if (!val || val === '' || val.includes('S - 具体：\nM - 衡量标准：') || val === '英语目标：' || val === '阅读目标：' || val === '职业技能目标：' || val === '其他想学的：' || val === '🎯 第一个里程碑：' || val === '📘 第二个里程碑：' || val === '🌟 第三个里程碑：' || val === '🏆 最终目标：') {
          yearCard.fields[f] = defaultYear.fields[f]
        }
      })
    }
    // 更新英语学习模块：旧版 eng-step2 "制定学习计划" → 新版 "学习资源"
    const engCards = data.pages['life-english'] || []
    const engStep2 = engCards.find((c: Card) => c.id === 'eng-step2')
    if (engStep2 && engStep2.title === '2. 制定学习计划') {
      const engDefaults = getDefaultCards('life-english')
      const newStep2 = engDefaults.find((c: Card) => c.id === 'eng-step2')
      const newStep3 = engDefaults.find((c: Card) => c.id === 'eng-step3')
      if (newStep2) {
        engStep2.title = newStep2.title
        engStep2.type = newStep2.type
        engStep2.fields = { ...newStep2.fields, ...engStep2.fields }
      }
      const engStep3 = engCards.find((c: Card) => c.id === 'eng-step3')
      if (engStep3 && engStep3.title === '3. 每日执行 & 跟踪' && newStep3) {
        engStep3.title = newStep3.title
        engStep3.fields = { ...newStep3.fields }
      }
      const engStep4 = engCards.find((c: Card) => c.id === 'eng-step4')
      if (engStep4) {
        engStep4.title = '4. 每周复盘'
        engStep4.fields.prompt = '帮我复盘这周的英语学习：新概念完成了 X 课，哲学简史听了 X 节，外刊精读了 X 篇。请帮我评估效果并给出下周调整建议。'
      }
    }
  } catch { /* ignore */ }

  // v21: 哲学简史只听课不看书，移除阅读任务中的哲学简史英文版
  try {
    const raw = localStorage.getItem('wb_daily_task_content')
    if (raw) {
      const content = JSON.parse(raw)
      if (content.reading?.includes('哲学简史')) {
        content.reading = '读段永平投资问答录/纳瓦尔宝典 10 页（碎片时间，至少 30 分钟）'
        localStorage.setItem('wb_daily_task_content', JSON.stringify(content))
      }
    }
    // 更新学习计划中的阅读目标和里程碑
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard) {
      const defaults = getDefaultCards('life-plan')
      const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
      if (defaultYear?.fields) {
        // 更新 overview 中的阅读部分
        if (yearCard.fields.overview?.includes('哲学简史英文版')) {
          yearCard.fields.overview = defaultYear.fields.overview
        }
        // 更新 reading 目标
        if (yearCard.fields.reading?.includes('哲学简史英文版')) {
          yearCard.fields.reading = defaultYear.fields.reading
        }
        // 更新 q2, q3
        if (yearCard.fields.q2?.includes('哲学简史中文听完后开始读英文版')) {
          yearCard.fields.q2 = defaultYear.fields.q2
        }
        if (yearCard.fields.q3?.includes('哲学简史英文版')) {
          yearCard.fields.q3 = defaultYear.fields.q3
        }
        // 更新 m3
        if (yearCard.fields.m3?.includes('3 本')) {
          yearCard.fields.m3 = defaultYear.fields.m3
        }
      }
    }
    // 更新英语学习 - 水平评估结果
    const engCards = data.pages['life-english'] || []
    const engStep1 = engCards.find((c: Card) => c.id === 'eng-step1')
    if (engStep1?.fields?.result?.includes('中国哲学简史英文版')) {
      const engDefaults = getDefaultCards('life-english')
      const newStep1 = engDefaults.find((c: Card) => c.id === 'eng-step1')
      if (newStep1) {
        engStep1.fields.result = newStep1.fields.result
      }
    }
  } catch { /* ignore */ }

  // v23: 重新排列学习计划字段顺序：目标 → 季度规划 → 里程碑
  try {
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard) {
      const newOrder = ['overview', 'english', 'reading', 'career', 'other', 'q1', 'q2', 'q3', 'q4', 'm1', 'm2', 'm3', 'm4']
      const reordered: Record<string, string> = {}
      newOrder.forEach((key) => {
        if (yearCard.fields[key] !== undefined) {
          reordered[key] = yearCard.fields[key]
        }
      })
      // 保留不在列表中的其他字段
      Object.keys(yearCard.fields).forEach((key) => {
        if (!newOrder.includes(key)) {
          reordered[key] = yearCard.fields[key]
        }
      })
      yearCard.fields = reordered
    }
  } catch { /* ignore */ }

  // v24: 添加学习笔记本卡片到英语学习页面
  try {
    const engCards = data.pages['life-english'] || []
    if (!engCards.find((c: Card) => c.id === 'eng-notes')) {
      engCards.push({
        id: 'eng-notes',
        title: '学习笔记本',
        type: 'notebook',
        notebooks: [
          { name: '每日笔记', lessons: [{ title: '第1课', content: '' }] },
          { name: '词汇积累', lessons: [{ title: '第1课', content: '' }] },
          { name: '语法要点', lessons: [{ title: '第1课', content: '' }] },
          { name: '口语表达', lessons: [{ title: '第1课', content: '' }] },
        ],
        fields: {},
      } as Card)
    }
  } catch { /* ignore */ }

  // v25: 更新笔记本格式 + 删除重复卡片 + 更新英语三阶段规划
  try {
    const engCards = data.pages['life-english'] || []
    // 更新笔记本数据格式
    const notesCard = engCards.find((c: Card) => c.id === 'eng-notes')
    if (notesCard?.notebooks) {
      const first = notesCard.notebooks[0] as any
      if (first && 'content' in first && !('lessons' in first)) {
        notesCard.notebooks = (notesCard.notebooks as any[]).map((nb: any) => ({
          name: nb.name,
          lessons: [{ title: '第1课', content: nb.content || '' }],
        }))
      }
      if (!notesCard.notebooks || notesCard.notebooks.length === 0) {
        notesCard.notebooks = [
          { name: '新概念英语', lessons: [{ title: '第1课', content: '' }] },
          { name: '友邻外刊', lessons: [{ title: '第1篇', content: '' }] },
          { name: '哲学简史', lessons: [{ title: '第1课', content: '' }] },
        ]
      }
    }
    // 删除 eng-step3（词汇与表达积累）和 eng-step4（每周复盘）
    data.pages['life-english'] = engCards.filter((c: Card) => c.id !== 'eng-step3' && c.id !== 'eng-step4')
    // 更新编号（去掉数字前缀）
    const step1 = engCards.find((c: Card) => c.id === 'eng-step1')
    if (step1) step1.title = '水平评估'
    const step2 = engCards.find((c: Card) => c.id === 'eng-step2')
    if (step2) step2.title = '学习资源'
    // 更新学习计划中的英语目标为三阶段规划
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard?.fields?.english && !yearCard.fields.english.includes('三阶段规划')) {
      const defaults = getDefaultCards('life-plan')
      const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
      if (defaultYear?.fields) {
        yearCard.fields.english = defaultYear.fields.english
      }
    }
  } catch { /* ignore */ }


  // v26: 更新英语学习模块（四阶段计划 + 每周复盘） + 看书模块（纳瓦尔财富/杠杆摘录）
  try {
    const engCards = data.pages['life-english'] || []
    // 添加 eng-plan 四阶段学习计划卡片
    if (!engCards.find((c: Card) => c.id === 'eng-plan')) {
      const engDefaults = getDefaultCards('life-english')
      const planCard = engDefaults.find((c: Card) => c.id === 'eng-plan')
      if (planCard) {
        const chatIdx = engCards.findIndex((c: Card) => c.id === 'eng-chat')
        engCards.splice(chatIdx + 1, 0, planCard)
      }
    }
    // 添加 eng-weekly 每周复盘卡片
    if (!engCards.find((c: Card) => c.id === 'eng-weekly')) {
      const engDefaults = getDefaultCards('life-english')
      const weeklyCard = engDefaults.find((c: Card) => c.id === 'eng-weekly')
      if (weeklyCard) {
        engCards.push(weeklyCard)
      }
    }
    // 更新 eng-step1 水平评估结果
    const engStep1 = engCards.find((c: Card) => c.id === 'eng-step1')
    if (engStep1) {
      const engDefaults = getDefaultCards('life-english')
      const newStep1 = engDefaults.find((c: Card) => c.id === 'eng-step1')
      if (newStep1?.fields?.result) {
        engStep1.fields.result = newStep1.fields.result
      }
    }

    // 更新看书模块：纳瓦尔宝典添加财富/杠杆摘录
    const readingCards = data.pages['life-reading'] || []
    const navalCard = readingCards.find((c: Card) => c.id === 'read-naval')
    if (navalCard && navalCard.entries && navalCard.entries.length === 1) {
      const readingDefaults = getDefaultCards('life-reading')
      const defaultNaval = readingDefaults.find((c: Card) => c.id === 'read-naval')
      if (defaultNaval?.entries && defaultNaval.entries.length > 1) {
        navalCard.entries = defaultNaval.entries
      }
    }
  } catch { /* ignore */ }


  // v27: 体系拆解库改为 listMode 累积模式 + 新增体系提炼卡片
  try {
    // 转换已有系统卡片为 listMode
    const systemCards = data.pages.system || []
    const overviewCard = systemCards.find((c: Card) => c.id === 'sys-overview')
    if (overviewCard && !overviewCard.listMode) {
      // 如果有旧内容，保存为第一条条目
      if (overviewCard.fields.main && overviewCard.fields.main !== '还没有内容。上传培训文档后，AI会自动分析并填充到这里。') {
        overviewCard.entries = [{ project: '已导入项目', main: overviewCard.fields.main }]
      }
      overviewCard.listMode = true
      overviewCard.title = '项目档案'
      overviewCard.fields = { project: '', main: '' }
    }
    const coursesCard = systemCards.find((c: Card) => c.id === 'sys-courses')
    if (coursesCard && !coursesCard.listMode) {
      if (coursesCard.fields.main && coursesCard.fields.main !== '还没有内容。上传培训文档后，AI会自动分析并填充到这里。') {
        coursesCard.entries = [{ project: '已导入项目', main: coursesCard.fields.main }]
      }
      coursesCard.listMode = true
      coursesCard.fields = { project: '', main: '' }
    }
    const opsCard = systemCards.find((c: Card) => c.id === 'sys-ops')
    if (opsCard && !opsCard.listMode) {
      if (opsCard.fields.main && opsCard.fields.main !== '还没有内容。上传培训文档后，AI会自动分析并填充到这里。') {
        opsCard.entries = [{ project: '已导入项目', main: opsCard.fields.main }]
      }
      opsCard.listMode = true
      opsCard.title = '制度 & 交付'
      opsCard.fields = { project: '', main: '' }
    }
    // 添加体系提炼卡片
    if (!systemCards.find((c: Card) => c.id === 'sys-patterns')) {
      const systemDefaults = getDefaultCards('system')
      const patternsCard = systemDefaults.find((c: Card) => c.id === 'sys-patterns')
      if (patternsCard) {
        systemCards.push(patternsCard)
      }
    }
  } catch { /* ignore */ }


  // v28: 纳瓦尔宝典新增"读比听快，做比看快"摘录
  try {
    const readingCards = data.pages['life-reading'] || []
    const navalCard = readingCards.find((c: Card) => c.id === 'read-naval')
    if (navalCard && navalCard.entries) {
      const hasEntry = navalCard.entries.some((e: any) => e.quote?.includes('读比听快'))
      if (!hasEntry) {
        const readingDefaults = getDefaultCards('life-reading')
        const defaultNaval = readingDefaults.find((c: Card) => c.id === 'read-naval')
        if (defaultNaval?.entries) {
          const newEntry = defaultNaval.entries.find((e: any) => e.quote?.includes('读比听快'))
          if (newEntry) {
            navalCard.entries = [...navalCard.entries, newEntry]
          }
        }
      }
    }
  } catch { /* ignore */ }

  // v30: 添加季度规划卡片 + 里程碑进度卡片 + 更新 coach-action 为 coach 类型
  try {
    const planCards = data.pages['life-plan'] || []
    // 添加 plan-quarters 卡片
    if (!planCards.find((c: Card) => c.id === 'plan-quarters')) {
      const defaults = getDefaultCards('life-plan')
      const quartersCard = defaults.find((c: Card) => c.id === 'plan-quarters')
      if (quartersCard) {
        const coachIdx = planCards.findIndex((c: Card) => c.id === 'plan-coach')
        if (coachIdx >= 0) planCards.splice(coachIdx, 0, quartersCard)
        else planCards.push(quartersCard)
      }
    }
    // 添加 plan-milestones 卡片
    if (!planCards.find((c: Card) => c.id === 'plan-milestones')) {
      const defaults = getDefaultCards('life-plan')
      const milesCard = defaults.find((c: Card) => c.id === 'plan-milestones')
      if (milesCard) {
        const quartersIdx = planCards.findIndex((c: Card) => c.id === 'plan-quarters')
        if (quartersIdx >= 0) planCards.splice(quartersIdx + 1, 0, milesCard)
        else planCards.push(milesCard)
      }
    }
    // 更新 plan-coach-action 从 info → coach
    const coachAction = planCards.find((c: Card) => c.id === 'plan-coach-action')
    if (coachAction && coachAction.type === 'info') {
      coachAction.type = 'coach'
      coachAction.fields = { prompt: '请帮我评估我的学习计划是否合理：\n\n我目前每天的学习安排：早上跟读外刊20分钟，中午Anki闪卡15分钟，晚上新概念/哲学简史/外刊精读各30分钟+AI教练15分钟，碎片时间阅读30分钟，复盘10分钟，运动30分钟。\n\n请帮我判断：目标是否合理、时间分配是否均衡、有没有遗漏。', ...coachAction.fields }
    }
  } catch { /* ignore */ }

  // v31: 清理冗余卡片 — 删除 eng-step1/eng-plan/plan-coach-action/plan-eng-detail
  try {
    const engCards = data.pages['life-english'] || []
    data.pages['life-english'] = engCards.filter((c: Card) => c.id !== 'eng-step1' && c.id !== 'eng-plan')
    const planCards = data.pages['life-plan'] || []
    data.pages['life-plan'] = planCards.filter((c: Card) => c.id !== 'plan-coach-action' && c.id !== 'plan-eng-detail')
  } catch { /* ignore */ }

  // v32: 精简 plan-year — 删除 q1-q4/m1-m4 字段 + 优化所有达成路径
  try {
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard) {
      yearCard.title = '📅 年度总目标'
      const removeFields = ['q1', 'q2', 'q3', 'q4', 'm1', 'm2', 'm3', 'm4']
      removeFields.forEach(f => { delete yearCard.fields[f] })
      // 用优化后的模板更新各领域规划
      const defaults = getDefaultCards('life-plan')
      const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
      if (defaultYear?.fields) {
        // 英语：如果旧版很长（有老的三阶段）或很短，替换为新版
        if (!yearCard.fields.english || yearCard.fields.english.length < 200 || yearCard.fields.english.includes('每天 1 课 → 72 课')) {
          yearCard.fields.english = defaultYear.fields.english
        }
        if (!yearCard.fields.reading || yearCard.fields.reading.length < 80 || !yearCard.fields.reading.includes('最低限度')) {
          yearCard.fields.reading = defaultYear.fields.reading
        }
        if (!yearCard.fields.career || yearCard.fields.career.length < 30 || yearCard.fields.career.includes('定期关注')) {
          yearCard.fields.career = defaultYear.fields.career
        }
        if (!yearCard.fields.other || yearCard.fields.other.length < 10) {
          yearCard.fields.other = defaultYear.fields.other
        }
      }
    }
  } catch { /* ignore */ }

  // v33: 强制更新 plan-year 所有内容到最新模板（overview 平衡三个领域 + 英语阶段在上）
  try {
    const planCards = data.pages['life-plan'] || []
    const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
    if (yearCard) {
      const defaults = getDefaultCards('life-plan')
      const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
      if (defaultYear?.fields) {
        yearCard.title = '📅 年度总目标'
        yearCard.fields.overview = defaultYear.fields.overview
        yearCard.fields.english = defaultYear.fields.english
        yearCard.fields.reading = defaultYear.fields.reading
        yearCard.fields.career = defaultYear.fields.career
        yearCard.fields.other = defaultYear.fields.other
        // 删除旧字段
        const removeFields = ['q1', 'q2', 'q3', 'q4', 'm1', 'm2', 'm3', 'm4']
        removeFields.forEach(f => { delete yearCard.fields[f] })
      }
    }
  } catch { /* ignore */ }

  // v33 同步更新每日任务内容为新的核心/弹性结构
  try {
    const raw = localStorage.getItem('wb_daily_task_content')
    if (raw) {
      const content = JSON.parse(raw)
      // 检测是否为旧版（没有🪨标记）
      if (content.morning && !content.morning.includes('🪨')) {
        localStorage.setItem('wb_daily_task_content', JSON.stringify(DEFAULT_TASK_CONTENT))
      }
    }
  } catch { /* ignore */ }

  // v34: 确保英语学习页带「纠错 & 词汇收纳」卡片（保留其他卡片，避免误删用户内容）
  try {
    const engCards = data.pages['life-english'] || []
    if (!engCards.find((c: Card) => c.id === 'eng-corrections')) {
      const defaults = getDefaultCards('life-english')
      const correctionsCard = defaults.find((c: Card) => c.id === 'eng-corrections')
      if (correctionsCard) data.pages['life-english'] = [...engCards, correctionsCard]
    }
  } catch { /* ignore */ }

  // v35: 纠错卡片升级为 skill 类型，支持 AI 自动总结
  try {
    const engCards = data.pages['life-english'] || []
    const engCorr = engCards.find((c: Card) => c.id === 'eng-corrections')
    if (engCorr) {
      if (engCorr.type !== 'skill') {
        engCorr.type = 'skill'
        engCorr.skillName = 'english-error-summary'
        // 老数据里 entries 只是占位说明（info 类型从不渲染），升级后清空，给干净起始
        engCorr.entries = []
      }
      if (!engCorr.fields) engCorr.fields = {}
      if (!('category' in engCorr.fields)) engCorr.fields.category = ''
      if (!('note' in engCorr.fields)) engCorr.fields.note = ''
    }
  } catch { /* ignore */ }

  // v36: 灵感页新增「金句 & 感悟」卡片（可累积的好句/感悟收藏，含首条示例）
  try {
    const inspireCards = data.pages['inspire'] || []
    if (!inspireCards.find((c: Card) => c.id === 'inspire-quotes')) {
      const defaults = getDefaultCards('inspire')
      const quotesCard = defaults.find((c: Card) => c.id === 'inspire-quotes')
      if (quotesCard) data.pages['inspire'] = [...inspireCards, quotesCard]
    }
  } catch { /* ignore */ }

  data._version = Math.max(data._version || 0, currentVersion)
  return true
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  pages: {},
  projects: [],
  activity: [],
  pageTitles: {},
  pageOrder: {},
  dailyTasks: { date: todayStr(), morning: false, noon: false, eveningJournal: false, eveningNce: false, eveningPhilosophy: false, eveningCoach: false, reading: false, review: false, exercise: false, notes: '' },
  dailyTaskHistory: [],
  dailyTaskContent: { ...DEFAULT_TASK_CONTENT },
  currentPage: 'dashboard',
  collapsedGroups: new Set(),
  aiPanelOpen: false,
  helpOpen: false,
  contextMenu: null,
  initialized: false,

  init: () => {
    if (get().initialized) return
    const saved = loadFromStorage()
    if (saved) {
      const changed = migrateData(saved)
      set({ ...saved, pageOrder: saved.pageOrder || {}, collapsedGroups: new Set(), initialized: true })
      if (changed) saveToStorage(saved)
    } else if (SEED_DATA && SEED_DATA.pages) {
      // 首次打开：从内嵌种子数据灌入用户默认工作台（含纠错功能卡片）
      const pages = SEED_DATA.pages as unknown as Record<string, Card[]>
      const projects = (SEED_DATA.projects || []) as unknown as Project[]
      const activity = (SEED_DATA.activity || []) as unknown as Activity[]
      const pageTitles = (SEED_DATA.pageTitles || {}) as Record<string, string>
      const pageOrder = (SEED_DATA.pageOrder || {}) as Record<string, string[]>
      // 灌入 AI 对话记录 (wb_chat_*)
      try {
        Object.entries(SEED_DATA.chatHistory || {}).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value))
        })
      } catch { /* ignore */ }
      // 灌入每日任务数据 (wb_daily_tasks / wb_daily_task_content)
      try {
        Object.entries(SEED_DATA.dailyTaskData || {}).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value))
        })
      } catch { /* ignore */ }
      set({ pages, projects, activity, pageTitles, pageOrder, initialized: true })
      saveToStorage({ pages, projects, activity, pageTitles, pageOrder })
      // 重新加载每日任务到 store（与 importData 行为一致）
      try {
        const raw = localStorage.getItem('wb_daily_tasks')
        if (raw) {
          const td = JSON.parse(raw)
          set({ dailyTasks: td.tasks || get().dailyTasks, dailyTaskHistory: td.history || [] })
        }
      } catch { /* ignore */ }
    } else {
      const pages: Record<string, Card[]> = {}
      PAGE_DEFS.forEach((p) => {
        if (!p.isDashboard) {
          pages[p.id] = getDefaultCards(p.id)
        }
      })
      const activity = [{ type: 'init', icon: '🤖', text: 'AI 工作台已就绪。在对话里告诉我你的项目，我来帮你整理。', time: new Date().toISOString() }]
      set({ pages, activity, pageTitles: {}, pageOrder: {}, initialized: true })
      saveToStorage({ pages, projects: [], activity, pageTitles: {}, pageOrder: {} })
    }
    // 兜底：确保关键卡片始终存在（即使迁移/导入/种子路径遗漏），并移除无用「学习资源」卡片
    try {
      const pages = get().pages
      const nextPages = { ...pages }
      let changed = false
      // 英语学习页：纠错卡片 + 移除已确认无用的「学习资源」
      const eng = pages['life-english']
      if (eng) {
        const hasCorr = eng.some((c: Card) => c.id === 'eng-corrections')
        let next = eng.filter((c: Card) => c.id !== 'eng-step2')
        if (!hasCorr) {
          const corr = getDefaultCards('life-english').find((c: Card) => c.id === 'eng-corrections')
          if (corr) next = [...next, corr]
        }
        if (next !== eng) { nextPages['life-english'] = next; changed = true }
      }
      // 灵感页：金句 & 感悟卡片（换电脑首次打开也能出现）
      const insp = pages['inspire']
      if (insp && !insp.some((c: Card) => c.id === 'inspire-quotes')) {
        const quotes = getDefaultCards('inspire').find((c: Card) => c.id === 'inspire-quotes')
        if (quotes) { nextPages['inspire'] = [...insp, quotes]; changed = true }
      }
      if (changed) {
        set({ pages: nextPages })
        saveToStorage({ pages: nextPages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
      }
    } catch { /* ignore */ }
    // 加载每日任务（优先独立 key，回退主数据备份）
    try {
      let raw = localStorage.getItem('wb_daily_tasks')
      if (!raw) {
        const mainRaw = localStorage.getItem(STORAGE_KEY)
        if (mainRaw) {
          const main = JSON.parse(mainRaw)
          if (main._dailyTasks) raw = JSON.stringify({ tasks: main._dailyTasks, history: main._dailyTaskHistory || [] })
        }
      }
      if (raw) {
        const data = JSON.parse(raw)
        const today = todayStr()
        const storedTasks = data.tasks
        let history = data.history || []
        let tasks
        if (storedTasks?.date === today) {
          tasks = storedTasks
        } else {
          // 跨天：先把昨天（storedTasks）的打卡归档进历史，再重置为今天，避免记录丢失
          if (storedTasks?.date) history = [...history, { ...storedTasks }]
          tasks = { date: today, morning: false, noon: false, eveningJournal: false, eveningNce: false, eveningPhilosophy: false, eveningCoach: false, reading: false, review: false, exercise: false, notes: '' }
        }
        set({
          dailyTasks: tasks,
          dailyTaskHistory: history,
        })
      }
    } catch { /* ignore */ }
    // 加载每日任务内容模板
    try {
      const raw = localStorage.getItem('wb_daily_task_content')
      if (raw) {
        const content = JSON.parse(raw)
        set({ dailyTaskContent: { ...DEFAULT_TASK_CONTENT, ...content } })
      }
    } catch { /* ignore */ }
    // 恢复上次浏览的页面
    try {
      const lastPage = localStorage.getItem('wb_current_page')
      if (lastPage && PAGE_DEFS.some(p => p.id === lastPage)) {
        set({ currentPage: lastPage })
      }
    } catch { /* ignore */ }
  },

  switchPage: (pageId) => {
    set({ currentPage: pageId })
    try { localStorage.setItem('wb_current_page', pageId) } catch {}
  },

  toggleGroup: (groupId) => {
    const groups = new Set(get().collapsedGroups)
    if (groups.has(groupId)) groups.delete(groupId)
    else groups.add(groupId)
    set({ collapsedGroups: groups })
  },

  getPageDef: (pageId) => PAGE_DEFS.find((p) => p.id === pageId),

  getPageTitle: (pageId) => {
    const custom = get().pageTitles[pageId]
    if (custom) return custom
    return PAGE_DEFS.find((p) => p.id === pageId)?.title || pageId
  },

  setPageTitle: (pageId, title) => {
    const pageTitles = { ...get().pageTitles, [pageId]: title }
    set({ pageTitles })
    saveToStorage({ pages: get().pages, projects: get().projects, activity: get().activity, pageTitles, pageOrder: get().pageOrder })
  },

  getPageOrder: (groupId) => {
    const custom = get().pageOrder?.[groupId]
    if (custom && custom.length > 0) return custom
    return PAGE_DEFS.filter((p) => p.group === groupId && !p.isDashboard).map((p) => p.id)
  },

  movePage: (groupId, fromIdx, toIdx) => {
    const pageOrder = { ...(get().pageOrder || {}) }
    const order = [...(pageOrder[groupId] || PAGE_DEFS.filter((p) => p.group === groupId && !p.isDashboard).map((p) => p.id))]
    const item = order.splice(fromIdx, 1)[0]
    order.splice(toIdx, 0, item)
    pageOrder[groupId] = order
    set({ pageOrder })
    saveToStorage({ pages: get().pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder })
  },

  toggleDailyTask: (taskKey) => {
    const today = todayStr()
    let dailyTasks = { ...get().dailyTasks }
    if (dailyTasks.date !== today) {
      const history = [...get().dailyTaskHistory, { ...dailyTasks }]
      dailyTasks = { date: today, morning: false, noon: false, eveningJournal: false, eveningNce: false, eveningPhilosophy: false, eveningCoach: false, reading: false, review: false, exercise: false, notes: '' }
      set({ dailyTaskHistory: history })
    }
    dailyTasks = { ...dailyTasks, [taskKey]: !dailyTasks[taskKey as keyof typeof dailyTasks] }
    set({ dailyTasks })
    saveAllToStorage({ ...get(), dailyTasks, dailyTaskHistory: get().dailyTaskHistory })
  },

  getTodayTasks: () => {
    const today = todayStr()
    const tasks = get().dailyTasks
    if (tasks.date !== today) return { date: today, morning: false, noon: false, eveningJournal: false, eveningNce: false, eveningPhilosophy: false, eveningCoach: false, reading: false, review: false, exercise: false, notes: '' }
    return tasks
  },

  getDailyStats: () => {
    // 把"今天"的实时打卡状态并入历史，使完成率/连续天数即时反映当日进度
    const history = [...get().dailyTaskHistory]
    const todayObj = get().getTodayTasks()
    const td = todayObj.date
    const idx = history.findIndex((h) => h.date === td)
    if (idx >= 0) history[idx] = todayObj
    else history.push(todayObj)
    const total = history.length
    if (total === 0) return { total: 0, streak: 0, rate: 0 }
    const TASK_KEYS = ['morning', 'noon', 'eveningJournal', 'eveningNce', 'eveningPhilosophy', 'eveningCoach', 'reading', 'review', 'exercise'] as const
    // 每日完成率 = 完成项数 / 总项数，取所有天的平均值
    const dailyRates = history.map((h) => {
      const done = TASK_KEYS.filter((k) => h[k]).length
      return done / TASK_KEYS.length
    })
    const avgRate = Math.round((dailyRates.reduce((s, r) => s + r, 0) / total) * 100)
    // 连续天数：从最近一天往回数，只要当天完成率 >= 50% 就算连续
    let streak = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (dailyRates[i] >= 0.5) streak++
      else break
    }
    return { total, streak, rate: avgRate }
  },

  setDailyTaskContent: (content) => {
    set({ dailyTaskContent: content })
    try { localStorage.setItem('wb_daily_task_content', JSON.stringify(content)) } catch {}
  },

  setDailyTaskNotes: (notes) => {
    const dailyTasks = { ...get().dailyTasks, notes }
    set({ dailyTasks })
    saveAllToStorage({ ...get(), dailyTasks })
  },

  addCard: (pageId) => {
    const pages = { ...get().pages }
    const cards = [...(pages[pageId] || [])]
    const id = 'card-' + Date.now()
    cards.push({ id, title: '新卡片', type: 'content', fields: { main: '在对话里告诉AI你想记录什么，AI帮你整理。' }, fixed: false })
    pages[pageId] = cards
    const activity = [...get().activity, { type: 'card', icon: '📋', text: `在「${PAGE_DEFS.find(p => p.id === pageId)?.title || pageId}」中新建了卡片`, time: new Date().toISOString() }]
    set({ pages, activity })
    saveToStorage({ pages, projects: get().projects, activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  deleteCard: (pageId, cardId) => {
    const pages = { ...get().pages }
    pages[pageId] = (pages[pageId] || []).filter((c) => c.id !== cardId)
    set({ pages })
    saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  duplicateCard: (pageId, cardId) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    const newCard = JSON.parse(JSON.stringify(card)) as Card
    newCard.id = 'card-' + Date.now()
    newCard.title = card.title + ' (副本)'
    newCard.fixed = false
    pages[pageId] = [...cards, newCard]
    const activity = [...get().activity, { type: 'card', icon: '📋', text: `复制了卡片「${card.title}」`, time: new Date().toISOString() }]
    set({ pages, activity })
    saveToStorage({ pages, projects: get().projects, activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  moveCard: (pageId, fromIdx, toIdx) => {
    const pages = { ...get().pages }
    const cards = [...(pages[pageId] || [])]
    const item = cards.splice(fromIdx, 1)[0]
    cards.splice(toIdx, 0, item)
    pages[pageId] = cards
    set({ pages })
    saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  updateCardField: (pageId, cardId, key, value) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card) {
      card.fields = { ...card.fields, [key]: value }
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  addCardEntry: (pageId, cardId) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card && card.listMode) {
      const entry: Record<string, string> = {}
      Object.keys(card.fields).forEach(k => { entry[k] = card.fields[k] || '' })
      card.entries = [...(card.entries || []), entry]
      Object.keys(card.fields).forEach(k => { card.fields[k] = '' })
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  deleteCardEntry: (pageId, cardId, entryIndex) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card && card.entries && entryIndex >= 0 && entryIndex < card.entries.length) {
      card.entries = card.entries.filter((_, i) => i !== entryIndex)
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  updateCardEntry: (pageId, cardId, entryIndex, data) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card && card.entries && entryIndex >= 0 && entryIndex < card.entries.length) {
      card.entries[entryIndex] = { ...card.entries[entryIndex], ...data }
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  appendCardEntries: (pageId, cardId, newEntries) => {
    if (!newEntries || newEntries.length === 0) return
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card) {
      card.entries = [...(card.entries || []), ...newEntries]
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  updateCardNotebooks: (pageId, cardId, notebooks) => {
    const pages = { ...get().pages }
    const cards = pages[pageId] || []
    const card = cards.find((c) => c.id === cardId)
    if (card) {
      card.notebooks = notebooks
      set({ pages })
      saveToStorage({ pages, projects: get().projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
    }
  },

  addProject: (project) => {
    const projects = [...get().projects, project]
    set({ projects })
    saveToStorage({ pages: get().pages, projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  updateProject: (id, data) => {
    const projects = get().projects.map((p) => p.id === id ? { ...p, ...data } : p)
    set({ projects })
    saveToStorage({ pages: get().pages, projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id)
    set({ projects })
    saveToStorage({ pages: get().pages, projects, activity: get().activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  logActivity: (a) => {
    const activity = [...get().activity, a]
    set({ activity })
    saveToStorage({ pages: get().pages, projects: get().projects, activity, pageTitles: get().pageTitles, pageOrder: get().pageOrder })
  },

  setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setContextMenu: (menu) => set({ contextMenu: menu }),

  exportData: () => {
    const { pages, projects, activity, pageTitles, pageOrder } = get()
    // 收集所有 AI 对话记录
    const chatHistory: Record<string, unknown> = {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('wb_chat_')) {
          const raw = localStorage.getItem(key)
          if (raw) chatHistory[key] = JSON.parse(raw)
        }
      }
    } catch { /* ignore */ }
    // 收集每日任务内容和历史
    let dailyTaskData: Record<string, unknown> = {}
    try {
      const raw = localStorage.getItem('wb_daily_tasks')
      if (raw) dailyTaskData['wb_daily_tasks'] = JSON.parse(raw)
      const raw2 = localStorage.getItem('wb_daily_task_content')
      if (raw2) dailyTaskData['wb_daily_task_content'] = JSON.parse(raw2)
    } catch { /* ignore */ }
    return JSON.stringify({ pages, projects, activity, pageTitles, pageOrder, chatHistory, dailyTaskData, version: 30 }, null, 2)
  },

  importData: (json) => {
    try {
      const data = JSON.parse(json)
      if (!data.pages) return false
      set({ pages: data.pages, projects: data.projects || [], activity: data.activity || [], pageTitles: data.pageTitles || {}, pageOrder: data.pageOrder || {} })
      saveToStorage({ pages: data.pages, projects: data.projects || [], activity: data.activity || [], pageTitles: data.pageTitles || {}, pageOrder: data.pageOrder || {} })
      // 导入时确保关键卡片存在（纠错 & 金句感悟），并立即重新保存让界面更新
      try {
        const engCards: Card[] = data.pages['life-english'] || []
        if (!engCards.find((c: Card) => c.id === 'eng-corrections')) {
          const defaults = getDefaultCards('life-english')
          const correctionsCard = defaults.find((c: Card) => c.id === 'eng-corrections')
          if (correctionsCard) data.pages['life-english'] = [...engCards, correctionsCard]
        }
        const inspCards: Card[] = data.pages['inspire'] || []
        if (!inspCards.find((c: Card) => c.id === 'inspire-quotes')) {
          const defaults = getDefaultCards('inspire')
          const quotesCard = defaults.find((c: Card) => c.id === 'inspire-quotes')
          if (quotesCard) data.pages['inspire'] = [...inspCards, quotesCard]
        }
        set({ pages: data.pages })
        saveToStorage({ pages: data.pages, projects: data.projects || [], activity: data.activity || [], pageTitles: data.pageTitles || {}, pageOrder: data.pageOrder || {} })
      } catch { /* ignore */ }
      // 恢复 AI 对话记录
      if (data.chatHistory) {
        try {
          Object.entries(data.chatHistory).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })
        } catch { /* ignore */ }
      }
      // 恢复每日任务数据
      if (data.dailyTaskData) {
        try {
          Object.entries(data.dailyTaskData).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })
          // 重新加载到 store
          const raw = localStorage.getItem('wb_daily_tasks')
          if (raw) {
            const td = JSON.parse(raw)
            set({
              dailyTasks: td.tasks || get().dailyTasks,
              dailyTaskHistory: td.history || [],
            })
          }
          const raw2 = localStorage.getItem('wb_daily_task_content')
          if (raw2) {
            set({ dailyTaskContent: { ...get().dailyTaskContent, ...JSON.parse(raw2) } })
          }
        } catch { /* ignore */ }
      }
      // 导入时同步更新 plan-year 到最新模板
      try {
        const planCards = data.pages['life-plan'] || []
        const yearCard = planCards.find((c: Card) => c.id === 'plan-year')
        if (yearCard) {
          const defaults = getDefaultCards('life-plan')
          const defaultYear = defaults.find((c: Card) => c.id === 'plan-year')
          if (defaultYear?.fields) {
            yearCard.title = '📅 年度总目标'
            yearCard.fields.overview = defaultYear.fields.overview
            yearCard.fields.english = defaultYear.fields.english
            yearCard.fields.reading = defaultYear.fields.reading
            yearCard.fields.career = defaultYear.fields.career
            yearCard.fields.other = defaultYear.fields.other
            const removeFields = ['q1', 'q2', 'q3', 'q4', 'm1', 'm2', 'm3', 'm4']
            removeFields.forEach(f => { delete yearCard.fields[f] })
          }
        }
      } catch { /* ignore */ }
      // 同步每日任务内容
      try {
        localStorage.setItem('wb_daily_task_content', JSON.stringify(DEFAULT_TASK_CONTENT))
        set({ dailyTaskContent: DEFAULT_TASK_CONTENT })
      } catch { /* ignore */ }
      // 保存含纠错卡片的最新页面，确保界面立即反映导入结果
      try {
        set({ pages: data.pages })
        saveToStorage({ pages: data.pages, projects: data.projects || [], activity: data.activity || [], pageTitles: data.pageTitles || {}, pageOrder: data.pageOrder || {} })
      } catch { /* ignore */ }
      return true
    } catch {
      return false
    }
  },

  // 跨设备合并导入：云端与本地做并集（卡片按 id 合并、条目去重合并），避免拉取时覆盖本地已有内容
  mergeFromCloud: (json: string) => {
    try {
      const data = JSON.parse(json)
      if (!data.pages) return false
      const cur = get()
      // ---- pages: 并集卡片，条目去重合并 ----
      const mergedPages: Record<string, Card[]> = { ...cur.pages }
      for (const [pid, cloudCards] of Object.entries(data.pages as Record<string, Card[]>)) {
        const localCards = mergedPages[pid] || []
        const byId = new Map(localCards.map((c) => [c.id, c]))
        const out = [...localCards]
        for (const cc of cloudCards as Card[]) {
          const ex = byId.get(cc.id)
          if (!ex) {
            out.push(cc)
          } else {
            const seen = new Set((ex.entries || []).map((e) => JSON.stringify(e)))
            const entries = [...(ex.entries || [])]
            for (const e of (cc.entries || [])) {
              const k = JSON.stringify(e)
              if (!seen.has(k)) { seen.add(k); entries.push(e) }
            }
            const idx = out.findIndex((c) => c.id === cc.id)
            if (idx >= 0) out[idx] = { ...ex, entries }
          }
        }
        mergedPages[pid] = out
      }
      // ---- chatHistory: 按 key 并集，消息多的一方优先 ----
      const mergedChat: Record<string, unknown> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('wb_chat_')) {
          try { mergedChat[k] = JSON.parse(localStorage.getItem(k) || '[]') } catch { /* ignore */ }
        }
      }
      for (const [k, v] of Object.entries(data.chatHistory || {})) {
        const lv = mergedChat[k]
        const llen = Array.isArray(lv) ? lv.length : 0
        const clen = Array.isArray(v) ? (v as unknown[]).length : 0
        if (!lv || clen > llen) mergedChat[k] = v
      }
      for (const [k, v] of Object.entries(mergedChat)) {
        try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ }
      }
      // ---- projects / activity: 并集 ----
      const mergedProjects = unionById(cur.projects, data.projects || [])
      const mergedActivity = unionByTime(cur.activity, data.activity || [])
      const pageTitles = Object.keys(data.pageTitles || {}).length ? data.pageTitles : cur.pageTitles
      const pageOrder = Object.keys(data.pageOrder || {}).length ? data.pageOrder : cur.pageOrder
      set({ pages: mergedPages, projects: mergedProjects, activity: mergedActivity, pageTitles, pageOrder })
      saveToStorage({ pages: mergedPages, projects: mergedProjects, activity: mergedActivity, pageTitles, pageOrder })
      // 每日任务：仅当本地缺失时补充
      if (data.dailyTaskData) {
        try {
          for (const [k, v] of Object.entries(data.dailyTaskData)) {
            if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v))
          }
        } catch { /* ignore */ }
      }
      return true
    } catch {
      return false
    }
  },

  resetData: () => {
    localStorage.removeItem(STORAGE_KEY)
    const pages: Record<string, Card[]> = {}
    PAGE_DEFS.forEach((p) => {
      if (!p.isDashboard) {
        pages[p.id] = getDefaultCards(p.id)
      }
    })
    const activity = [{ type: 'init', icon: '🤖', text: '数据已重置。在对话里告诉我你的项目，我来帮你整理。', time: new Date().toISOString() }]
    set({ pages, projects: [], activity, pageTitles: {}, pageOrder: {} })
    saveToStorage({ pages, projects: [], activity, pageTitles: {}, pageOrder: {} })
  },

  // 跨设备同步：导出核心数据到剪贴板（不含 AI 对话记录，保证体积小）
  copyToClipboard: () => {
    const { pages, projects, activity, pageTitles, pageOrder, dailyTasks, dailyTaskHistory, dailyTaskContent } = get()
    const payload = JSON.stringify({
      pages, projects, activity: activity.slice(-50), pageTitles, pageOrder,
      _dailyTasks: dailyTasks, _dailyTaskHistory: dailyTaskHistory.slice(-14),
      _dailyTaskContent: dailyTaskContent,
    })
    navigator.clipboard.writeText(payload).catch(() => {})
    return payload.length
  },

  // 跨设备同步：从剪贴板导入
  pasteFromClipboard: () => {
    return navigator.clipboard.readText().then(text => {
      const data = JSON.parse(text)
      if (!data.pages) throw new Error('无效数据')
      get().importData(text)
      // 恢复每日任务
      if (data._dailyTasks) {
        localStorage.setItem('wb_daily_tasks', JSON.stringify({ tasks: data._dailyTasks, history: data._dailyTaskHistory || [] }))
        set({ dailyTasks: data._dailyTasks, dailyTaskHistory: data._dailyTaskHistory || [] })
      }
      if (data._dailyTaskContent) {
        localStorage.setItem('wb_daily_task_content', JSON.stringify(data._dailyTaskContent))
        set({ dailyTaskContent: data._dailyTaskContent })
      }
      return true
    }).catch(() => false)
  },
}))
