import { describe, expect, it } from 'vitest'
import { containsSpeech, endOfSpeech, meterFill, READING_MS, SPEECH_MOMENTS, SPEECH_RMS } from './speechLevel'

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

describe('endOfSpeech', () => {
  const silence = (ms: number) => Array<number>(ms / READING_MS).fill(0.003)
  const speech = (ms: number) => Array<number>(ms / READING_MS).fill(SPEECH_RMS * 4)

  it('waits while the learner has not said anything yet', () => {
    expect(endOfSpeech(silence(10_000), 2000)).toBe(false)
  })
  it('keeps recording during a short pause between words', () => {
    expect(endOfSpeech([...speech(1000), ...silence(1500)], 2000)).toBe(false)
  })
  it('keeps recording while the learner is still speaking', () => {
    expect(endOfSpeech([...silence(500), ...speech(3000)], 2000)).toBe(false)
  })
  it('ends after speech followed by the whole pause', () => {
    expect(endOfSpeech([...silence(500), ...speech(1000), ...silence(2000)], 2000)).toBe(true)
  })
  it('does not take a click followed by silence for speech', () => {
    expect(endOfSpeech([...silence(500), 0.3, 0.2, ...silence(3000)], 2000)).toBe(false)
  })
})

describe('meterFill', () => {
  it('stays within 0 and 1', () => {
    expect(meterFill(0)).toBe(0)
    expect(meterFill(-1)).toBe(0)
    expect(meterFill(5)).toBe(1)
  })
  it('shows quiet speech clearly', () => {
    expect(meterFill(SPEECH_RMS)).toBeGreaterThan(0.2)
  })
})
