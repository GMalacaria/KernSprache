// Versioned prompt: change the text => bump the version (it is logged in ai_usage).
import { PRONUNCIATION_PROMPT } from './pronunciation.v1.ts'

export const PRONUNCIATION_PROMPT_VERSION = 'pronunciation.v2'

/**
 * The assessment prompt of v1, plus (when the learner was asked to read a known sentence aloud) that sentence:
 * the judgement is then made against it, so a missed or replaced word counts as a mistake.
 */
export function pronunciationPrompt(expectedText?: string): string {
  if (!expectedText) return PRONUNCIATION_PROMPT
  return `${PRONUNCIATION_PROMPT}

The learner was asked to read this sentence aloud: ${JSON.stringify(expectedText)}
- The transcript must be what you actually hear, word for word. Never copy it from the sentence above and never fix it to match: if the learner said "was" where the sentence has "were", write "was".
- Judge the pronunciation against that sentence: a word that is missing, replaced or unclear counts as a mistake, and a word read well is not a mistake. List a replaced or missing word first in "words", with a tip_it that says which word was expected.
- A missing or replaced word caps the score at 75, and more than one caps it at 60. Do not give above 85 unless every word was clear.
- feedback_it names the one thing to fix; no generic praise such as "continua così" or "ottimo lavoro".
- With a known sentence, do not return null for a short reading: judge it, even if it is one or two words.`
}
