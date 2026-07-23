import { useState } from 'react'
import { Cloud, X, Upload, Download, RefreshCw, Key, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { useToast } from './Toast'
import { useWorkbenchStore } from '@/store/workbenchStore'
import {
  getGistToken, saveGistToken, getGistId, saveGistId, clearGistConfig,
  hasGistConfig, getLastSync, pushToGist, pullFromGist,
} from '@/utils/gistSync'
import { skipAutoPushOnce } from '@/utils/gistAutoSync'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CloudSyncModal({ open, onClose }: Props) {
  const { toast } = useToast()
  const [connected, setConnected] = useState(() => hasGistConfig())
  const [token, setToken] = useState('')
  const [useExisting, setUseExisting] = useState(false)
  const [gistId, setGistId] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pullBusy, setPullBusy] = useState(false)
  const [connectBusy, setConnectBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const busy = pushBusy || pullBusy || connectBusy
  const fail = (msg: string) => { setError(msg); setConnectBusy(false); setPushBusy(false); setPullBusy(false) }

  const handleConnect = async () => {
    const t = token.trim()
    if (!t) return fail('请输入 GitHub Token')
    setConnectBusy(true); setError('')
    try {
      if (useExisting) {
        const gid = gistId.trim()
        if (!gid) throw new Error('请输入已有 Gist ID')
        await pullFromGist(t, gid)
        saveGistToken(t); saveGistId(gid)
        toast('已连接云端')
      } else {
        const json = useWorkbenchStore.getState().exportData()
        const gid = await pushToGist(t, json, null)
        saveGistToken(t); saveGistId(gid)
        toast('已创建云端备份并上传当前数据')
      }
      setConnected(true)
      setConnectBusy(false)
    } catch (e: any) {
      setError(e?.message || '连接失败'); setConnectBusy(false)
    }
  }

  const handlePush = async () => {
    const t = getGistToken(); const gid = getGistId()
    if (!t || !gid) return fail('尚未连接云端')
    setPushBusy(true); setError('')
    try {
      const json = useWorkbenchStore.getState().exportData()
      await pushToGist(t, json, gid)
      toast('已上传到云端 ☁️')
      setPushBusy(false)
    } catch (e: any) {
      setError(e?.message || '上传失败'); setPushBusy(false)
    }
  }

  const handlePull = async () => {
    const t = getGistToken(); const gid = getGistId()
    if (!t || !gid) return fail('尚未连接云端')
    setPullBusy(true); setError('')
    try {
      const { content } = await pullFromGist(t, gid)
      // 合并导入：云端 ∪ 本地，避免覆盖本地已有内容
      skipAutoPushOnce() // 拉取就是拉取，禁止自动回推
      const ok = useWorkbenchStore.getState().mergeFromCloud(content)
      if (!ok) throw new Error('导入失败：数据格式不正确')
      toast('已与云端合并，正在刷新…')
      setTimeout(() => window.location.reload(), 800)
    } catch (e: any) {
      setError(e?.message || '拉取失败'); setPullBusy(false)
    }
  }

  const handleReset = () => {
    clearGistConfig()
    setConnected(false)
    setToken(''); setGistId(''); setUseExisting(false); setError('')
  }

  const lastSync = getLastSync()
  const currentGid = getGistId()

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[700] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[701] flex items-center justify-center pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cloud size={18} className="text-accent" />
              <h3 className="text-[15px] font-bold text-ink">云端同步（GitHub Gist）</h3>
            </div>
            <button onClick={onClose} className="text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!connected ? (
            <div>
              <div className="mb-3">
                <label className="block text-[12px] font-semibold text-muted mb-1.5">
                  GitHub Token（仅需 gist 权限）
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxx 或 github_pat_xxx"
                    className="w-full text-[13px] px-3 py-2 pr-10 border border-rule-bg rounded-md outline-none focus:border-accent bg-white transition-colors"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-accent underline mt-1.5"
                >
                  新建 Token（勾选 gist 权限） <ExternalLink size={11} />
                </a>
              </div>

              <div className="mb-4">
                <div className="flex gap-4 text-[12px] text-muted mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={!useExisting} onChange={() => setUseExisting(false)} />
                    新建私密 Gist（推荐）
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={useExisting} onChange={() => setUseExisting(true)} />
                    使用已有 Gist
                  </label>
                </div>
                {useExisting && (
                  <input
                    type="text"
                    value={gistId}
                    onChange={(e) => setGistId(e.target.value)}
                    placeholder="Gist ID（URL 末尾那段）"
                    className="w-full text-[13px] px-3 py-2 border border-rule-bg rounded-md outline-none focus:border-accent bg-white"
                  />
                )}
              </div>

              <button
                onClick={handleConnect}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white text-[13px] font-semibold py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <Key size={15} />}
                {useExisting ? '连接并验证' : '连接并上传当前数据'}
              </button>
              <p className="text-[11px] text-muted mt-3 leading-relaxed">
                Token 仅保存在本浏览器 localStorage，用于读写你的私有 Gist。建议使用<strong>仅勾选 gist 权限</strong>的 Token，不要授予仓库权限。
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-2 text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                <div>
                  <div>已连接云端</div>
                  {currentGid && (
                    <div className="text-[11px] text-muted break-all mt-0.5">Gist: {currentGid}</div>
                  )}
                  {lastSync && <div className="text-[11px] text-muted mt-0.5">上次同步：{lastSync}</div>}
                </div>
              </div>

              <button
                onClick={handlePush}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white text-[13px] font-semibold py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-all mb-2.5"
              >
                {pushBusy ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
                上传当前数据到云端
              </button>
              <button
                onClick={handlePull}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-white text-accent border border-accent text-[13px] font-semibold py-2.5 rounded-md hover:bg-accent/5 disabled:opacity-50 transition-all mb-3"
              >
                {pullBusy ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                从云端拉取最新
              </button>

              <button
                onClick={handleReset}
                className="w-full text-[12px] text-muted underline hover:text-ink"
              >
                断开连接 / 重新设置 Token
              </button>

              <p className="text-[11px] text-muted mt-3 leading-relaxed">
                换电脑时：在新电脑打开工作台 → 点「☁️ 同步」→ 填<strong>同一个 Token</strong> 和<strong>同一个 Gist ID</strong> → 点「从云端拉取最新」即可。数据含 AI 对话记录。
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
