export async function freeChat(prompt: string, system?: string): Promise<string> {
  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt
  const maxLen = 2500
  const trimmed = fullPrompt.length > maxLen ? fullPrompt.slice(fullPrompt.length - maxLen) : fullPrompt
  const encoded = encodeURIComponent(trimmed)
  const seed = Math.random().toString(36).slice(2, 8)

  for (let i = 0; i < 5; i++) {
    const resp = await fetch(`/api/ai/${encoded}?model=openai&seed=${seed}`, {
      signal: AbortSignal.timeout(120000),
    })
    if (resp.ok) {
      const text = await resp.text()
      // 防止把网页（如 404 兜底页 / 部署平台 HTML）当成 AI 回复返回
      const head = text.trim().toLowerCase()
      const looksLikeHtml = head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<html')
      if (text && text.length >= 10 && !looksLikeHtml) return text
    }
    if (i < 4) await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error('AI 服务暂时不可用，请稍后重试')
}
