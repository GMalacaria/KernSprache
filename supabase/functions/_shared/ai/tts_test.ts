import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1'
import { pcmToWav, ttsKey } from './tts.ts'

Deno.test('pcmToWav: 44-byte header followed by the samples', () => {
  const pcm = new Uint8Array([1, 2, 3, 4])
  const wav = pcmToWav(pcm, 24_000)
  assertEquals(wav.length, 48)
  assertEquals(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF')
  assertEquals(new TextDecoder().decode(wav.slice(8, 12)), 'WAVE')
  const view = new DataView(wav.buffer)
  assertEquals(view.getUint32(4, true), 40) // file size - 8
  assertEquals(view.getUint16(22, true), 1) // mono
  assertEquals(view.getUint32(24, true), 24_000) // sample rate
  assertEquals(view.getUint32(40, true), 4) // data length
  assertEquals([...wav.slice(44)], [1, 2, 3, 4])
})

Deno.test('ttsKey: stable, and different for another voice or sentence', async () => {
  const a = await ttsKey('Kore', 'Where were you?')
  assertEquals(a, await ttsKey('Kore', 'Where were you?'))
  assertEquals(a.length, 64)
  assertNotEquals(a, await ttsKey('Puck', 'Where were you?'))
  assertNotEquals(a, await ttsKey('Kore', 'Where was you?'))
})
