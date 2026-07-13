import { useState } from 'react'
import { Key, Eye, EyeOff, ChevronDown } from 'lucide-react'

const STORAGE_KEY = 'wb_ai_key'

interface Provider {
  id: string
  name: string
  url: string
  model: string
  desc: string
  link: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'openrouter', name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.0-flash-001',
    desc: '聚合平台，有免费模型，国内可直连', link: 'https://openrouter.ai/keys',
  },
  {
    id: 'groq', name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant',
    desc: '速度极快，免费额度慷慨', link: 'https://console.groq.com/keys',
  },
  {
    id: 'deepseek', name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat',
    desc: '国产大模型，中文能力强，价格极低', link: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'siliconflow', name: 'SiliconFlow (硅基流动)',
    url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct',
    desc: '国产模型聚合，有免费额度', link: 'https://siliconflow.cn/',
  },
  {
    id: 'custom', name: '自定义',
    url: '', model: '',
    desc: '任意兼容 OpenAI 格式的 API', link: '',
  },
]

export function getGlobalApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function isKeyConfigured(): boolean {
  return !!getGlobalApiKey()
}

export default function ApiKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [key, setKey] = useState(() => getGlobalApiKey())
  const [showKey, setShowKey] = useState(false)
  const [provider, setProvider] = useState(() => localStorage.getItem('wb_ai_provider') || 'openrouter')
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('wb_ai_custom_url') || '')
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('wb_ai_custom_model') || '')
  const [showProviderMenu, setShowProviderMenu] = useState(false)

  const currentProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  const handleSelectProvider = (p: Provider) => {
    setProvider(p.id)
    setShowProviderMenu(false)
  }

  const handleSave = () => {
    const trimmed = key.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    localStorage.setItem('wb_ai_provider', provider)
    if (provider === 'custom') {
      localStorage.setItem('wb_ai_custom_url', customUrl.trim())
      localStorage.setItem('wb_ai_custom_model', customModel.trim())
    }
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[700] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[701] flex items-center justify-center pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-bold text-ink mb-4 flex items-center gap-1.5">
            <Key size={18} className="text-accent" />
            AI API 配置
          </h2>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-muted mb-1.5">服务商</label>
            <div className="relative">
              <button
                onClick={() => setShowProviderMenu(!showProviderMenu)}
                className="flex items-center justify-between w-full text-[13px] px-3 py-2 rounded-md border border-rule-bg bg-white hover:border-accent transition-colors"
              >
                <span>{currentProvider.name}</span>
                <ChevronDown size={14} className="text-muted" />
              </button>
              {showProviderMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule-bg rounded-lg shadow-lg z-50 py-1">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProvider(p)}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-accent/5 transition-colors ${
                        provider === p.id ? 'text-accent font-semibold' : 'text-ink'
                      }`}
                    >
                      <div>{p.name}</div>
                      <div className="text-[10px] text-muted">{p.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {currentProvider.link && (
              <a href={currentProvider.link} target="_blank" className="inline-block text-[11px] text-accent underline mt-1">
                获取 Key →
              </a>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-semibold text-muted mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={`${currentProvider.name} API Key...`}
                className="w-full text-[13px] px-3 py-2 pr-10 border border-rule-bg rounded-md outline-none focus:border-accent bg-white transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {provider === 'custom' && (
            <>
              <div className="mb-3">
                <label className="block text-[12px] font-semibold text-muted mb-1.5">API 地址</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://api.xxx.com/v1/chat/completions"
                  className="w-full text-[13px] px-3 py-2 border border-rule-bg rounded-md outline-none focus:border-accent bg-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-muted mb-1.5">模型名</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full text-[13px] px-3 py-2 border border-rule-bg rounded-md outline-none focus:border-accent bg-white"
                />
              </div>
            </>
          )}

          <p className="text-[11px] text-muted mb-4 leading-relaxed">
            当前模型：{provider === 'custom' ? (customModel || '未设置') : currentProvider.model}
          </p>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-muted border border-rule-bg rounded-md hover:bg-rule-bg/30 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-[13px] font-medium text-white bg-accent rounded-md hover:opacity-90 transition-opacity"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
