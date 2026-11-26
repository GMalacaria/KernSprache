// transcribe: speech-to-text for the oral dialogue. Receives a short recording
// (base64) and returns the learner's words verbatim, mistakes included. With
// `assess` it also rates the pronunciation, from the same recording and model call.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError } from '../_shared/ai/index.ts'
import { savePronunciationCards } from '../_shared/pronunciation-cards.ts'
import { getTranscriber } from '../_shared/ai/transcriber.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { loadLearner, pairNames } from '../_shared/languages.ts'
import { PRONUNCIATION_PROMPT_VERSION, TRANSCRIBE_PROMPT_VERSION } from '../_shared/prompts/transcribe.v2.ts'
import { guessSource, transcribeRequestSchema } from '../_shared/schemas/transcribe.ts'
import { type Db, requireApprovedUser, userClient } from '../_shared/supabase.ts'
import type { Database } from '../_shared/database.types.ts'

const FUNCTION_NAME = 'transcribe'

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireApprovedUser(db)

    const body = transcribeRequestSchema.safeParse(
      await req.json().catch(() => null),
    )
    if (!body.success) {
      throw new HttpError(
        400,
        'bad_request',
        'Registrazione non valida o troppo lunga',
      )
    }

    const { pair } = await loadLearner(db, userId, body.data.language)
    const names = pairNames(pair)
    const promptVersion = body.data.assess ? PRONUNCIATION_PROMPT_VERSION : TRANSCRIBE_PROMPT_VERSION
    const audio = {
      data: body.data.audio_base64,
      mimeType: body.data.mime_type,
    }
    let transcript
    try {
      transcript = body.data.assess ? await getTranscriber().assess(audio, names, body.data.expected_text) : {
        ...(await getTranscriber().transcribe(audio, names)),
        pronunciation: null,
      }
    } catch (err) {
      if (err instanceof AiError) {
        if (err.usage && err.model) {
          await logAiUsage({
            userId,
            functionName: FUNCTION_NAME,
            promptVersion,
            model: err.model,
            usage: err.usage,
          })
        }
        throw new HttpError(
          502,
          `ai_${err.code}`,
          'Non riesco a trascrivere adesso. Riprova tra poco o scrivi il messaggio.',
        )
      }
      throw err
    }

    await logAiUsage({
      userId,
      functionName: FUNCTION_NAME,
      promptVersion,
      model: transcript.model,
      usage: transcript.usage,
    })

    if (!transcript.text) {
      throw new HttpError(
        422,
        'no_speech',
        'Non ho sentito niente. Avvicina il telefono e riprova.',
      )
    }
    if (body.data.assess && transcript.pronunciation) {
      await savePronunciationResult(db, {
        language: pair.target,
        source: body.data.source ?? guessSource(body.data),
        expected_text: body.data.expected_text ?? null,
        transcript: transcript.text,
        score: transcript.pronunciation.score,
        words: transcript.pronunciation.words,
      })
    }
    if (body.data.assess && body.data.save_mistakes) {
      await savePronunciationCards(
        db,
        userId,
        transcript.pronunciation,
        pair.target,
      )
    }
    return json({
      text: transcript.text,
      pronunciation: transcript.pronunciation,
    })
  }),
)

type PronunciationResult = Omit<Database['public']['Tables']['pronunciation_results']['Insert'], 'user_id'>

/** Keeps every judged recording for the profile. Never throws: the learner still gets the transcript. */
async function savePronunciationResult(db: Db, result: PronunciationResult): Promise<void> {
  const { error } = await db.from('pronunciation_results').insert(result)
  if (error) console.error('Failed to save the pronunciation result', error)
}
