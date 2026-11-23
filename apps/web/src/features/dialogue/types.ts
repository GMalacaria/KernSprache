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

/** A message as shown in the UI: user turns carry the corrections they received. */
export interface DialogueTurn extends ChatMessage {
  id: string
  corrections?: Correction[]
  newVocab?: VocabEntry[]
}
