import { type LanguagePair, loadLearner } from './languages.ts'
import type { Db } from './supabase.ts'

export interface LearnerSnapshot {
  pair: LanguagePair
  level: string
  goal: string | null
  purpose: string | null
  /** Lesson being practised, with its chapter, for content steering. */
  lesson: {
    title: string
    focus: string
    chapterTitle: string
    grammarFocus: string
  } | null
  recentMistakes: { original: string; corrected: string; category: string }[]
  reviewWords: string[]
}

const RECENT_MISTAKES = 30
const MAX_EXAMPLES = 5
const MAX_REVIEW_WORDS = 10

/**
 * Reads what the tutor needs to know about the learner, in the language being practised: the lesson's language,
 * otherwise the active one. All queries run under RLS.
 */
export async function loadLearnerSnapshot(
  db: Db,
  userId: string,
  lessonId: number | undefined,
): Promise<LearnerSnapshot> {
  const lessonLanguage = lessonId === undefined ? undefined : await languageOfLesson(db, lessonId)
  const learner = await loadLearner(db, userId, lessonLanguage)
  const language = learner.pair.target
  const [lesson, mistakes, vocab] = await Promise.all([
    lessonId === undefined ? Promise.resolve({ data: null, error: null }) : db
      .from('lessons')
      .select('title, focus, chapters (title, grammar_focus)')
      .eq('id', lessonId)
      .maybeSingle(),
    db
      .from('mistakes')
      .select('original, corrected, category')
      .eq('user_id', userId)
      .eq('language', language)
      // Mispronounced words are review cards, not grammar the tutor should work on.
      .neq('category', 'pronunciation')
      .order('created_at', { ascending: false })
      .limit(RECENT_MISTAKES),
    db
      .from('vocab_items')
      .select('en')
      .eq('user_id', userId)
      .eq('language', language)
      .lte('due', new Date().toISOString())
      .order('due', { ascending: true })
      .limit(MAX_REVIEW_WORDS),
  ])

  for (const result of [lesson, mistakes, vocab]) {
    if (result.error) throw result.error
  }

  return {
    pair: learner.pair,
    level: learner.level,
    goal: learner.goal,
    purpose: learner.purpose,
    lesson: lesson.data
      ? {
        title: lesson.data.title,
        focus: lesson.data.focus,
        chapterTitle: lesson.data.chapters?.title ?? '',
        grammarFocus: lesson.data.chapters?.grammar_focus ?? '',
      }
      : null,
    recentMistakes: mistakes.data ?? [],
    reviewWords: (vocab.data ?? []).map((v) => v.en),
  }
}

async function languageOfLesson(db: Db, lessonId: number) {
  const { data, error } = await db.from('lessons').select('chapters (language)')
    .eq('id', lessonId).maybeSingle()
  if (error) throw error
  return data?.chapters?.language
}

/** Renders the snapshot as the per-request part of the system prompt. Pure, for testing. */
export function renderLearnerContext(s: LearnerSnapshot): string {
  const counts = new Map<string, number>()
  for (const m of s.recentMistakes) {
    counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  }
  const recurring = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([category, n]) => `${category} (${n})`)

  const lines = ['# Learner context', `- Level: ${s.level}`]
  lines.push(`- Learning purpose: ${s.purpose ?? 'not specified'}`)
  if (s.goal) lines.push(`- In the learner's own words: ${s.goal}`)
  lines.push(
    s.lesson
      ? `- Current lesson: "${s.lesson.title}" - focus: ${s.lesson.focus} (chapter "${s.lesson.chapterTitle}": ${s.lesson.grammarFocus})`
      : '- Current lesson: none, free conversation',
  )
  lines.push(
    `- Recurring mistake types: ${recurring.length ? recurring.join(', ') : 'none yet'}`,
  )
  if (s.recentMistakes.length) {
    lines.push('- Recent mistakes:')
    for (const m of s.recentMistakes.slice(0, MAX_EXAMPLES)) {
      lines.push(`  - "${m.original}" -> "${m.corrected}" [${m.category}]`)
    }
  }
  lines.push(
    `- Words in review: ${s.reviewWords.length ? s.reviewWords.join(', ') : 'none'}`,
  )
  return lines.join('\n')
}
