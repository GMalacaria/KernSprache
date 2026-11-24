// Mirrors supabase/functions/_shared/schemas/tutor-chat.ts (request/response of tutor-chat).

export type MistakeCategory =
  | 'verb_tense'
  | 'article'
  | 'preposition'
  | 'word_order'
  | 'vocabulary'
  | 'spelling'
  | 'other'

export interface Correction {
  original: string
  corrected: string
  explanation_it: string
  category: MistakeCategory
}

export interface VocabEntry {
  en: string
  it: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorChatRequest {
  session_id?: string
  lesson_id?: number
  messages: ChatMessage[]
}

export interface TutorChatResponse {
  session_id: string
  reply: string
  corrections: Correction[]
  new_vocab: VocabEntry[]
}

/** Mirrors supabase/functions/_shared/schemas/pronunciation.ts. */
export interface Pronunciation {
  score: number
  words: { word: string; tip_it: string }[]
  feedback_it: string
}

/** A message as shown in the UI: user turns carry the corrections they received. */
export interface DialogueTurn extends ChatMessage {
  id: string
  corrections?: Correction[]
  newVocab?: VocabEntry[]
  /** Spoken turns only: how the learner sounded. */
  pronunciation?: Pronunciation
}
