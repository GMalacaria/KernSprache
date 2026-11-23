// tutor-chat: one dialogue turn. Builds the learner context, asks the model for a
// reply plus corrections (validated JSON), stores mistakes and new vocabulary.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError, getAiProvider } from '../_shared/ai/index.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { cleanReply } from '../_shared/tutor-reply.ts'
import { loadLearnerSnapshot, renderLearnerContext } from '../_shared/learner-context.ts'
import { TUTOR_CHAT_PROMPT_VERSION, TUTOR_CHAT_SYSTEM_PROMPT } from '../_shared/prompts/tutor-chat.v2.ts'
import {
  MAX_HISTORY_MESSAGES,
  tutorChatRequestSchema,
  type TutorReply,
  tutorReplySchema,
} from '../_shared/schemas/tutor-chat.ts'
import { type Db, requireUserId, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'tutor-chat'

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireUserId(db)

    const body = tutorChatRequestSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) throw new HttpError(400, 'bad_request', 'Richiesta non valida')
    const { topic_id: topicId } = body.data

    const sessionId = await ensureSession(db, body.data.session_id, topicId)
    const snapshot = await loadLearnerSnapshot(db, userId, topicId)

    let result
    try {
      result = await getAiProvider().generateStructured({
        task: 'dialogue',
        system: TUTOR_CHAT_SYSTEM_PROMPT,
        context: renderLearnerContext(snapshot),
        messages: body.data.messages.slice(-MAX_HISTORY_MESSAGES),
        schema: tutorReplySchema,
        maxTokens: 2048,
      })
    } catch (err) {
      if (err instanceof AiError) {
        if (err.usage && err.model) {
          await logAiUsage({
            userId,
            functionName: FUNCTION_NAME,
            promptVersion: TUTOR_CHAT_PROMPT_VERSION,
            model: err.model,
            usage: err.usage,
          })
        }
        throw new HttpError(502, `ai_${err.code}`, aiErrorMessage(err))
      }
      throw err
    }

    await logAiUsage({
      userId,
      functionName: FUNCTION_NAME,
      promptVersion: TUTOR_CHAT_PROMPT_VERSION,
      model: result.model,
      usage: result.usage,
    })

    const reply = cleanReply(result.data, new Set(snapshot.reviewWords))
    await Promise.all([saveMistakes(db, sessionId, reply), saveVocab(db, userId, reply)])

    return json({ session_id: sessionId, ...reply })
  }),
)

function aiErrorMessage(err: AiError): string {
  switch (err.code) {
    case 'refused':
      return 'Il tutor non può rispondere a questo messaggio. Prova a riformularlo.'
    case 'invalid_output':
      return 'Il tutor ha risposto in modo non valido. Riprova.'
    case 'unavailable':
      return 'Il tutor non è raggiungibile in questo momento. Riprova tra poco.'
  }
}

/** Reuses the caller's dialogue session or starts a new one (RLS guarantees ownership). */
async function ensureSession(db: Db, sessionId: string | undefined, topicId: number | undefined): Promise<string> {
  if (sessionId) {
    const { data, error } = await db.from('sessions').select('id, ended_at').eq('id', sessionId).maybeSingle()
    if (error) throw error
    if (!data) throw new HttpError(404, 'session_not_found', 'Sessione non trovata')
    if (data.ended_at) throw new HttpError(409, 'session_ended', 'Questa conversazione è già terminata')
    return data.id
  }
  const { data, error } = await db
    .from('sessions')
    .insert({ kind: 'dialogue', topic_id: topicId ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function saveMistakes(db: Db, sessionId: string, reply: TutorReply): Promise<void> {
  if (!reply.corrections.length) return
  const { error } = await db.from('mistakes').insert(
    reply.corrections.map((c) => ({
      session_id: sessionId,
      original: c.original,
      corrected: c.corrected,
      explanation_it: c.explanation_it,
      category: c.category,
    })),
  )
  if (error) throw error
}

/** Inserts only words the learner does not have yet (vocab is unique per lower(en)). */
async function saveVocab(db: Db, userId: string, reply: TutorReply): Promise<void> {
  if (!reply.new_vocab.length) return
  const words = reply.new_vocab.map((v) => v.en)
  const { data: existing, error } = await db.from('vocab_items').select('en').eq('user_id', userId).in('en', words)
  if (error) throw error
  const known = new Set((existing ?? []).map((v) => v.en.toLowerCase()))
  const fresh = reply.new_vocab.filter((v) => !known.has(v.en))
  if (!fresh.length) return
  const { error: insertError } = await db.from('vocab_items').insert(fresh)
  // 23505: a concurrent request inserted the same word; nothing to do.
  if (insertError && insertError.code !== '23505') throw insertError
}
