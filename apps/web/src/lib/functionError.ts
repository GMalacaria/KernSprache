import { FunctionsHttpError } from '@supabase/supabase-js'
import { i18n } from '../i18n'
import { resources } from '../i18n/resources'

type ServerErrorCode = keyof (typeof resources)['it']['common']['serverErrors']

function isServerErrorCode(code: string): code is ServerErrorCode {
  return Object.hasOwn(resources.it.common.serverErrors, code)
}

/** The `{ error: { code } }` an Edge Function puts in its error responses, if any. */
export async function functionErrorCode(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null
  const payload: unknown = await (error.context as Response).json().catch(() => null)
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return null
  const e = payload.error
  return e && typeof e === 'object' && 'code' in e && typeof e.code === 'string' ? e.code : null
}

/**
 * Message in the interface language for a failed function call. The functions send a stable `code`: known codes
 * come from the catalog; the rest (AI failures `ai_*`, unknown codes, network errors) get the caller's `fallback`,
 * which says what was being done.
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const code = await functionErrorCode(error)
  return code && isServerErrorCode(code) ? i18n.t(`serverErrors.${code}`) : fallback
}
