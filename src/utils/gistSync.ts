// GitHub Gist 云端同步工具
// 数据格式复用工作台的 exportData / importData（含 pages/projects/chatHistory 等）
// token 与 gistId 存于 localStorage；token 建议使用仅勾选 gist 权限的 Personal Access Token

const TOKEN_KEY = 'wb_gist_token'
const GIST_KEY = 'wb_gist_id'
const LAST_KEY = 'wb_gist_last'
const FILENAME = 'workbench-data.json'

export function getGistToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function saveGistToken(t: string) {
  try { localStorage.setItem(TOKEN_KEY, t.trim()) } catch { /* ignore */ }
}
export function getGistId(): string | null {
  try { return localStorage.getItem(GIST_KEY) } catch { return null }
}
export function saveGistId(id: string) {
  try { localStorage.setItem(GIST_KEY, id) } catch { /* ignore */ }
}
export function clearGistConfig() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(GIST_KEY)
    localStorage.removeItem(LAST_KEY)
  } catch { /* ignore */ }
}
export function hasGistConfig(): boolean {
  return !!getGistToken() && !!getGistId()
}
export function getLastSync(): string | null {
  try { return localStorage.getItem(LAST_KEY) } catch { return null }
}
function setLastSync() {
  try { localStorage.setItem(LAST_KEY, new Date().toLocaleString('zh-CN')) } catch { /* ignore */ }
}

async function ghFetch(url: string, options: RequestInit, token: string): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    let msg = `GitHub API ${res.status}`
    try {
      const e = await res.json()
      if (e && e.message) msg = e.message
    } catch { /* ignore */ }
    if (res.status === 401) msg = 'Token 无效或权限不足（请使用勾选了 gist 权限的 token）'
    if (res.status === 403) msg = '请求被拒绝（可能触发了 GitHub 频率限制，稍后再试）'
    throw new Error(msg)
  }
  return res.json()
}

// 推送：有 gistId 则更新，否则新建。返回最终的 gistId
export async function pushToGist(token: string, json: string, gistId?: string | null): Promise<string> {
  const body = JSON.stringify({
    files: { [FILENAME]: { content: json } },
    description: 'WorkBuddy 工作台云端同步',
  })
  if (gistId) {
    await ghFetch(`https://api.github.com/gists/${gistId}`, { method: 'PATCH', body }, token)
    setLastSync()
    return gistId
  }
  const data = await ghFetch('https://api.github.com/gists', { method: 'POST', body }, token)
  const id = data && data.id
  if (!id) throw new Error('未获取到 Gist ID')
  saveGistId(id)
  setLastSync()
  return id
}

// 拉取：返回工作台 JSON 文本（含 chatHistory）
export async function pullFromGist(token: string, gistId: string): Promise<string> {
  const data = await ghFetch(`https://api.github.com/gists/${gistId}`, { method: 'GET' }, token)
  const files = (data && data.files) || {}
  const file = files[FILENAME]
  if (!file || !file.content) throw new Error('云端没有找到同步文件')
  setLastSync()
  return file.content as string
}
