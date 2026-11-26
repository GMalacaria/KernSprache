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

/** The shared cache key of a lesson: no data of a single learner, so everyone with the same key reuses it. */
interface CacheKey {
  lesson_id: number
  native_language: LanguageCode
  purpose: Learner['purpose']
  prompt_version: string
}

const CLAIM_SECONDS = 120
const WAIT_STEP_MS = 2000
const WAIT_LIMIT_MS = 60_000

/**
 * The learner's own copy if it was written for their purpose (a lesson in progress keeps its content), otherwise
 * the shared one, generated once for everyone with the same native language and purpose. The learner gets a copy
 * in lesson_contents, which the chapter test still reads.
 */
async function getOrGenerate(
  db: Db,
  userId: string,
  lesson: LessonInfo,
  learner: Learner,
): Promise<{ content: LessonContent; generated: boolean }> {
  const { data: own, error } = await db
    .from('lesson_contents')
    .select('content, purpose')
    .eq('lesson_id', lesson.id)
    .maybeSingle()
  if (error) throw error
  if (own && own.purpose === learner.purpose) {
    const parsed = lessonContentSchema.safeParse(own.content)
    if (parsed.success) return { content: parsed.data, generated: false }
  }

  const key: CacheKey = {
    lesson_id: lesson.id,
    native_language: learner.pair.native,
    purpose: learner.purpose,
    prompt_version: LESSON_PROMPT_VERSION,
  }
  const shared = await sharedContent(key, userId, lesson, learner)
  const { error: saveError } = await adminClient().from('lesson_contents')
    .upsert({
      user_id: userId,
      lesson_id: lesson.id,
      purpose: learner.purpose,
      content: shared.content,
      prompt_version: LESSON_PROMPT_VERSION,
    })
  if (saveError) throw saveError
  return shared
}

/** Reads the shared content; generates it when this request wins the claim, otherwise waits for the one that did. */
async function sharedContent(
  key: CacheKey,
  userId: string,
  lesson: LessonInfo,
  learner: Learner,
): Promise<{ content: LessonContent; generated: boolean }> {
  const admin = adminClient()
  const deadline = Date.now() + WAIT_LIMIT_MS
  while (true) {
    const cached = await readShared(key)
    if (cached) return { content: cached, generated: false }

    const { data: claimed, error } = await admin.rpc('claim_lesson_generation', {
      p_lesson_id: key.lesson_id,
      p_native_language: key.native_language,
      // The SQL function takes a null purpose; the generated type does not say so.
      p_purpose: key.purpose as NonNullable<CacheKey['purpose']>,
      p_prompt_version: key.prompt_version,
      p_seconds: CLAIM_SECONDS,
    })
    if (error) throw error
    if (claimed) {
      let content: LessonContent
      try {
        content = await generate(userId, lesson, learner, key)
      } catch (err) {
        // Release the claim so the next request can try again straight away.
        await updateShared(key, { generating_until: null })
        throw err
      }
      await updateShared(key, { content, generating_until: null })
      return { content, generated: true }
    }
    // Another request is generating it (e.g. the chapter being prepared in the background).
    if (Date.now() > deadline) {
      throw new HttpError(503, 'lesson_preparing', 'La lezione è ancora in preparazione. Riprova tra poco.')
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS))
  }
}

async function readShared(key: CacheKey): Promise<LessonContent | null> {
  let query = adminClient()
    .from('lesson_content_cache')
    .select('content')
    .eq('lesson_id', key.lesson_id)
    .eq('native_language', key.native_language)
    .eq('prompt_version', key.prompt_version)
  // A missing purpose is a key value too (unique NULLS NOT DISTINCT): match it with IS NULL.
  query = key.purpose === null ? query.is('purpose', null) : query.eq('purpose', key.purpose)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  const parsed = lessonContentSchema.safeParse(data?.content)
  return parsed.success ? parsed.data : null
}

async function updateShared(
  key: CacheKey,
  values: { content?: LessonContent; generating_until: null },
): Promise<void> {
  let query = adminClient()
    .from('lesson_content_cache')
    .update(values)
    .eq('lesson_id', key.lesson_id)
    .eq('native_language', key.native_language)
    .eq('prompt_version', key.prompt_version)
  query = key.purpose === null ? query.is('purpose', null) : query.eq('purpose', key.purpose)
  const { error } = await query
  if (error) throw error
}

async function generate(
  userId: string,
  lesson: LessonInfo,
  learner: Learner,
  key: CacheKey,
): Promise<LessonContent> {
  // Shared content: only the course, the purpose and the earlier shared lessons go into the prompt, never the
  // learner's own words or history.
  const taughtWords = await wordsTaughtInChapter(lesson, key)
  const context = [
    '# Lesson context',
    `- Chapter: "${lesson.chapters?.title}" (CEFR ${lesson.chapters?.level}) - ${lesson.chapters?.grammar_focus}`,
    `- Lesson ${lesson.sort_order} of the chapter: "${lesson.title}" - focus: ${lesson.focus}`,
    `- Learner's purpose: ${learner.purpose ?? 'not specified'}`,
    `- Words already taught in this chapter: ${taughtWords.length ? taughtWords.join(', ') : 'none'}`,
  ].join('\n')

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

/** Words of the earlier shared lessons of the same chapter (same native language and purpose), not to repeat them. */
async function wordsTaughtInChapter(lesson: LessonInfo, key: CacheKey): Promise<string[]> {
  let query = adminClient()
    .from('lesson_content_cache')
    .select('content, lessons!inner (chapter_id, sort_order)')
    .eq('lessons.chapter_id', lesson.chapter_id)
    .lt('lessons.sort_order', lesson.sort_order)
    .eq('native_language', key.native_language)
    .eq('prompt_version', key.prompt_version)
  query = key.purpose === null ? query.is('purpose', null) : query.eq('purpose', key.purpose)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).flatMap((row) => {
    const parsed = lessonContentSchema.safeParse(row.content)
    return parsed.success ? [...parsed.data.words.map((w) => w.en), ...parsed.data.phrases.map((p) => p.en)] : []
  })
}
