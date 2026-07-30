import { freeChat } from './freeAI'

function buildNotifyPrompt(inputs: Record<string, string>): string {
  const projectName = inputs.projectName || '未指定项目'
  const category = inputs.category || 'company-exec'
  const phase = inputs.phase || 'before'
  const template = inputs.template || ''
  const audience = inputs.audience || '全体学员'
  const extra = inputs.extra || ''

  const categoryNames: Record<string, string> = {
    'company-exec': '公司级干部培训',
    'dept-exec': '部门级干部培训',
    empowerment: '赋能培训',
    staff: '员工培训',
  }

  const phaseNames: Record<string, string> = {
    before: '培训前',
    during: '培训中',
    after: '培训后',
  }

  let templateSection = ''
  if (template && template.length > 20) {
    templateSection = `
【参考模板风格】
以下是用户以往同类培训、同阶段的通知真实文案，请严格模仿其语气、结构、emoji 使用习惯：
---
${template}
---

请按照上述模板的风格和语气来生成新的通知，保持结构一致。`
  }

  return `你是企业培训社群运营助手（小熊风格：亲切温暖、活泼可爱）。请根据以下信息生成一段社群通知文案。

- 培训类型：${categoryNames[category] || '通用培训'}
- 时间场景：${phaseNames[phase] || '培训前'}
- 项目名称：${projectName}
- 学员画像：${audience}
- 特殊要求：${extra || '无'}
${templateSection}

格式要求：
1. 温暖问候 + emoji 开头
2. 核心信息分点列出
3. 明确行动指引
4. 结尾鼓励 + emoji

200-400 字，输出纯文案不解释。`
}

async function generateViaFree(prompt: string): Promise<string> {
  return freeChat(prompt, '你是中文企业培训社群运营助手，小熊风格，亲切温暖活泼。')
}

async function generateViaPaid(prompt: string, system?: string): Promise<string> {
  const storedKey = localStorage.getItem('wb_ai_key')
  const provider = localStorage.getItem('wb_ai_provider') || 'openrouter'

  const providers: Record<string, { url: string; model: string }> = {
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.0-flash-001' },
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant' },
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    siliconflow: { url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct' },
    custom: { url: localStorage.getItem('wb_ai_custom_url') || '', model: localStorage.getItem('wb_ai_custom_model') || 'gpt-3.5-turbo' },
  }

  const config = providers[provider]
  if (!config || !config.url) throw new Error('服务商配置不完整')

  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${storedKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 800,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = err.error?.message || `请求失败 (${response.status})`
    throw new Error(msg)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || '生成结果为空，请重试'
}

export function hasPaidKey(): boolean {
  return !!(import.meta.env.VITE_OPENROUTER_KEY || localStorage.getItem('wb_ai_key'))
}

export async function generateNotify(inputs: Record<string, string>): Promise<string> {
  const prompt = buildNotifyPrompt(inputs)

  if (hasPaidKey()) {
    return generateViaPaid(prompt)
  }
  return generateViaFree(prompt)
}

// 开放对话（AskAI 聊天）路由：配置了 Key 走付费通道（带 system 角色），否则退回免费通道
export async function generateChat(prompt: string, system?: string): Promise<string> {
  if (hasPaidKey()) {
    return generateViaPaid(prompt, system)
  }
  return freeChat(prompt, system)
}
