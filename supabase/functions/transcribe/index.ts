// transcribe: speech-to-text for the oral dialogue. Receives a short recording
// (base64) and returns the learner's words verbatim, mistakes included.
import { logAiUsage } from '../_shared/ai-usage.ts'
import { AiError } from '../_shared/ai/index.ts'
import { getTranscriber } from '../_shared/ai/transcriber.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { TRANSCRIBE_PROMPT_VERSION } from '../_shared/prompts/transcribe.v1.ts'
import { transcribeRequestSchema } from '../_shared/schemas/transcribe.ts'
import { requireUserId, userClient } from '../_shared/supabase.ts'

const FUNCTION_NAME = 'transcribe'

Deno.serve(
  handle(async (req) => {
    const userId = await requireUserId(userClient(req))

    const body = transcribeRequestSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) throw new HttpError(400, 'bad_request', 'Registrazione non valida o troppo lunga')

    let transcript
    try {
      transcript = await getTranscriber().transcribe({ data: body.data.audio_base64, mimeType: body.data.mime_type })
    } catch (err) {
      if (err instanceof AiError) {
        if (err.usage && err.model) {
          await logAiUsage({
            userId,
            functionName: FUNCTION_NAME,
            promptVersion: TRANSCRIBE_PROMPT_VERSION,
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
      promptVersion: TRANSCRIBE_PROMPT_VERSION,
      model: transcript.model,
      usage: transcript.usage,
    })

    if (!transcript.text) {
      throw new HttpError(422, 'no_speech', 'Non ho sentito niente. Avvicina il telefono e riprova.')
    }
    return json({ text: transcript.text })
  }),
)
