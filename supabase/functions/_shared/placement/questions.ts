import type { LanguageCode } from '../languages.ts'
import { DE_QUESTIONS } from './questions/de.ts'
import { EN_QUESTIONS } from './questions/en.ts'
import { ES_QUESTIONS } from './questions/es.ts'
import { FR_QUESTIONS } from './questions/fr.ts'

// Fixed placement-test banks, one per studied language: 4 questions per level, authored and reviewed (not generated
// at run time) so the result is comparable over time. Answers never leave the server.

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export interface WrittenQuestion {
  id: string
  level: CefrLevel
  /** Sentence with a gap (___) or a question, in the studied language. */
  prompt: string
  options: [string, string, string, string]
  answer: 0 | 1 | 2 | 3
}

export const WRITTEN_QUESTIONS_BY_LANGUAGE: Record<StudiedLanguage, WrittenQuestion[]> = {
  en: EN_QUESTIONS,
  fr: FR_QUESTIONS,
  es: ES_QUESTIONS,
  de: DE_QUESTIONS,
}

/** The English bank, as before languages existed (tests and older callers). */
export const WRITTEN_QUESTIONS = EN_QUESTIONS

export type StudiedLanguage = Exclude<LanguageCode, 'it'>

/** The bank of a studied language; null for a language that is only a native one. */
export function writtenQuestions(language: LanguageCode): WrittenQuestion[] | null {
  return language === 'it' ? null : WRITTEN_QUESTIONS_BY_LANGUAGE[language]
}

export interface OralPrompt {
  id: string
  level: CefrLevel
  /** Instruction in the native language (Italian for now); the learner answers in the studied language. */
  prompt_it: string
}

export const ORAL_PROMPTS: OralPrompt[] = [
  { id: 'oral-a1', level: 'A1', prompt_it: 'Presentati: come ti chiami, da dove vieni e cosa ti piace fare?' },
  { id: 'oral-a2', level: 'A2', prompt_it: 'Racconta cosa hai fatto lo scorso fine settimana.' },
  {
    id: 'oral-b1',
    level: 'B1',
    prompt_it: 'Parla di un viaggio o di un progetto che vuoi fare in futuro, e spiega perché.',
  },
  {
    id: 'oral-b2',
    level: 'B2',
    prompt_it: 'Secondo te è meglio vivere in città o in campagna? Spiega la tua opinione con qualche argomento.',
  },
]
