import { assertEquals } from 'jsr:@std/assert@1'
import { transcribeRequestSchema } from './transcribe.ts'

Deno.test('transcribe request normalises codec parameters in the mime type', () => {
  const r = transcribeRequestSchema.safeParse({
    audio_base64: 'AAAA',
    mime_type: 'audio/webm;codecs=opus',
  })
  assertEquals(r.success && r.data.mime_type, 'audio/webm')
})

Deno.test('transcribe request rejects non-audio types and non-base64 data', () => {
  assertEquals(
    transcribeRequestSchema.safeParse({
      audio_base64: 'AAAA',
      mime_type: 'video/mp4',
    }).success,
    false,
  )
  assertEquals(
    transcribeRequestSchema.safeParse({
      audio_base64: 'not base64!',
      mime_type: 'audio/mp4',
    }).success,
    false,
  )
})

Deno.test('transcribe request: assess defaults to false', () => {
  const r = transcribeRequestSchema.safeParse({
    audio_base64: 'AAAA',
    mime_type: 'audio/webm',
  })
  assertEquals(r.success && r.data.assess, false)
  const on = transcribeRequestSchema.safeParse({
    audio_base64: 'AAAA',
    mime_type: 'audio/webm',
    assess: true,
  })
  assertEquals(on.success && on.data.assess, true)
})

Deno.test('transcribe request: expected_text is optional, trimmed and capped', () => {
  const ok = transcribeRequestSchema.safeParse({
    audio_base64: 'AAAA',
    mime_type: 'audio/webm',
    assess: true,
    expected_text: '  Where were you yesterday?  ',
  })
  assertEquals(ok.success && ok.data.expected_text, 'Where were you yesterday?')
  const none = transcribeRequestSchema.safeParse({ audio_base64: 'AAAA', mime_type: 'audio/webm' })
  assertEquals(none.success && none.data.expected_text, undefined)
  const long = transcribeRequestSchema.safeParse({
    audio_base64: 'AAAA',
    mime_type: 'audio/webm',
    expected_text: 'a'.repeat(301),
  })
  assertEquals(long.success, false)
})
