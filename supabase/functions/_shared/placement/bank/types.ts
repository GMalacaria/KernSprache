import type { CefrLevel } from '../questions.ts'

// Skill-tagged placement bank for the adaptive test. Authored and reviewed once per language (never generated at run
// time), so levels are reliable and the adaptive engine can trust them. Answers and listening scripts never leave the
// server.

/** What a question measures. Writing and speaking are assessed by the AI in the production phase, not from the bank. */
export const BANK_SKILLS = ['grammar', 'vocabulary', 'reading', 'listening'] as const
export type BankSkill = (typeof BANK_SKILLS)[number]

/** Skills measured on a passage (a text to read or an audio script to listen to) with questions about it. */
export type PassageSkill = Extract<BankSkill, 'reading' | 'listening'>

/** Topic areas of vocabulary, reading and listening items: they say which words a vocabulary gap is about. */
export const VOCAB_DOMAINS = [
  'everyday',
  'food',
  'home',
  'people',
  'travel',
  'money',
  'health',
  'work',
  'feelings',
  'media',
  'society',
  'nature',
] as const
export type VocabDomain = (typeof VOCAB_DOMAINS)[number]

/** A grammar topic and the curriculum lesson that teaches it: a mistake on the topic becomes that lesson. */
export interface GrammarTopic {
  level: CefrLevel
  /** Chapter slug in the language's curriculum. */
  chapter: string
  /** Lesson slug inside that chapter. */
  lesson: string
}

export interface BankQuestion {
  id: string
  skill: BankSkill
  level: CefrLevel
  /** A grammar topic id for grammar questions, a vocabulary domain for the others. */
  topic: string
  /** Grammar and vocabulary: a sentence with a gap (___). Reading and listening: a question about the passage. */
  prompt: string
  options: [string, string, string, string]
  answer: 0 | 1 | 2 | 3
  /** Reading and listening only: the passage the question is about. */
  passage?: string
  /** The sentence that shows the answer (the completed gap, or the line of the passage), shown after the test. */
  sentence: string
  /** The sentence in the native language. */
  translation: string
}

export interface BankPassage {
  id: string
  skill: PassageSkill
  level: CefrLevel
  topic: VocabDomain
  /** The text to read, or the script the server turns into audio (never sent to the client for listening). */
  text: string
}

export interface PlacementBank {
  grammarTopics: Record<string, GrammarTopic>
  questions: BankQuestion[]
  passages: BankPassage[]
}
