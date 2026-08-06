import { useState, useEffect } from 'react'

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
 * 关键点：Chrome/Edge 对「单个超过约 15 秒的语音」会自动截断（已知 bug）。
 * 因此把长文本按句子切成短句、排队连续朗读，从根本上规避截断。
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

  // 组件卸载时停止朗读，避免串音
  useEffect(() => {
    return () => {
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    }
  }, [])

  // 浏览器不支持语音合成则隐藏
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (!text || !text.trim()) return null

  const toggle = () => {
    try {
      const synth = window.speechSynthesis
      if (speaking) {
        synth.cancel()
        setSpeaking(false)
        return
      }
      // 先停掉上一段，避免叠加
      synth.cancel()
      const chunks = splitChunks(text)
      let i = 0
      setSpeaking(true)
      const speakNext = () => {
        if (i >= chunks.length) {
          setSpeaking(false)
          return
        }
        const u = new SpeechSynthesisUtterance(chunks[i])
        u.lang = lang
        u.rate = 0.92
        u.onend = () => {
          i += 1
          speakNext()
        }
        u.onerror = () => setSpeaking(false)
        synth.speak(u)
      }
      speakNext()
    } catch {
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
