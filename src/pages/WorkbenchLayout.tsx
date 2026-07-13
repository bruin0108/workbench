import { useEffect, useRef, useCallback } from 'react'
import { useWorkbenchStore } from '@/store/workbenchStore'
import Sidebar from '@/components/workbench/Sidebar'
import PageView from './Workbench'
import { startReminderLoop, stopReminderLoop, getReminderSettings } from '@/utils/reminder'
import { scheduleAutoSync } from '@/utils/autoSync'
import { useUndoRedo } from '@/components/workbench/useUndoRedo'

export default function WorkbenchLayout() {
  const { currentPage, init, initialized, getTodayTasks } = useWorkbenchStore()
  const initCalled = useRef(false)
  const getTasksRef = useRef(getTodayTasks)
  getTasksRef.current = getTodayTasks
  const { pushSnapshot } = useUndoRedo()

  // 监听所有卡片/字段/项目变更，推入撤销栈
  const pages = useWorkbenchStore(s => s.pages)
  const projects = useWorkbenchStore(s => s.projects)
  const pageTitles = useWorkbenchStore(s => s.pageTitles)
  const pageOrder = useWorkbenchStore(s => s.pageOrder)
  const pushRef = useRef(pushSnapshot)
  pushRef.current = pushSnapshot
  useEffect(() => { pushRef.current() }, [pages, projects, pageTitles, pageOrder])

  useEffect(() => {
    if (!initCalled.current && !initialized) {
      initCalled.current = true
      init()
    }
  }, [init, initialized])

  // 启动每日任务提醒
  useEffect(() => {
    const settings = getReminderSettings()
    if (settings.enabled && settings.permission === 'granted') {
      startReminderLoop(() => getTasksRef.current())
    }
    return () => stopReminderLoop()
  }, [initialized])

  // 订阅 card-only 变更触发自动同步（减少订阅频率）
  const scheduleRef = useRef(scheduleAutoSync)
  scheduleRef.current = scheduleAutoSync
  useEffect(() => {
    const unsub = useWorkbenchStore.subscribe(
      (state) => state.pages,
      () => scheduleRef.current()
    )
    return () => unsub()
  }, [])

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <Sidebar />
      <main className="ml-[260px] flex-1 px-10 pb-16 pt-6 max-w-[1000px] w-full">
        <div className="animate-page-in" key={currentPage}>
          <PageView key={currentPage} />
        </div>
      </main>
    </div>
  )
}