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
  optionsStudied = false,
  feedback?: QuizQuestion['feedback'],
): QuizQuestion {
  const options = shuffle(unique([correct, ...distractors]).slice(0, 4), seed)
  const answer = options.findIndex((o) => o.trim().toLowerCase() === correct.trim().toLowerCase())
  return { prompt, options, answer, ...(optionsStudied ? { optionsStudied } : {}), ...(feedback ? { feedback } : {}) }
}

/** "How do you say ...?" for every new word, distractors from the other words. */
export function wordQuiz(content: LessonContent): QuizQuestion[] {
  const all = content.words.map((w) => w.term)
  return content.words.map((w, i) =>
    makeQuestion(
      i18n.t('quiz.wordPrompt', { ns: 'lesson', word: w.translation }),
      w.term,
      shuffle(
        all.filter((x) => x !== w.term),
        i + 7,
      ),
      i + 1,
      true,
      { text: w.term, translation: w.translation },
    ),
  )
}

/**
 * The second form of each verb, with the others shown around the gap ("go · ___ · gone"): it works for every
 * language, whatever its forms are. Verbs with a single form are skipped.
 */
export function verbQuiz(content: LessonContent): QuizQuestion[] {
  return content.verbs.flatMap((v, i) => {
    const [first, second] = v.forms
    if (first === undefined || second === undefined) return []
    const others = content.verbs.filter((x) => x !== v).map((x) => x.forms[1] ?? '')
    const shown = v.forms.map((form, index) => (index === 1 ? '___' : form)).join(' · ')
    return [
      makeQuestion(
        i18n.t('quiz.verbPrompt', { ns: 'lesson', forms: shown, translation: v.translation }),
        second,
        [...v.forms.filter((_, index) => index !== 1), ...others],
        i + 11,
        true,
        { text: v.forms.join(' · '), translation: v.translation },
      ),
    ]
  })
}

/** Meaning of each phrase and idiom, in the native language. */
export function phraseQuiz(content: LessonContent): QuizQuestion[] {
  const phraseMeanings = content.phrases.map((p) => p.translation)
  const idiomQuestions = content.idioms.map((idiom, i) =>
    makeQuestion(
      i18n.t('quiz.meaningPrompt', { ns: 'lesson', text: idiom.text }),
      idiom.meaning,
      [idiom.literal, ...phraseMeanings],
      i + 21,
      undefined,
      { text: idiom.text, translation: idiom.meaning },
    ),
  )
  const phraseQuestion = content.phrases[0]
    ? [
        makeQuestion(
          i18n.t('quiz.meaningPrompt', { ns: 'lesson', text: content.phrases[0].text }),
          content.phrases[0].translation,
          phraseMeanings.slice(1),
          31,
          undefined,
          content.phrases[0],
        ),
      ]
    : []
  return [...phraseQuestion, ...idiomQuestions].filter((q) => q.options.length >= 2)
}

/** Comprehension questions as quiz questions. */
export function comprehensionQuiz(questions: LessonContent['listening']['questions']): QuizQuestion[] {
  return questions
    .filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
    .map((q) => ({ prompt: q.question, options: q.options, answer: q.answer }))
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
