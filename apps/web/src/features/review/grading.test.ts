import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { editDistance, gradeAnswer, gradePronunciation, matchTranslation, normalizeItalian, translationVariants } from './grading'

describe('normalizeItalian', () => {
  it.each([
    ['La Casa', 'casa'],
    ["l'acqua", 'acqua'],
    ['Perché?', 'perche'],
    ['prenotare (un tavolo)', 'prenotare'],
    ['la', 'la'],
  ])('%s -> %s', (input, output) => {
    expect(normalizeItalian(input)).toBe(output)
  })
})

describe('matchTranslation', () => {
  it('accepts the stored translation with or without article, case and accents', () => {
    expect(matchTranslation('la casa', 'Casa')).toBe('exact')
    expect(matchTranslation('perché', 'perche')).toBe('exact')
  })

  it('accepts any of the variants separated by / , ;', () => {
    expect(translationVariants('andare / camminare')).toEqual(['andare camminare', 'andare', 'camminare'])
    expect(matchTranslation('andare / camminare', 'camminare')).toBe('exact')
    expect(matchTranslation('grande, enorme', 'enorme')).toBe('exact')
  })

  it('tolerates small typos in longer words only', () => {
    expect(matchTranslation('cucina', 'cucna')).toBe('typo')
    expect(matchTranslation('appuntamento', 'apuntamendo')).toBe('typo')
    expect(matchTranslation('sole', 'sale')).toBe('typo')
    expect(matchTranslation('re', 'te')).toBe('none')
  })

  it('rejects other words and empty answers', () => {
    expect(matchTranslation('casa', 'abitazione')).toBe('none')
    expect(matchTranslation('casa', '  ')).toBe('none')
  })
})

describe('editDistance', () => {
  it('counts insertions, deletions and substitutions', () => {
    expect(editDistance('casa', 'casa')).toBe(0)
    expect(editDistance('casa', 'cassa')).toBe(1)
    expect(editDistance('casa', 'cosa')).toBe(1)
    expect(editDistance('', 'abc')).toBe(3)
  })
})

describe('gradeAnswer', () => {
  const base = { wrongAttempts: 0, correct: true, exact: true, seconds: 5, kind: 'vocab' as const }
  it('is Easy when right at once, exactly and quickly', () => {
    expect(gradeAnswer(base)).toBe(Rating.Easy)
  })
  it('is Good when right at once but slow, with a typo or a synonym', () => {
    expect(gradeAnswer({ ...base, seconds: 20 })).toBe(Rating.Good)
    expect(gradeAnswer({ ...base, exact: false })).toBe(Rating.Good)
    expect(gradeAnswer({ ...base, kind: 'sentence', seconds: 20 })).toBe(Rating.Easy)
  })
  it('is Hard at the second try and Again after that or when the solution was shown', () => {
    expect(gradeAnswer({ ...base, wrongAttempts: 1 })).toBe(Rating.Hard)
    expect(gradeAnswer({ ...base, wrongAttempts: 2 })).toBe(Rating.Again)
    expect(gradeAnswer({ ...base, correct: false })).toBe(Rating.Again)
  })
})

describe('gradePronunciation', () => {
  it.each([
    [95, Rating.Easy],
    [90, Rating.Easy],
    [80, Rating.Good],
    [60, Rating.Hard],
    [40, Rating.Again],
  ])('score %i -> grade %i', (score, grade) => {
    expect(gradePronunciation(score)).toBe(grade)
  })
})
