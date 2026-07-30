function autoFormatText(text) {
  if (!text || text.trim().length === 0) return text
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rawLines = result.split('\n').filter(l => l.trim().length > 0)
  let aiBrokenMerged = false
  if (rawLines.length >= 4) {
    const avgLen = rawLines.reduce((s, l) => s + l.trim().length, 0) / rawLines.length
    const hasNoBlankLines = !result.includes('\n\n')
    if (avgLen < 50 && hasNoBlankLines) {
      aiBrokenMerged = true
      const paragraphs = []
      let currentPara = ''
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line) continue
        const prevEndsSentence = /[。！？!?]$/.test(currentPara)
        const nextStartsNew = /^[【①②③④⑤⑥⑦⑧⑨⑩\d「"]/i.test(line)
        const isMarker = /^【[^】]+】$/.test(line) || /^\d+[.、]/.test(line)
        if ((prevEndsSentence && nextStartsNew) || isMarker) {
          if (currentPara) paragraphs.push(currentPara)
          currentPara = line
        } else {
          currentPara += (currentPara && !/[：:，,、]$/.test(currentPara) ? '' : '') + line
        }
      }
      if (currentPara) paragraphs.push(currentPara)
      result = paragraphs.join('\n\n')
    }
  }
  if (aiBrokenMerged) {
    result = result.replace(/^【([^】]+)】\s*/gm, '### $1\n')
    result = result.replace(/\n{3,}/g, '\n\n')
    return result.trim()
  }
  return result
}

const sample = `如何从个体贡献者转变为集体领导者，肩负起不同的责任与使命。他强调，管理者与专家、普通员工的根本区别在于，专家以个体为主，而管理者
需
通过团队成就集体
目标。
领导以视频中"秀才"、"陈衍宗"与"连长"三个角色为例，
剖析了管理者的典型误区与应具备的素养。他强调，
"秀才"空有理论、缺乏实战；
"陈衍宗"虽是兵王，
却因个人英雄主义导致团队溃败。而管理者必须避免此类错误，
需具备业务能力、管理沟通协作能力及领导影响力，做到"处事自若、谋篇布局"。
他进一步指出，
管理者成长的关键在于"意愿、认知、能力"铁人三项，其中软性素质（意愿与认知）占80%，
决定干部发展的天花板。他还介绍了公司的"L.E.A.D."领导力模型（四梁八柱），并警示认知错位的危害，
以基辅
会战为例
说明'团长认知指挥不了方面军'的惨痛教训。`

console.log("=== 修复后输出 ===")
console.log(autoFormatText(sample))
