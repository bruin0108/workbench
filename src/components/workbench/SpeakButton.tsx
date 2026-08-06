import { useState, useEffect, useRef } from 'react'

interface SpeakButtonProps {
  text: string
  lang?: string
  className?: string
  title?: string
}

/**
 * 朗读按钮：使用浏览器内置 SpeechSynthesis（Web Speech API）
 * - 完全免费、无需任何 API key、无需联网调用外部服务
 * - 所有现代浏览器（Chrome / Edge / Safari）内置英文语音
 * - 点击朗读，再次点击停止
 *
 * 规避两个浏览器语音引擎的已知 bug：
 * 1) 单句 >~15s 自动截断 → 把长文本按句子切短、排队朗读；
 * 2) 连续念很多短句时中间句被静默丢掉 → 句间留 ~120ms 间隔，并加 9s pause/resume 保活。
 */
const splitChunks = (text: string): string[] => {
  const segs = text
    .split(/\n+/)
    .flatMap((line) => line.match(/[^.!?;]+[.!?;]*|\S+/g) ?? [line])
    .map((s) => s.trim())
    .filter(Boolean)
  return segs.length ? segs : [text]
}

export default function SpeakButton({ text, lang = 'en-US', className = '', title = '朗读' }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  const cancelRef = useRef(false)
  const keepRef = useRef<number | null>(null)

  // 组件卸载时停止朗读，避免串音
  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
      if (keepRef.current) window.clearInterval(keepRef.current)
    }
  }, [])

  // 浏览器不支持语音合成则隐藏
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (!text || !text.trim()) return null

  const clearKeep = () => {
    if (keepRef.current) {
      window.clearInterval(keepRef.current)
      keepRef.current = null
    }
  }

  const toggle = () => {
    try {
      const synth = window.speechSynthesis
      if (speaking) {
        cancelRef.current = true
        clearKeep()
        synth.cancel()
        setSpeaking(false)
        return
      }
      // 先停掉上一段，避免叠加
      synth.cancel()
      cancelRef.current = false
      const chunks = splitChunks(text)
      let i = 0
      setSpeaking(true)
      // 9s pause/resume 一次，兜底绕过单句 >15s 截断
      clearKeep()
      keepRef.current = window.setInterval(() => {
        if (synth.speaking) {
          synth.pause()
          synth.resume()
        }
      }, 9000)
      const speakNext = () => {
        if (cancelRef.current || i >= chunks.length) {
          clearKeep()
          setSpeaking(false)
          return
        }
        const u = new SpeechSynthesisUtterance(chunks[i])
        u.lang = lang
        u.rate = 0.92
        u.onend = () => {
          i += 1
          // 句间留间隔，规避 Chrome 跳过中间句（丢句 bug）
          window.setTimeout(speakNext, 120)
        }
        u.onerror = () => {
          clearKeep()
          setSpeaking(false)
        }
        synth.speak(u)
      }
      // 首句也留一点间隔，避免 cancel 后第一句被吞
      window.setTimeout(speakNext, 60)
    } catch {
      clearKeep()
      setSpeaking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={speaking ? '停止朗读' : title}
      aria-label={speaking ? '停止朗读' : title}
      className={`inline-flex items-center justify-center leading-none hover:opacity-70 transition-opacity ${className}`}
    >
      {speaking ? '🔇' : '🔊'}
    </button>
  )
}
