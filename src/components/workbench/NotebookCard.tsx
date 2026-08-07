import { useState, useRef } from 'react'
import { Plus, Trash2, Check, X, Eye, Pencil, BookOpen, ChevronRight } from 'lucide-react'
import { Card } from '@/types/workbench'
import { useWorkbenchStore } from '@/store/workbenchStore'
import { Markdown } from './Markdown'
import { autoFormatText } from '@/utils/autoFormat'
import SpeakButton from './SpeakButton'

type Notebook = { name: string; lessons: Array<{ title: string; content: string }>; quiz?: boolean }

export default function NotebookCard({ card, pageId }: { card: Card; pageId: string }) {
  const { updateCardNotebooks, updateCardField } = useWorkbenchStore()
  const notebooks: Notebook[] = card.notebooks || []
  const [courseIdx, setCourseIdx] = useState(0)
  const [lessonIdx, setLessonIdx] = useState(0)
  const [readMode, setReadMode] = useState(false)
  const [addingCourse, setAddingCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [editingCourse, setEditingCourse] = useState<number | null>(null)
  const [editCourseName, setEditCourseName] = useState('')
  const [editingLesson, setEditingLesson] = useState<number | null>(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [addingLesson, setAddingLesson] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [showAllWords, setShowAllWords] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // 生词本：根据翻译表现自动收缩（"我会了"的词不再显示）
  const knownWords: string[] = card.fields?.knownWords || []
  const isKnown = (h: string) => knownWords.includes(h)
  const vocabNb = notebooks.find(n => n.name.includes('单词表'))
  const vocabHeads: string[] = vocabNb?.lessons.map(l => l.title) || []
  // 从英文句子里挑出属于本集单词表的词（用于"我会了"自动划掉）
  const headwordsIn = (text: string): string[] => {
    const lower = ' ' + text.toLowerCase() + ' '
    return vocabHeads.filter(h => {
      const w = h.toLowerCase().trim()
      if (!w) return false
      // 多词短语用子串匹配；单词用边界匹配避免误判（如 "in" 命中 "win"）
      if (w.includes(' ')) return lower.includes(' ' + w + ' ') || lower.includes(w)
      return new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(lower)
    })
  }
  const markKnown = (heads: string[]) => {
    if (!heads.length) return
    const next = Array.from(new Set([...knownWords, ...heads]))
    updateCardField(pageId, card.id, 'knownWords', next)
  }
  const isVocabTab = !!course?.name.includes('单词表')
  const renderItems = lessons.map((ls, i) => ({ ls, i })).filter(({ ls }) => !(isVocabTab && !showAllWords && isKnown(ls.title)))

  const course = notebooks[courseIdx]
  const lessons = course?.lessons || []
  const lesson = lessons[lessonIdx]

  const save = (updated: Notebook[]) => updateCardNotebooks(pageId, card.id, updated)

  const saveContent = (content: string) => {
    const updated = [...notebooks]
    if (updated[courseIdx]?.lessons[lessonIdx]) {
      updated[courseIdx].lessons[lessonIdx].content = content
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(updated), 500)
    }
  }

  const saveLessonContent = (i: number, content: string) => {
    const updated = [...notebooks]
    if (updated[courseIdx]?.lessons[i]) {
      updated[courseIdx].lessons[i].content = content
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(updated), 500)
    }
  }

  const addCourse = () => {
    if (!newCourseName.trim()) return
    save([...notebooks, { name: newCourseName.trim(), lessons: [] }])
    setCourseIdx(notebooks.length); setLessonIdx(-1)
    setNewCourseName(''); setAddingCourse(false)
  }

  const renameCourse = () => {
    if (editingCourse === null) return
    const updated = [...notebooks]
    updated[editingCourse] = { ...updated[editingCourse], name: editCourseName.trim() || '未命名' }
    save(updated); setEditingCourse(null)
  }

  const deleteCourse = (i: number) => {
    save(notebooks.filter((_, idx) => idx !== i))
    setCourseIdx(Math.min(courseIdx, notebooks.length - 2))
    setLessonIdx(0)
  }

  const addLesson = () => {
    if (!newLessonTitle.trim() || !course) return
    const updated = [...notebooks]
    updated[courseIdx] = { ...course, lessons: [...course.lessons, { title: newLessonTitle.trim(), content: '' }] }
    save(updated); setLessonIdx(updated[courseIdx].lessons.length - 1)
    setNewLessonTitle(''); setAddingLesson(false)
  }

  const renameLesson = () => {
    if (editingLesson === null || !course) return
    const updated = [...notebooks]
    updated[courseIdx] = { ...course, lessons: course.lessons.map((l, i) => i === editingLesson ? { ...l, title: editLessonTitle.trim() || '未命名' } : l) }
    save(updated); setEditingLesson(null)
  }

  const deleteLesson = (i: number) => {
    const updated = [...notebooks]
    updated[courseIdx] = { ...course, lessons: course.lessons.filter((_, idx) => idx !== i) }
    save(updated); setLessonIdx(Math.min(lessonIdx, updated[courseIdx].lessons.length - 1))
  }

  return (
    <div className="flex flex-col">
      {/* Course tabs */}
      <div className="flex items-center gap-0.5 px-1 overflow-x-auto border-b border-[var(--border)]">
        {notebooks.map((nb, i) => (
          <div key={i} className="relative group">
            {editingCourse === i ? (
              <input
                autoFocus
                value={editCourseName}
                onChange={e => setEditCourseName(e.target.value)}
                onBlur={renameCourse}
                onKeyDown={e => { if (e.key === 'Enter') renameCourse(); if (e.key === 'Escape') setEditingCourse(null) }}
                className="text-[13px] px-2 py-1.5 border-b-2 border-[var(--accent)] outline-none bg-transparent text-[var(--ink)] min-w-[80px]"
              />
            ) : (
              <button
                onClick={() => { setCourseIdx(i); setLessonIdx(0) }}
                className={`flex items-center gap-1.5 text-[13px] px-3 py-2 whitespace-nowrap transition-colors border-b-2 ${
                  i === courseIdx
                    ? 'text-[var(--accent)] border-[var(--accent)] font-semibold'
                    : 'text-[var(--muted)] border-transparent hover:text-[var(--ink)] hover:border-[var(--border)]'
                }`}
                onDoubleClick={() => { setEditingCourse(i); setEditCourseName(nb.name) }}
              >
                <BookOpen size={12} />
                {nb.name}
                <span className="text-[10px] opacity-50">{nb.lessons.length}</span>
              </button>
            )}
            {/* Context actions */}
            {editingCourse !== i && (
              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); setEditingCourse(i); setEditCourseName(nb.name) }}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-0.5 text-[10px] text-[var(--muted)] hover:text-[var(--accent)]">
                  <Pencil size={10} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteCourse(i) }}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-0.5 text-[10px] text-[var(--muted)] hover:text-red-500">
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        ))}
        {addingCourse ? (
          <div className="flex items-center gap-1 py-1">
            <input autoFocus value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCourse(); if (e.key === 'Escape') { setAddingCourse(false); setNewCourseName('') } }}
              placeholder="课程名称" className="text-[13px] px-2 py-1.5 border border-[var(--accent)] rounded outline-none bg-transparent text-[var(--ink)] w-[120px]" />
            <button onClick={addCourse} className="text-[var(--accent)]"><Check size={14} /></button>
            <button onClick={() => { setAddingCourse(false); setNewCourseName('') }} className="text-[var(--muted)]"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setAddingCourse(true)}
            className="flex items-center gap-1 text-[12px] px-2 py-2 text-[var(--muted)] hover:text-[var(--accent)] whitespace-nowrap transition-colors border-b-2 border-transparent">
            <Plus size={14} /> 新增
          </button>
        )}
      </div>

      {/* Main area: 单栏平铺所有课节（无左侧空白栏） */}
      <div className="flex flex-col pt-2">
        <div className="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-[var(--border)]">
          <span className="text-[12px] text-[var(--muted)]">{lessons.length} 节</span>
          {isVocabTab && (
            <span className="text-[11px] text-[var(--muted)]">
              生词 {renderItems.length}/{lessons.length}
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-md overflow-hidden">
            {isVocabTab && (
              <button onClick={() => setShowAllWords(v => !v)}
                className={`text-[11px] px-2 py-1 transition-colors ${showAllWords ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
                {showAllWords ? '只看生词' : '显示全部'}
              </button>
            )}
            <button onClick={() => setReadMode(false)}
              className={`text-[11px] px-2 py-1 transition-colors ${!readMode ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
              编辑
            </button>
            <button onClick={() => setReadMode(true)}
              className={`text-[11px] px-2 py-1 transition-colors ${readMode ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
              阅读
            </button>
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="text-[13px] text-[var(--muted)]/40 py-10 text-center">点击下方「新增课节」开始记录</div>
        ) : (
          <div className="flex flex-col">
            {renderItems.map(({ ls, i }) => (
              <div key={i} className="group border-b border-[var(--border)] last:border-0 py-3">
                {course.quiz && readMode ? (
                  /* ===== 答题模式：先显示中文，点击查看英文答案 + 朗读 ===== */
                  <div className="flex items-start gap-2">
                    <BookOpen size={12} className="text-[var(--muted)]/50 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--ink)] leading-relaxed">{ls.title}</div>
                      {revealed.has(i) ? (
                        <div className="mt-1.5">
                          <div className="flex items-start gap-2">
                            <Markdown text={autoFormatText(ls.content)} className="notebook-read flex-1" />
                            <SpeakButton text={ls.content} className="shrink-0 mt-0.5" title="朗读答案" />
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              onClick={() => markKnown(headwordsIn(ls.content))}
                              className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            >
                              ✅ 我会了
                            </button>
                            <span className="text-[11px] text-[var(--muted)]">
                              这句里的词自动划出生词本
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevealed(prev => new Set(prev).add(i))}
                          className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline"
                        >
                          👁 查看答案
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ===== 普通模式（编辑/阅读） ===== */
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={12} className="text-[var(--muted)]/50 shrink-0" />
                      {editingLesson === i ? (
                        <input autoFocus value={editLessonTitle} onChange={e => setEditLessonTitle(e.target.value)}
                          onBlur={renameLesson} onKeyDown={e => { if (e.key === 'Enter') renameLesson(); if (e.key === 'Escape') setEditingLesson(null) }}
                          className="flex-1 text-[13px] font-semibold px-1.5 py-1 border border-[var(--accent)] rounded outline-none bg-transparent text-[var(--ink)]" />
                      ) : (
                        <button onClick={() => { setEditingLesson(i); setEditLessonTitle(ls.title) }}
                          className="flex-1 text-left text-[13px] font-semibold text-[var(--ink)] hover:text-[var(--accent)] truncate">
                          {ls.title}
                        </button>
                      )}
                      {editingLesson !== i && isVocabTab && (
                        <button onClick={() => markKnown([ls.title])}
                          title="划出生词本"
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 hover:bg-emerald-500/10 shrink-0 ml-1 px-1 rounded">
                          ✓ 我认识
                        </button>
                      )}
                      {editingLesson !== i && !isVocabTab && (
                        <button onClick={() => deleteLesson(i)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--muted)] hover:text-red-500 shrink-0 ml-1">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <div className="pl-5">
                      {readMode ? (
                        ls.content ? (
                          <Markdown text={autoFormatText(ls.content)} className="notebook-read" />
                        ) : (
                          <div className="text-[12px] text-[var(--muted)]/40">（空）</div>
                        )
                      ) : (
                        <textarea
                          value={ls.content}
                          onChange={e => saveLessonContent(i, e.target.value)}
                          placeholder="写点什么… 支持 Markdown"
                          className="w-full text-[13px] leading-[1.8] text-[var(--ink)] outline-none resize-none bg-transparent min-h-[56px] placeholder:text-[var(--muted)]/40"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {addingLesson ? (
          <div className="flex items-center gap-1 mt-3 px-1">
            <input autoFocus value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLesson(); if (e.key === 'Escape') { setAddingLesson(false); setNewLessonTitle('') } }}
              placeholder="课节标题" className="flex-1 text-[12px] px-1.5 py-1 border border-[var(--accent)] rounded outline-none bg-transparent text-[var(--ink)]" />
            <button onClick={addLesson} className="text-[var(--accent)]"><Check size={13} /></button>
            <button onClick={() => { setAddingLesson(false); setNewLessonTitle('') }} className="text-[var(--muted)]"><X size={13} /></button>
          </div>
        ) : course && (
          <button onClick={() => setAddingLesson(true)}
            className="flex items-center gap-1 px-1 py-2 mt-2 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
            <Plus size={12} /> 新增课节
          </button>
        )}
      </div>
    </div>
  )
}
