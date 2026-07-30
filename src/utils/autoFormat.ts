/**
 * Auto-format plain text into structured Markdown-like content.
 * 
 * Rules:
 * 1. If text already has Markdown syntax (headings, lists, blank lines), leave as-is
 * 2. Normalize \r\n → \n
 * 3. Add line breaks before 【...】 section markers → convert to ### headings
 * 4. Add line breaks before numbered patterns (1. / ① / 第一步)
 * 5. Add line breaks before bullet patterns (· / •) that appear mid-text
 * 6. If text is one long string with no \n, split by Chinese sentence endings (。！？；)
 * 7. Split long lines (> 80 chars) by transition words and semicolons
 * 8. Convert single \n to \n\n for proper Markdown paragraph spacing
 */

export function autoFormatText(text: string): string {
  if (!text || text.trim().length === 0) return text

  // Normalize Windows line endings
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // --- Pre-step: Detect & merge AI broken-line output ---
  // Pattern: many short lines (avg < 50 chars) with no blank-line separators
  // This is typical of LLM output where every phrase is on its own line.
  // Merge into proper paragraphs and return early — skip all splitting steps.
  const rawLines = result.split('\n').filter(l => l.trim().length > 0)
  let aiBrokenMerged = false
  if (rawLines.length >= 4) {
    const avgLen = rawLines.reduce((s, l) => s + l.trim().length, 0) / rawLines.length
    const hasNoBlankLines = !result.includes('\n\n')
    // If average line is short AND no paragraph breaks → likely broken AI output
    if (avgLen < 50 && hasNoBlankLines) {
      aiBrokenMerged = true
      const paragraphs: string[] = []
      let currentPara = ''
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line) continue
        // Start new paragraph only at clear boundaries:
        // - Line ends with 。！？ AND next line starts a new thought (capital/number/mark)
        // - Line is a section marker 【...】
        // - Line is a numbered item
        const prevEndsSentence = /[。！？!?]$/.test(currentPara)
        const nextStartsNew = /^[【①②③④⑤⑥⑦⑧⑨⑩\d「"]/i.test(line)
        const isMarker = /^【[^】]+】$/.test(line) || /^\d+[.、]/.test(line)
        if ((prevEndsSentence && nextStartsNew) || isMarker) {
          if (currentPara) paragraphs.push(currentPara)
          currentPara = line
        } else {
          // Append to current paragraph with proper spacing
          currentPara += (currentPara && !/[：:，,、]$/.test(currentPara) ? '' : '') + line
        }
      }
      if (currentPara) paragraphs.push(currentPara)
      // Join paragraphs with double newlines (Markdown paragraph spacing)
      result = paragraphs.join('\n\n')
    }
  }

  // If we merged broken AI output, clean up minimally and return — don't re-split!
  if (aiBrokenMerged) {
    // Convert 【...】 markers to headings
    result = result.replace(/^【([^】]+)】\s*/gm, '### $1\n')
    // Clean up excessive blank lines
    result = result.replace(/\n{3,}/g, '\n\n')
    return result.trim()
  }

  // If text already has Markdown structure (double newlines, headings, etc.), 
  // still process long lines but don't skip entirely
  const hasMarkdownStructure = /^#{1,4}\s/m.test(result) 
    || /^[-*•]\s/m.test(result) 
    || /^\d+\.\s/m.test(result)
    || result.includes('```')
  
  // If it has \n\n already, it's likely already formatted — return as-is
  if (result.includes('\n\n') && hasMarkdownStructure) return result

  // --- Step 1: Split by 【】 section markers ---
  result = result.replace(/([^\n])\s*【/g, '$1\n【')

  // --- Step 2: Split by numbered patterns ---
  result = result.replace(/([^\n])\s*(?=(?:\d+[.、]\s)|(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]))/g, '$1\n')
  result = result.replace(/([^\n])\s*(?=第[一二三四五六七八九十]+[步章节项])/g, '$1\n')

  // --- Step 3: Split by bullet patterns mid-text ---
  result = result.replace(/([^\n；;])\s*[·•]\s*/g, '$1\n· ')

  // --- Step 4: If still no \n, split by sentence endings ---
  if (!result.includes('\n') && result.length > 60) {
    // Split by sentence endings
    result = result.replace(/([。！？!?])\s*/g, '$1\n')
    // If still no \n (no sentence endings found), split by semicolons
    if (!result.includes('\n') && result.length > 60) {
      result = result.replace(/([；;])\s*/g, '$1\n')
    }
    // If STILL no \n, split by colons
    if (!result.includes('\n') && result.length > 80) {
      result = result.replace(/([：:])\s*/g, '$1\n')
    }
  }

  // --- Step 5: Split long lines by transition words and semicolons ---
  const lines = result.split('\n')
  const formattedLines: string[] = []
  for (const line of lines) {
    if (line.length > 80) {
      // Split before transition words
      let split = line.replace(
        /(首先|其次|然后|接下来|最后|另外|此外|注意|提示|说明|备注|特别|重点|关键|核心|目标|原则|方法|步骤|工具|资源|建议|同时|因此|所以|但是|不过|然而|总之|综上|通过|为了|基于|根据|按照|例如|比如|如|即可|请|需|需要|可|可以|将|会|已|已将|已经)/g,
        '\n$1'
      )
      // Also split by semicolons if line is still long
      if (split.length > 80) {
        split = split.replace(/([；;])\s*/g, '$1\n')
      }
      // Also split by Chinese commas if individual segments are very long (> 120 chars)
      if (split.length > 120) {
        split = split.replace(/([，,])\s*(?=[^，,]{20,})/g, '$1\n')
      }
      formattedLines.push(split)
    } else {
      formattedLines.push(line)
    }
  }
  result = formattedLines.join('\n')

  // --- Step 6: Convert single \n to \n\n for proper Markdown paragraph spacing ---
  // Only if text doesn't already have \n\n and has multiple lines
  if (!result.includes('\n\n') && result.includes('\n')) {
    // Check if lines look like paragraphs (not list items or headings)
    const hasListsOrHeadings = /^[-*•]\s/m.test(result) || /^#{1,4}\s/m.test(result) || /^\d+\.\s/m.test(result)
    if (!hasListsOrHeadings) {
      // Convert single \n to \n\n for paragraph breaks
      result = result.replace(/\n/g, '\n\n')
    }
  }

  // --- Step 7: Clean up excessive blank lines ---
  result = result.replace(/\n{3,}/g, '\n\n')

  // --- Step 8: Convert 【...】 to ### headings ---
  result = result.replace(/^【([^】]+)】\s*/gm, '### $1\n')

  // --- Step 9: Convert lone · lines to bullet list items ---
  result = result.replace(/^·\s+/gm, '- ')

  return result.trim()
}
