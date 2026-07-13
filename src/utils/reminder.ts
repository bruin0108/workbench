const STORAGE_KEY = 'wb_reminder'
const NOTIFY_DELAY_MS = 30 * 60 * 1000 // 30 minutes

interface ReminderSettings {
  enabled: boolean
  permission: NotificationPermission
}

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { enabled: false, permission: 'default' }
}

export function saveReminderSettings(settings: ReminderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const result = await Notification.requestPermission()
  const settings = getReminderSettings()
  settings.permission = result
  saveReminderSettings(settings)
  return result === 'granted'
}

export function checkAndNotify(tasks: {
  morning: boolean; noon: boolean; eveningJournal: boolean;
  eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean;
  reading: boolean; review: boolean; exercise: boolean;
}) {
  if (!('Notification' in window)) return
  const settings = getReminderSettings()
  if (!settings.enabled || settings.permission !== 'granted') return

  const now = new Date()
  const hour = now.getHours()
  const pending: string[] = []

  if (hour >= 9 && hour < 11 && !tasks.morning) {
    pending.push('\u65e9\u4e0a\u7684\u82f1\u8bed\u5b66\u4e60\u8fd8\u6ca1\u5b8c\u6210')
  }
  if (hour >= 12 && hour < 14 && !tasks.noon) {
    pending.push('\u4e2d\u5348\u7684 Anki \u95ea\u5361\u8fd8\u6ca1\u5237')
  }
  if (hour >= 20 && hour < 22) {
    if (!tasks.eveningJournal) pending.push('\u5916\u520a\u7cbe\u8bfb\u8fd8\u6ca1\u5f00\u59cb')
    if (!tasks.eveningNce) pending.push('\u65b0\u6982\u5ff5\u82f1\u8bed\u8fd8\u6ca1\u80cc')
    if (!tasks.eveningPhilosophy) pending.push('\u54f2\u5b66\u7b80\u53f2\u8fd8\u6ca1\u542c')
    if (!tasks.eveningCoach) pending.push('AI \u82f1\u8bed\u6559\u7ec3\u8fd8\u6ca1\u7ec3')
  }
  if (hour >= 21 && !tasks.review) {
    pending.push('\u4eca\u5929\u8fd8\u6ca1\u590d\u76d8')
  }

  if (pending.length > 0) {
    new Notification('\u{1F4CB} \u4ECA\u65E5\u4EFB\u52A1\u63D0\u9192', {
      body: pending.slice(0, 3).join('\u3001'),
      tag: 'wb-reminder-' + now.toDateString(),
      requireInteraction: false,
    })
  }
}

let _timer: ReturnType<typeof setInterval> | null = null

export function startReminderLoop(getTasks: () => {
  morning: boolean; noon: boolean; eveningJournal: boolean;
  eveningNce: boolean; eveningPhilosophy: boolean; eveningCoach: boolean;
  reading: boolean; review: boolean; exercise: boolean;
}) {
  stopReminderLoop()
  checkAndNotify(getTasks())
  _timer = setInterval(() => checkAndNotify(getTasks()), NOTIFY_DELAY_MS)
}

export function stopReminderLoop() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
}
