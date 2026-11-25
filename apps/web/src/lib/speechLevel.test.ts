import { describe, expect, it } from 'vitest'
import { containsSpeech, SPEECH_MOMENTS, SPEECH_RMS } from './speechLevel'

describe('containsSpeech', () => {
  it('treats silence and room noise as no speech', () => {
    expect(containsSpeech([])).toBe(false)
    expect(containsSpeech(Array(200).fill(0.004))).toBe(false)
  })
  it('ignores a single click or bump', () => {
    expect(containsSpeech([...Array(100).fill(0.003), 0.3, 0.2, ...Array(100).fill(0.003)])).toBe(false)
  })
  it('recognises a short spoken word', () => {
    expect(containsSpeech([...Array(20).fill(0.003), ...Array(SPEECH_MOMENTS).fill(SPEECH_RMS * 3)])).toBe(true)
  })
})
