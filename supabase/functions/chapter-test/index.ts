// chapter-test: end-of-chapter test, half written (multiple choice, graded here) and
// half oral (answers assessed by the model). Questions and answers stay on the
// server: "start" returns the questions without answers, "submit" grades them.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError, getAiProvider } from '../_shared/ai/index.ts'
import { combineScores, type Level, levelAfterPass, scoreOral, scoreWritten } from '../_shared/chapter-test/scoring.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import {
  CHAPTER_TEST_ORAL_PROMPT_VERSION,
  CHAPTER_TEST_ORAL_SYSTEM_PROMPT,
  CHAPTER_TEST_PROMPT_VERSION,
  CHAPTER_TEST_SYSTEM_PROMPT,
} from '../_shared/prompts/chapter-test.v1.ts'
import {
  chapterTestRequestSchema,
  generatedTestSchema,
  type OralAssessment,
  oralAssessmentSchema,
  type OralTask,
  oralTaskSchema,
  type StoredQuestion,
  storedQuestionSchema,
  testIsValid,
} from '../_shared/schemas/chapter-test.ts'
import { lessonContentSchema } from '../_shared/schemas/lesson.ts'
import { z } from '../_shared/deps.ts'
import { adminClient, type Db, requireUserId, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'chapter-test'

interface ChapterInfo {
  id: number
  level: Level
  sort_order: number
  title: string
  grammar_focus: string
  lessons: { id: number }[]
}

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireUserId(db)

    const body = chapterTestRequestSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) throw new HttpError(400, 'bad_request', 'Richiesta non valida')

    if (body.data.action === 'start') return json(await start(db, userId, body.data.chapter_id))
    return json(await submit(db, userId, body.data))
  }),
)

async function loadChapter(db: Db, chapterId: number): Promise<ChapterInfo> {
  const { data, error } = await db
    .from('chapters')
    .select('id, level, sort_order, title, grammar_focus, lessons (id)')
    .eq('id', chapterId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'chapter_not_found', 'Capitolo non trovato')
  return data as ChapterInfo
}

async function start(db: Db, userId: string, chapterId: number) {
  const chapter = await loadChapter(db, chapterId)
  const admin = adminClient()

  const { data: passed, error: passedError } = await db
    .from('chapter_test_attempts')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('passed', true)
    .limit(1)
  if (passedError) throw passedError
  if (passed.length > 0) throw new HttpError(409, 'already_passed', 'Hai già superato la verifica di questo capitolo.')

  const { data: progress, error: progressError } = await db
    .from('lesson_progress')
    .select('lesson_id')
    .in('lesson_id', chapter.lessons.map((l) => l.id))
  if (progressError) throw progressError
  if (chapter.lessons.length === 0 || progress.length < chapter.lessons.length) {
    throw new HttpError(403, 'lessons_not_completed', 'Completa prima tutte le lezioni del capitolo.')
  }

  // A test that was never attempted is reused; after an attempt a new one is
  // generated, so a retry cannot be passed by memorising the previous answers.
  const { data: existing, error: existingError } = await admin
    .from('chapter_tests')
    .select('id, questions, oral_tasks, chapter_test_attempts (id)')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (existingError) throw existingError
  const unused = existing[0]
  if (unused && unused.chapter_test_attempts.length === 0) {
    const questions = z.array(storedQuestionSchema).safeParse(unused.questions)
    const oralTasks = z.array(oralTaskSchema).safeParse(unused.oral_tasks)
    if (questions.success && oralTasks.success) return publicTest(unused.id, questions.data, oralTasks.data)
  }

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('purpose')
    .eq('id', userId)
    .single()
  if (profileError) throw profileError

  const generated = await generateTest(db, userId, chapter, profile.purpose)
  const questions: StoredQuestion[] = generated.questions.map((q, i) => ({ id: `q${i + 1}`, ...q }))
  const oralTasks: OralTask[] = generated.oral_tasks.map((t, i) => ({ id: `o${i + 1}`, ...t }))
  const { data: saved, error: saveError } = await admin
    .from('chapter_tests')
    .insert({
      user_id: userId,
      chapter_id: chapterId,
      questions,
      oral_tasks: oralTasks,
      prompt_version: CHAPTER_TEST_PROMPT_VERSION,
    })
    .select('id')
    .single()
  if (saveError) throw saveError
  return publicTest(saved.id, questions, oralTasks)
}

/** The test as the learner sees it: no answers. */
function publicTest(testId: string, questions: StoredQuestion[], oralTasks: OralTask[]) {
  return {
    test_id: testId,
    questions: questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
    oral_tasks: oralTasks,
  }
}

async function generateTest(db: Db, userId: string, chapter: ChapterInfo, purpose: string | null) {
  const { data: contents, error } = await db
    .from('lesson_contents')
    .select('content, lessons!inner (chapter_id, sort_order)')
    .eq('lessons.chapter_id', chapter.id)
    .order('lessons(sort_order)')
  if (error) throw error
  const lessonLines = (contents ?? []).flatMap((row, i) => {
    const parsed = lessonContentSchema.safeParse(row.content)
    if (!parsed.success) return []
    const c = parsed.data
    return [
      `## Lesson ${i + 1}`,
      `- Grammar: ${c.grammar.examples.map((e) => e.en).join(' / ')}`,
      `- Words: ${c.words.map((w) => `${w.en} (${w.it})`).join(', ')}`,
      `- Phrases: ${c.phrases.map((p) => p.en).join(' / ')}`,
      `- Verbs: ${c.verbs.map((v) => `${v.base}-${v.past}-${v.past_participle}`).join(', ')}`,
    ]
  })
  const context = [
    '# Chapter',
    `- "${chapter.title}" (CEFR ${chapter.level}): ${chapter.grammar_focus}`,
    `- Learner's purpose: ${purpose ?? 'not specified'}`,
    '',
    '# What the lessons taught',
    ...(lessonLines.length ? lessonLines : ['(lesson contents not available: use the chapter grammar focus)']),
  ].join('\n')

  return await callAi(
    userId,
    CHAPTER_TEST_PROMPT_VERSION,
    'Non riesco a preparare la verifica adesso. Riprova tra poco.',
    {
      task: 'explanation',
      system: CHAPTER_TEST_SYSTEM_PROMPT,
      context,
      messages: [{ role: 'user', content: 'Write the chapter test.' }],
      schema: generatedTestSchema.refine(testIsValid, 'The test needs 8 questions with 4 options and 2 oral tasks'),
      maxTokens: 3000,
    },
  )
}

async function submit(
  db: Db,
  userId: string,
  body: { test_id: string; answers: Record<string, number>; oral: { id: string; transcript: string }[] },
) {
  const admin = adminClient()
  const { data: test, error } = await admin
    .from('chapter_tests')
    .select('id, chapter_id, questions, oral_tasks, chapter_test_attempts (id)')
    .eq('id', body.test_id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!test) throw new HttpError(404, 'test_not_found', 'Verifica non trovata')
  if (test.chapter_test_attempts.length > 0) {
    throw new HttpError(409, 'already_submitted', 'Hai già consegnato questa verifica: iniziane una nuova.')
  }
  const questions = z.array(storedQuestionSchema).parse(test.questions)
  const oralTasks = z.array(oralTaskSchema).parse(test.oral_tasks)
  const chapter = await loadChapter(db, test.chapter_id)

  const written = scoreWritten(questions, body.answers)
  const transcripts = body.oral
    .filter((o) => oralTasks.some((t) => t.id === o.id))
    .map((o) => ({ id: o.id, transcript: o.transcript.trim() }))
  const spoken = transcripts.some((t) => t.transcript.length > 0)
  const assessment = spoken ? await assessOral(userId, chapter, oralTasks, transcripts) : null
  const oralScore = assessment ? scoreOral(oralTasks, assessment.scores) : 0
  const { score, passed } = combineScores(written.score, oralScore)

  const feedback = {
    feedback_it: assessment?.feedback_it ??
      'Non hai risposto alle consegne orali: senza la parte orale la verifica non può essere superata.',
    strengths_it: assessment?.strengths_it ?? [],
    to_improve_it: assessment?.to_improve_it ?? [],
    oral_scores: oralTasks.map((t) => ({ id: t.id, score: assessment?.scores.find((s) => s.id === t.id)?.score ?? 0 })),
    wrong: written.wrong,
  }
  const { error: insertError } = await admin.from('chapter_test_attempts').insert({
    user_id: userId,
    chapter_id: chapter.id,
    test_id: test.id,
    written_score: written.score,
    oral_score: oralScore,
    score,
    passed,
    feedback,
  })
  if (insertError) throw insertError

  let level: Level | null = null
  if (passed) level = await raiseLevel(db, userId, chapter)

  return {
    chapter_id: chapter.id,
    written: { correct: written.correct, total: written.total, score: written.score, wrong: written.wrong },
    oral: {
      score: oralScore,
      feedback_it: feedback.feedback_it,
      strengths_it: feedback.strengths_it,
      to_improve_it: feedback.to_improve_it,
      scores: feedback.oral_scores,
    },
    score,
    passed,
    level,
  }
}

/** After the last chapter of a level, moves the learner up. Returns the (possibly new) level. */
async function raiseLevel(db: Db, userId: string, chapter: ChapterInfo): Promise<Level> {
  const { data: profile, error } = await db.from('profiles').select('level').eq('id', userId).single()
  if (error) throw error
  const { data: later, error: laterError } = await db
    .from('chapters')
    .select('id')
    .eq('level', chapter.level)
    .gt('sort_order', chapter.sort_order)
    .limit(1)
  if (laterError) throw laterError
  const next = levelAfterPass(profile.level, chapter.level, later.length === 0)
  if (next !== profile.level) {
    const { error: updateError } = await db.from('profiles').update({ level: next }).eq('id', userId)
    if (updateError) throw updateError
  }
  return next
}

function assessOral(
  userId: string,
  chapter: ChapterInfo,
  tasks: OralTask[],
  transcripts: { id: string; transcript: string }[],
): Promise<OralAssessment> {
  const context = [
    `# Chapter: "${chapter.title}" (CEFR ${chapter.level}): ${chapter.grammar_focus}`,
    '# Tasks (instructions given to the learner in Italian)',
    ...tasks.map((t) => `- ${t.id}: ${t.prompt_it}`),
  ].join('\n')
  const answers = tasks.map((t) => {
    const text = transcripts.find((x) => x.id === t.id)?.transcript
    return `## ${t.id}\n${text ? text : '(no answer)'}`
  }).join('\n\n')

  return callAi(
    userId,
    CHAPTER_TEST_ORAL_PROMPT_VERSION,
    'Non riesco a valutare la parte orale adesso. Riprova tra poco.',
    {
      task: 'explanation',
      system: CHAPTER_TEST_ORAL_SYSTEM_PROMPT,
      context,
      messages: [{ role: 'user', content: `# Learner's spoken answers (transcribed)\n\n${answers}` }],
      schema: oralAssessmentSchema,
      maxTokens: 2048,
    },
  )
}

/** Calls the model, logs token usage (also for failed attempts) and maps AI errors to a 502. */
async function callAi<T>(
  userId: string,
  promptVersion: string,
  failureMessage: string,
  request: Parameters<ReturnType<typeof getAiProvider>['generateStructured']>[0] & { schema: z.ZodType<T> },
): Promise<T> {
  try {
    const result = await getAiProvider().generateStructured<T>(request)
    await logAiUsage({ userId, functionName: FUNCTION_NAME, promptVersion, model: result.model, usage: result.usage })
    return result.data
  } catch (err) {
    if (err instanceof AiError) {
      if (err.usage && err.model) {
        await logAiUsage({ userId, functionName: FUNCTION_NAME, promptVersion, model: err.model, usage: err.usage })
      }
      throw new HttpError(502, `ai_${err.code}`, failureMessage)
    }
    throw err
  }
}
