import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { TutorChatRequest, TutorChatResponse } from './types'

const FALLBACK_ERROR = 'Il tutor non ha risposto. Riprova tra poco.'

/** Reads the Italian message the function puts in `{ error: { message } }`. */
async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await (error.context as Response).json()
      if (
        body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' &&
        'message' in body.error && typeof body.error.message === 'string'
      ) {
        return body.error.message
      }
    } catch {
      // Not JSON: fall through.
    }
  }
  return FALLBACK_ERROR
}

export async function sendTutorTurn(request: TutorChatRequest): Promise<TutorChatResponse> {
  const { data, error } = await supabase.functions.invoke<TutorChatResponse>('tutor-chat', { body: request })
  if (error) throw new Error(await errorMessage(error))
  if (!data) throw new Error(FALLBACK_ERROR)
  return data
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}
