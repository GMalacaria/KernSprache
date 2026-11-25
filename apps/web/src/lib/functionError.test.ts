import { FunctionsHttpError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { functionErrorMessage } from './functionError'

function httpError(body: unknown): FunctionsHttpError {
  return new FunctionsHttpError(new Response(JSON.stringify(body), { status: 409 }))
}

describe('functionErrorMessage', () => {
  it('translates known codes from the catalog', async () => {
    const error = httpError({ error: { code: 'already_passed', message: 'whatever' } })
    expect(await functionErrorMessage(error, 'fallback')).toBe('Hai già superato la verifica di questo capitolo.')
  })

  it('uses the fallback for AI failures and unknown codes', async () => {
    expect(await functionErrorMessage(httpError({ error: { code: 'ai_timeout', message: 'x' } }), 'fallback')).toBe('fallback')
    expect(await functionErrorMessage(httpError({ error: { code: 'something_new' } }), 'fallback')).toBe('fallback')
  })

  it('uses the fallback for network errors and non-JSON bodies', async () => {
    expect(await functionErrorMessage(new Error('offline'), 'fallback')).toBe('fallback')
    const notJson = new FunctionsHttpError(new Response('oops', { status: 500 }))
    expect(await functionErrorMessage(notJson, 'fallback')).toBe('fallback')
  })
})
