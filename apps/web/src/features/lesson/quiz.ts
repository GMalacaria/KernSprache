import { i18n } from '../../i18n'
import type { LessonContent, QuizQuestion } from './types'

/** Deterministic shuffle (so a re-render does not reorder options). */
export function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed || 1
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((v) => {
    const key = v.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Builds a question with the correct option and up to 3 distractors, shuffled. */
export function makeQuestion(
  prompt: string,
  correct: string,
  distractors: string[],
  seed: number,
  optionsLang?: 'en',
  feedback?: QuizQuestion['feedback'],
): QuizQuestion {
  const options = shuffle(unique([correct, ...distractors]).slice(0, 4), seed)
  const answer = options.findIndex((o) => o.trim().toLowerCase() === correct.trim().toLowerCase())
  return { prompt, options, answer, optionsLang, ...(feedback ? { feedback } : {}) }
}

/** "Come si dice ... in inglese?" for every new word, distractors from the other words. */
export function wordQuiz(content: LessonContent): QuizQuestion[] {
  const all = content.words.map((w) => w.en)
  return content.words.map((w, i) =>
    makeQuestion(
      i18n.t('quiz.wordPrompt', { ns: 'lesson', word: w.it }),
      w.en,
      shuffle(
        all.filter((x) => x !== w.en),
        i + 7,
      ),
      i + 1,
      'en',
      { en: w.en, it: w.it },
    ),
  )
}

/** Past simple of each verb; distractors include the typical "-ed" mistake. */
export function verbQuiz(content: LessonContent): QuizQuestion[] {
  return content.verbs.map((v, i) => {
    const others = content.verbs.filter((x) => x.base !== v.base).map((x) => x.past)
    const regularMistake = v.base.endsWith('e') ? `${v.base}d` : `${v.base}ed`
    return makeQuestion(
      i18n.t('quiz.verbPrompt', { ns: 'lesson', verb: v.base, translation: v.it }),
      v.past,
      [regularMistake, v.base, v.past_participle, ...others],
      i + 11,
      'en',
      { en: `${v.base}, ${v.past}, ${v.past_participle}`, it: v.it },
    )
  })
}

/** Meaning of each phrase and idiom, in Italian. */
export function phraseQuiz(content: LessonContent): QuizQuestion[] {
  const phraseMeanings = content.phrases.map((p) => p.it)
  const idiomQuestions = content.idioms.map((idiom, i) =>
    makeQuestion(
      i18n.t('quiz.meaningPrompt', { ns: 'lesson', text: idiom.en }),
      idiom.meaning_it,
      [idiom.it, ...phraseMeanings],
      i + 21,
      undefined,
      { en: idiom.en, it: idiom.meaning_it },
    ),
  )
  const phraseQuestion = content.phrases[0]
    ? [
        makeQuestion(
          i18n.t('quiz.meaningPrompt', { ns: 'lesson', text: content.phrases[0].en }),
          content.phrases[0].it,
          phraseMeanings.slice(1),
          31,
          undefined,
          { en: content.phrases[0].en, it: content.phrases[0].it },
        ),
      ]
    : []
  return [...phraseQuestion, ...idiomQuestions].filter((q) => q.options.length >= 2)
}

/** Comprehension questions as quiz questions. */
export function comprehensionQuiz(questions: LessonContent['listening']['questions']): QuizQuestion[] {
  return questions
    .filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
    .map((q) => ({ prompt: q.question_it, options: q.options, answer: q.answer }))
}

/** Running count of a lesson's answers: total, correct and the longest run of correct answers. */
export interface QuizTally {
  answered: number
  correct: number
  streak: number
  bestStreak: number
}

export const EMPTY_TALLY: QuizTally = { answered: 0, correct: 0, streak: 0, bestStreak: 0 }

export function addAnswer(tally: QuizTally, correct: boolean): QuizTally {
  const streak = correct ? tally.streak + 1 : 0
  return {
    answered: tally.answered + 1,
    correct: tally.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(tally.bestStreak, streak),
  }
}

/** Share of correct answers, 0-100 (100 when there were no questions). */
export function lessonScore(correct: number, answered: number): number {
  return answered === 0 ? 100 : Math.round((correct / answered) * 100)
}
