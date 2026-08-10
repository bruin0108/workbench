import { Component, ReactNode } from 'react'

/**
 * 卡片级错误边界：某张卡渲染出错时只显示提示，不再让整页白屏。
 */
export default class CardErrorBoundary extends Component<
  { children: ReactNode; title?: string },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null }

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.error('[CardErrorBoundary]', this.props.title || '', err)
  }

  render() {
    if (this.state.err) {
      return (
        <div className="border border-red-300/50 bg-red-50/50 dark:bg-red-500/5 rounded-xl p-4 text-[12px] text-red-600">
          <div className="font-semibold mb-1">⚠️ 这张卡片渲染出错了</div>
          <div className="text-[11px] opacity-80 break-all">
            {this.props.title ? `「${this.props.title}」：` : ''}
            {this.state.err.message}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1.5">
            其它卡片不受影响，页面可正常使用。
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
