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
  /** In the learner's native language. */
  explanation: string
  category: MistakeCategory
}

export interface VocabEntry {
  /** In the studied language. */
  term: string
  translation: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorChatRequest {
  session_id?: string
  lesson_id?: number
  messages: ChatMessage[]
  /** How the learner wrote the last message: a voice message is its transcript. */
  input?: 'text' | 'voice'
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
  words: { word: string; tip: string }[]
  feedback: string
}

/** A message as shown in the UI: user turns carry the corrections they received. */
export interface DialogueTurn extends ChatMessage {
  id: string
  corrections?: Correction[]
  newVocab?: VocabEntry[]
  /** Spoken turns only: how the learner sounded. */
  pronunciation?: Pronunciation
}
