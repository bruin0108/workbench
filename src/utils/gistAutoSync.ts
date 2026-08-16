// 自动云端同步（GitHub Gist）
// - 本地数据变更后，防抖上传到 Gist
// - 页面打开时，按「时间戳优先」拉取云端：云端较新则覆盖本地，否则保留本地
// 依赖：用户已在「☁️ 云端同步」中填好 Token + Gist ID（hasGistConfig 为 true）
import { useWorkbenchStore } from '@/store/workbenchStore'
import {
  hasGistConfig, getGistToken, getGistId,
  pushToGist, pullFromGist, getLocalModified, setLocalModified,
} from '@/utils/gistSync'

let pulledOnce = false // 首次成功拉取云端前，禁止推送（防止空数据覆盖云端）
let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushing = false
let suppressNextPush = false // 拉取时临时禁止自动回推

// 本地数据变更后，延迟上传到 Gist（合并频繁改动，避免请求风暴）
export function scheduleAutoPush() {
  if (suppressNextPush) { suppressNextPush = false; return }
  if (!pulledOnce) return // 首次成功拉取前不推送，避免空数据覆盖云端
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    pushTimer = null
    if (pushing) return
    if (!hasGistConfig()) return
    const t = getGistToken()
    const gid = getGistId()
    if (!t || !gid) return
    pushing = true
    try {
      const json = useWorkbenchStore.getState().exportData()
      await pushToGist(t, json, gid)
      setLocalModified(Date.now())
    } catch {
      // 自动上传失败静默忽略（网络/限流等），下次变更会重试
    } finally {
      pushing = false
    }
  }, 1500)
}

// AI 注入通道：从 Gist 独立文件 inject-cards.json 自动导入卡片。
// 关键设计：autoPush 只写 workbench-data.json，永远不会碰 inject-cards.json，
// 所以 AI 推的卡片不可能被自动上传冲掉（彻底消除"抢跑"赛跑问题）。
// 文件格式：{ updatedAt: number, cards: [{ page, replace: string[], card: {...} }] }
const INJECT_FILE = 'inject-cards.json'
const INJECT_MARK = 'wb_inject_imported_at' // 已导入版本号，防止重复导入覆盖用户后续编辑
const STORAGE_KEY = 'wb_react_v1'

async function autoImportInjectCards(token: string, gid: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.github.com/gists/${gid}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!r.ok) return false
    const j = await r.json()
    const f = j.files?.[INJECT_FILE]
    if (!f) return false
    let c: string = f.content
    if (f.truncated) c = await (await fetch(f.raw_url)).text()
    const p = JSON.parse(c)
    const mark = Number(localStorage.getItem(INJECT_MARK) || 0)
    if (!(Number(p.updatedAt) > mark)) return false // 这批卡片已导入过
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const d = JSON.parse(raw)
    if (!d || !d.pages) return false
    let n = 0
    for (const it of p.cards || []) {
      if (!it || !it.page || !it.card || !it.card.id) continue
      const page = it.page
      if (!d.pages[page]) d.pages[page] = []
      // 先移除被新卡覆盖的旧 id（replace 列表），避免旧卡残留
      const rm = new Set<string>(it.replace || [])
      let arr = d.pages[page].filter((x: { id: string }) => !rm.has(x.id))
      const idx = arr.findIndex((x: { id: string }) => x.id === it.card.id)
      if (idx >= 0) {
        // 已存在 → 原地替换，保持原有位置（不再挪到末尾，避免打乱页面顺序）
        arr[idx] = it.card
      } else {
        // 全新卡 → 追加到末尾
        arr.push(it.card)
      }
      d.pages[page] = arr
      n++
    }
    // 清理列表：删除用户确认可删的卡片（如被新卡合并覆盖的旧空模板卡）
    for (const rm of (p.remove || []) as { page?: string; id?: string }[]) {
      if (!rm || !rm.page || !rm.id) continue
      const arr = d.pages[rm.page] || []
      const after = arr.filter((x: { id: string }) => x.id !== rm.id)
      if (after.length !== arr.length) { d.pages[rm.page] = after; n++ }
    }
    if (n === 0) return false
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    localStorage.setItem(INJECT_MARK, String(p.updatedAt))
    return true
  } catch {
    return false
  }
}

// 页面打开时拉取云端：时间戳优先 —— 云端较新则合并进本地，否则保留本地；
// 之后无论如何都检查一次 AI 注入通道（不受时间戳限制）。
export async function autoPullOnLoad() {
  if (!hasGistConfig()) return
  const t = getGistToken()
  const gid = getGistId()
  if (!t || !gid) return
  // 确保 store 已初始化（幂等）
  try { if (!useWorkbenchStore.getState().initialized) useWorkbenchStore.getState().init() } catch { /* ignore */ }
  let changed = false
  try {
    const { content, syncedAt } = await pullFromGist(t, gid)
    const local = getLocalModified()
    // 本地主数据被清空（用户手动 removeItem 或首次打开）时，整卡替换云端数据，
    // 避免与内置种子默认卡做并集导致重复条目；否则按时间戳并集合并，保留本地编辑
    const noLocal = !localStorage.getItem(STORAGE_KEY)
    if (syncedAt > local || noLocal) {
      const ok = noLocal
        ? useWorkbenchStore.getState().importData(content)
        : useWorkbenchStore.getState().mergeFromCloud(content)
      if (ok) {
        setLocalModified(syncedAt)
        changed = true
      }
    }
    // 若 syncedAt <= local：本地较新或相同，不覆盖（稍后自动上传会更新云端）
  } catch {
    // 云端无数据 / 网络错误，静默忽略
  }
  // AI 注入通道：必须放在 mergeFromCloud 之后（merge 会重写 localStorage，先注入会被冲掉）
  try {
    if (await autoImportInjectCards(t, gid)) changed = true
  } catch { /* ignore */ }
  pulledOnce = true // 首次拉取尝试结束（成功与否），允许后续本地改动推送
  if (changed) {
    // 重新加载，让 store 和依赖 localStorage 的 AI 对话等组件刷新
    setTimeout(() => window.location.reload(), 900)
  }
}

// 手动拉取前调用，禁止本次自动回推
export function skipAutoPushOnce() {
  suppressNextPush = true
}
