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

// 本地数据变更后，延迟上传到 Gist（合并频繁改动，避免请求风暴）
export function scheduleAutoPush() {
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

// 页面打开时拉取云端：时间戳优先 —— 云端较新则覆盖本地，否则保留本地
export async function autoPullOnLoad() {
  if (!hasGistConfig()) return
  const t = getGistToken()
  const gid = getGistId()
  if (!t || !gid) return
  // 确保 store 已初始化（幂等）
  try { if (!useWorkbenchStore.getState().initialized) useWorkbenchStore.getState().init() } catch { /* ignore */ }
  try {
    const { content, syncedAt } = await pullFromGist(t, gid)
    const local = getLocalModified()
    if (syncedAt > local) {
      // 合并导入（云端 ∪ 本地），避免覆盖本地已有内容
      const ok = useWorkbenchStore.getState().mergeFromCloud(content)
      if (ok) {
        setLocalModified(syncedAt)
        // 合并后可能补齐了本地缺失的内容，立即把完整数据推回云端，保证其他设备也能拿到
        try {
          const json = useWorkbenchStore.getState().exportData()
          await pushToGist(t, json, gid)
          setLocalModified(Date.now())
        } catch { /* 推送失败静默忽略，下次变更重试 */ }
        // 重新加载，让依赖 localStorage 的 AI 对话等组件刷新
        setTimeout(() => window.location.reload(), 900)
      }
    }
    // 若 syncedAt <= local：本地较新或相同，不覆盖（稍后自动上传会更新云端）
  } catch {
    // 云端无数据 / 网络错误，静默忽略
  } finally {
    pulledOnce = true // 首次拉取尝试结束（成功与否），允许后续本地改动推送
  }
}
