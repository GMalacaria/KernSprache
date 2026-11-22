import { assertEquals } from 'jsr:@std/assert@1'
import { transcribeRequestSchema } from './transcribe.ts'

Deno.test('transcribe request normalises codec parameters in the mime type', () => {
  const r = transcribeRequestSchema.safeParse({ audio_base64: 'AAAA', mime_type: 'audio/webm;codecs=opus' })
  assertEquals(r.success && r.data.mime_type, 'audio/webm')
})

Deno.test('transcribe request rejects non-audio types and non-base64 data', () => {
  assertEquals(transcribeRequestSchema.safeParse({ audio_base64: 'AAAA', mime_type: 'video/mp4' }).success, false)
  assertEquals(
    transcribeRequestSchema.safeParse({ audio_base64: 'not base64!', mime_type: 'audio/mp4' }).success,
    false,
  )
})
