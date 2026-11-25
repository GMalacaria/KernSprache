// speak: reads text aloud (in the language of the request, or the learner's active one) with a Gemini voice. Each (voice, sentence) is
// generated once and kept in a private storage bucket (tts_cache), so a sentence
// that comes back is served from the cache without calling the model again.
// Returns the path (with a short-lived token) of the WAV file.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError } from '../_shared/ai/index.ts'
import { DEFAULT_VOICE, getSpeaker, ttsKey } from '../_shared/ai/tts.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { TTS_PROMPT_VERSION } from '../_shared/prompts/tts.v1.ts'
import type { LanguageCode } from '../_shared/languages.ts'
import { speakRequestSchema } from '../_shared/schemas/speak.ts'
import { adminClient, type Db, requireApprovedUser, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'speak'
const BUCKET = 'tts'
const URL_TTL_SECONDS = 3600

Deno.serve(
  handle(async (req) => {
    const db = userClient(req)
    const userId = await requireApprovedUser(db)

    const body = speakRequestSchema.safeParse(
      await req.json().catch(() => null),
    )
    if (!body.success) {
      throw new HttpError(
        400,
        'bad_request',
        'Testo non valido o troppo lungo',
      )
    }
    const text = body.data.text

    const admin = adminClient()
    const voice = Deno.env.get('AI_TTS_VOICE') || DEFAULT_VOICE
    const language = body.data.language ?? (await activeLanguage(db, userId))
    const key = await ttsKey(voice, text, language)

    const { data: cached, error: cacheError } = await admin.from('tts_cache')
      .select('path').eq('key', key)
      .maybeSingle()
    if (cacheError) throw cacheError
    let path = cached?.path

    if (!path) {
      let speech
      try {
        speech = await getSpeaker().speak(text)
      } catch (err) {
        if (err instanceof AiError) {
          if (err.usage && err.model) {
            await logAiUsage({
              userId,
              functionName: FUNCTION_NAME,
              promptVersion: TTS_PROMPT_VERSION,
              model: err.model,
              usage: err.usage,
            })
          }
          throw new HttpError(
            502,
            `ai_${err.code}`,
            'Non riesco a generare la voce adesso.',
          )
        }
        throw err
      }
      await logAiUsage({
        userId,
        functionName: FUNCTION_NAME,
        promptVersion: TTS_PROMPT_VERSION,
        model: speech.model,
        usage: speech.usage,
      })

      path = `${key}.wav`
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(
        path,
        speech.wav,
        {
          contentType: 'audio/wav',
          upsert: true,
        },
      )
      if (uploadError) throw uploadError
      const { error: insertError } = await admin.from('tts_cache').upsert({
        key,
        text,
        voice,
        path,
        language,
      })
      if (insertError) throw insertError
    }

    const { data: signed, error: signError } = await admin.storage.from(BUCKET)
      .createSignedUrl(
        path,
        URL_TTL_SECONDS,
      )
    if (signError || !signed) {
      throw signError ??
        new HttpError(500, 'sign_failed', 'Audio non disponibile')
    }
    // Only the path: inside the functions runtime the host is an internal one, so the app
    // adds its own Supabase URL in front.
    const url = new URL(signed.signedUrl)
    return json({ path: url.pathname + url.search })
  }),
)

async function activeLanguage(db: Db, userId: string): Promise<LanguageCode> {
  const { data, error } = await db.from('profiles').select('active_language')
    .eq('id', userId).single()
  if (error) throw error
  return data.active_language
}
