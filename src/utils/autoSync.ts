const STORAGE_KEY = 'wb_sync_handle'

let fileHandle: FileSystemFileHandle | null = null

export async function hasSyncHandle(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const { name } = JSON.parse(raw)
      // 检查句柄是否还存在（Chrome 可能回收权限）
      return !!name
    }
  } catch {}
  return false
}

export async function pickSyncFile(): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) {
    alert('你的浏览器不支持此功能，请使用 Chrome 或 Edge')
    return false
  }
  try {
    fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'workbench-data.json',
      types: [{
        description: 'JSON',
        accept: { 'application/json': ['.json'] },
      }],
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'workbench-data.json' }))
    return true
  } catch {
    return false
  }
}

export async function autoSyncData(): Promise<boolean> {
  if (!fileHandle) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
    } catch {
      return false
    }
    // 句柄丢失，需要重新选择
    return false
  }
  try {
    const raw = localStorage.getItem('wb_react_v1')
    if (!raw) return false
    const data = JSON.parse(raw)
    const json = JSON.stringify({ ...data, version: 29 }, null, 2)
    const writable = await fileHandle.createWritable()
    await writable.write(json)
    await writable.close()
    return true
  } catch {
    // 权限过期，清除句柄
    fileHandle = null
    localStorage.removeItem(STORAGE_KEY)
    return false
  }
}

let _syncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleAutoSync() {
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => {
    autoSyncData()
  }, 3000)
}

export function stopAutoSync() {
  if (_syncTimer) {
    clearTimeout(_syncTimer)
    _syncTimer = null
  }
}
