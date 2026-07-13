import React from 'react'

/**
 * Shared lightweight Markdown renderer.
 * Supports: headings, bold, italic, inline code, code blocks,
 * ordered/unordered lists, blockquotes, horizontal rules, links.
 * No external dependencies.
 */

function renderInline(s: string, keyPrefix: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = s
  let idx = 0

  while (remaining.length > 0) {
    // Try matching: inline code, bold, italic, link
    const codeMatch = remaining.match(/`([^`]+)`/)
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

    const candidates = [
      { match: codeMatch, idx: codeMatch ? remaining.indexOf(codeMatch[0]) : -1, type: 'code' },
      { match: boldMatch, idx: boldMatch ? remaining.indexOf(boldMatch[0]) : -1, type: 'bold' },
      { match: linkMatch, idx: linkMatch ? remaining.indexOf(linkMatch[0]) : -1, type: 'link' },
      { match: italicMatch, idx: italicMatch ? remaining.indexOf(italicMatch[0]) : -1, type: 'italic' },
    ].filter((c) => c.idx !== -1)

    if (candidates.length === 0) {
      parts.push(<span key={`${keyPrefix}-${idx++}`}>{remaining}</span>)
      break
    }

    // Pick the earliest match
    candidates.sort((a, b) => a.idx - b.idx)
    const earliest = candidates[0]

    if (earliest.idx > 0) {
      parts.push(<span key={`${keyPrefix}-${idx++}`}>{remaining.substring(0, earliest.idx)}</span>)
    }

    const m = earliest.match!
    switch (earliest.type) {
      case 'code':
        parts.push(<code key={`${keyPrefix}-${idx++}`}>{m[1]}</code>)
        break
      case 'bold':
        parts.push(<strong key={`${keyPrefix}-${idx++}`}>{m[1]}</strong>)
        break
      case 'italic':
        parts.push(<em key={`${keyPrefix}-${idx++}`}>{m[1]}</em>)
        break
      case 'link':
        parts.push(
          <a key={`${keyPrefix}-${idx++}`} href={m[2]} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>,
        )
        break
    }

    remaining = remaining.substring(earliest.idx + m[0].length)
  }

  return <>{parts}</>
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let listItems: React.ReactNode[] = []
  let inBlockquote = false
  let quoteLines: string[] = []

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const Tag = inList
      elements.push(
        <Tag key={`list-${elements.length}`} className={inList === 'ul' ? 'prose-ul' : 'prose-ol'}>
          {listItems}
        </Tag>,
      )
      listItems = []
      inList = null
    }
  }

  const flushBlockquote = () => {
    if (inBlockquote && quoteLines.length > 0) {
      elements.push(
        <blockquote key={`bq-${elements.length}`}>
          {quoteLines.map((line, i) => (
            <p key={i}>{renderInline(line, `bq-${elements.length}-${i}`)}</p>
          ))}
        </blockquote>,
      )
      quoteLines = []
      inBlockquote = false
    }
  }

  lines.forEach((line, i) => {
    // Code block
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`pre-${i}`}>
            <code>{codeLines.join('\n')}</code>
          </pre>,
        )
        codeLines = []
        inCodeBlock = false
      } else {
        flushList()
        flushBlockquote()
        inCodeBlock = true
      }
      return
    }
    if (inCodeBlock) {
      codeLines.push(line)
      return
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList()
      flushBlockquote()
      elements.push(<hr key={`hr-${i}`} />)
      return
    }

    // Blockquote
    const bqMatch = line.match(/^>\s?(.*)/)
    if (bqMatch) {
      flushList()
      inBlockquote = true
      quoteLines.push(bqMatch[1])
      return
    } else {
      flushBlockquote()
    }

    // Empty line
    if (line.trim() === '') {
      flushList()
      return
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4')
      elements.push(<Tag key={`h-${i}`}>{renderInline(headingMatch[2], `h-${i}`)}</Tag>)
      return
    }

    // Unordered list item
    const listMatch = line.match(/^(\s*)[-*•]\s+(.+)/)
    if (listMatch) {
      const indent = listMatch[1].length
      if (inList !== 'ul') {
        flushList()
        inList = 'ul'
      }
      listItems.push(
        <li key={`li-${i}`} className={indent >= 2 ? 'ml-4' : ''}>
          {renderInline(listMatch[2], `li-${i}`)}
        </li>,
      )
      return
    }

    // Ordered list item
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/)
    if (numMatch) {
      const indent = numMatch[1].length
      if (inList !== 'ol') {
        flushList()
        inList = 'ol'
      }
      listItems.push(
        <li key={`li-${i}`} className={indent >= 2 ? 'ml-4' : ''} value={parseInt(numMatch[2])}>
          {renderInline(numMatch[3], `li-${i}`)}
        </li>,
      )
      return
    }

    // Regular paragraph
    flushList()
    elements.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>)
  })

  flushList()
  flushBlockquote()
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="pre-end">
        <code>{codeLines.join('\n')}</code>
      </pre>,
    )
  }

  return <div className={`prose-wb ${className}`}>{elements}</div>
}
