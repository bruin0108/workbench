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
 * 关键设计：整段只调一次 speak()（单个长语音），并用每 ~9s 的 pause/resume 保活。
 * 这样能同时绕开两个浏览器语音引擎的已知 bug：
 *  1) 单句 >~15s 自动截断（保活重置计时）；
 *  2) 连续多次 speak() 排队时中间句被静默丢弃（只有一句，根本不会丢）。
 */
export default function SpeakButton({ text, lang = 'en-US', className = '', title = '朗读' }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)
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
        clearKeep()
        synth.cancel()
        setSpeaking(false)
        return
      }
      // 先停掉上一段，避免叠加
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      u.rate = 0.92
      u.onend = () => {
        clearKeep()
        setSpeaking(false)
      }
      u.onerror = () => {
        clearKeep()
        setSpeaking(false)
      }
      // 每 ~9s pause/resume 一次，绕开单句 >15s 截断
      clearKeep()
      keepRef.current = window.setInterval(() => {
        if (synth.speaking) {
          synth.pause()
          synth.resume()
        }
      }, 9000)
      // 首句稍延迟，避免 cancel 后第一句被吞
      window.setTimeout(() => synth.speak(u), 60)
      setSpeaking(true)
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
