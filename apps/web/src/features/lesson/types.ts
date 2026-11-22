// Mirrors supabase/functions/_shared/schemas/lesson.ts (content returned by the `lesson` function).

export interface ComprehensionQuestion {
  question_it: string
  options: string[]
  answer: number
}

export interface LessonContent {
  intro_it: string
  grammar: { explanation_it: string; examples: { en: string; it: string }[] }
  words: { en: string; it: string; example_en: string }[]
  phrases: { en: string; it: string }[]
  idioms: { en: string; it: string; meaning_it: string }[]
  verbs: { base: string; past: string; past_participle: string; it: string }[]
  listening: { text_en: string; questions: ComprehensionQuestion[] }
  reading: { title_en: string; text_en: string; questions: ComprehensionQuestion[] }
  dialogue: { scenario_it: string; opening_en: string }
}

export interface LessonResponse {
  lesson: { id: number; title: string; chapter_id: number }
  content: LessonContent
}

/** A multiple-choice question shown in the lesson; `lang` marks English options. */
export interface QuizQuestion {
  prompt: string
  options: string[]
  answer: number
  optionsLang?: 'en'
}
