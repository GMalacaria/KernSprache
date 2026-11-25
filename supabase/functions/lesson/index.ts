// lesson: returns the content of a lesson for the current learner, generating it
// (tailored to level and purpose) and saving it the first time. "prefetch"
// prepares all lessons of a chapter ahead of time.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError, getAiProvider } from '../_shared/ai/index.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { LESSON_PROMPT_VERSION, lessonPrompt } from '../_shared/prompts/lesson.v2.ts'
import { type LanguageCode, type Learner, loadLearner, pairNames } from '../_shared/languages.ts'
import {
  type LessonContent,
  lessonContentSchema,
  lessonRequestSchema,
  questionsAreValid,
} from '../_shared/schemas/lesson.ts'
import { adminClient, type Db, requireApprovedUser, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'lesson'
const PREFETCH_CONCURRENCY = 2

interface LessonInfo {
  id: number
  chapter_id: number
  sort_order: number
  title: string
  focus: string
  chapters: {
    level: string
    title: string
    grammar_focus: string
    language: LanguageCode
  } | null
}

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireApprovedUser(db)

    const body = lessonRequestSchema.safeParse(
      await req.json().catch(() => null),
    )
    if (!body.success) {
      throw new HttpError(400, 'bad_request', 'Richiesta non valida')
    }

    if (body.data.action === 'get') {
      const lesson = await loadLesson(db, body.data.lesson_id)
      const learner = await loadLearner(db, userId, lesson.chapters?.language)
      const { content } = await getOrGenerate(db, userId, lesson, learner)
      return json({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          chapter_id: lesson.chapter_id,
        },
        content,
      })
    }

    const { data: lessons, error } = await db
      .from('lessons')
      .select(
        'id, chapter_id, sort_order, title, focus, chapters (level, title, grammar_focus, language)',
      )
      .eq('chapter_id', body.data.chapter_id)
      .order('sort_order')
    if (error) throw error
    let generated = 0
    const queue = [...(lessons as LessonInfo[])]
    const learner = await loadLearner(db, userId, queue[0]?.chapters?.language)
    // Small batches in lesson order: later batches see the words of earlier ones
    // (two lessons in the same batch may occasionally share a word).
    while (queue.length) {
      const batch = queue.splice(0, PREFETCH_CONCURRENCY)
      const results = await Promise.all(
        batch.map((l) => getOrGenerate(db, userId, l, learner)),
      )
      generated += results.filter((r) => r.generated).length
    }
    return json({ generated })
  }),
)

async function loadLesson(db: Db, lessonId: number): Promise<LessonInfo> {
  const { data, error } = await db
    .from('lessons')
    .select(
      'id, chapter_id, sort_order, title, focus, chapters (level, title, grammar_focus, language)',
    )
    .eq('id', lessonId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw new HttpError(404, 'lesson_not_found', 'Lezione non trovata')
  }
  return data as LessonInfo
}

/** Cached content if written for the current purpose, otherwise newly generated and saved. */
async function getOrGenerate(
  db: Db,
  userId: string,
  lesson: LessonInfo,
  learner: Learner,
): Promise<{ content: LessonContent; generated: boolean }> {
  const { data: cached, error } = await db
    .from('lesson_contents')
    .select('content, purpose')
    .eq('lesson_id', lesson.id)
    .maybeSingle()
  if (error) throw error
  if (cached && cached.purpose === learner.purpose) {
    const parsed = lessonContentSchema.safeParse(cached.content)
    if (parsed.success) return { content: parsed.data, generated: false }
  }

  const content = await generate(db, userId, lesson, learner)
  const { error: saveError } = await adminClient().from('lesson_contents')
    .upsert({
      user_id: userId,
      lesson_id: lesson.id,
      purpose: learner.purpose,
      content,
      prompt_version: LESSON_PROMPT_VERSION,
    })
  if (saveError) throw saveError
  return { content, generated: true }
}

async function generate(
  db: Db,
  userId: string,
  lesson: LessonInfo,
  learner: Learner,
): Promise<LessonContent> {
  const taughtWords = await wordsTaughtInChapter(db, lesson)
  const context = [
    '# Lesson context',
    `- Chapter: "${lesson.chapters?.title}" (CEFR ${lesson.chapters?.level}) - ${lesson.chapters?.grammar_focus}`,
    `- Lesson ${lesson.sort_order} of the chapter: "${lesson.title}" - focus: ${lesson.focus}`,
    `- Learner's purpose: ${learner.purpose ?? 'not specified'}`,
    learner.goal ? `- In the learner's own words: ${learner.goal}` : null,
    `- Words already taught in this chapter: ${taughtWords.length ? taughtWords.join(', ') : 'none'}`,
  ].filter((line): line is string => line !== null).join('\n')

  try {
    const result = await getAiProvider().generateStructured({
      task: 'explanation',
      system: lessonPrompt(pairNames(learner.pair)),
      context,
      messages: [{ role: 'user', content: 'Write the lesson.' }],
      schema: lessonContentSchema.refine(
        questionsAreValid,
        'Each question needs 4 options and a valid answer',
      ),
      maxTokens: 6000,
    })
    await logAiUsage({
      userId,
      functionName: FUNCTION_NAME,
      promptVersion: LESSON_PROMPT_VERSION,
      model: result.model,
      usage: result.usage,
    })
    return result.data
  } catch (err) {
    if (err instanceof AiError) {
      if (err.usage && err.model) {
        await logAiUsage({
          userId,
          functionName: FUNCTION_NAME,
          promptVersion: LESSON_PROMPT_VERSION,
          model: err.model,
          usage: err.usage,
        })
      }
      throw new HttpError(
        502,
        `ai_${err.code}`,
        'Non riesco a preparare la lezione adesso. Riprova tra poco.',
      )
    }
    throw err
  }
}

/** English words of the earlier lessons of the same chapter, to avoid repeating them. */
async function wordsTaughtInChapter(
  db: Db,
  lesson: LessonInfo,
): Promise<string[]> {
  const { data, error } = await db
    .from('lesson_contents')
    .select('content, lessons!inner (chapter_id, sort_order)')
    .eq('lessons.chapter_id', lesson.chapter_id)
    .lt('lessons.sort_order', lesson.sort_order)
  if (error) throw error
  return (data ?? []).flatMap((row) => {
    const parsed = lessonContentSchema.safeParse(row.content)
    return parsed.success
      ? [
        ...parsed.data.words.map((w) => w.en),
        ...parsed.data.phrases.map((p) => p.en),
      ]
      : []
  })
}
