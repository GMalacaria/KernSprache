// Mirrors supabase/functions/_shared/schemas/lesson.ts (content returned by the `lesson` function).
// Studied language: text, term, example, forms, title, opening; native language: translation, literal, meaning,
// intro, explanation, question, scenario.

/** A sentence or expression in the studied language with its translation in the native one. */
export interface Translated {
  text: string
  translation: string
}

export interface ComprehensionQuestion {
  question: string
  options: string[]
  answer: number
}

export interface LessonContent {
  intro: string
  grammar: { explanation: string; examples: Translated[] }
  words: { term: string; translation: string; example: string }[]
  phrases: Translated[]
  idioms: { text: string; literal: string; meaning: string }[]
  /** The forms learners memorise, dictionary form first. */
  verbs: { forms: string[]; translation: string }[]
  listening: { text: string; questions: ComprehensionQuestion[] }
  reading: { title: string; text: string; questions: ComprehensionQuestion[] }
  dialogue: { scenario: string; opening: string }
}

export interface LessonResponse {
  lesson: { id: number; title: string; chapter_id: number }
  content: LessonContent
}

/** A multiple-choice question shown in the lesson; `optionsStudied` marks options in the studied language. */
export interface QuizQuestion {
  prompt: string
  options: string[]
  answer: number
  optionsStudied?: boolean
  /** Sentence in the studied language and its translation, shown (and read aloud) after answering. */
  feedback?: Translated
}
