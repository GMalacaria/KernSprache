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
- The transcript is still exactly what was said, not the sentence above.
- Judge the pronunciation against that sentence: a word that is missing, replaced or unclear counts as a mistake, and a word read well is not a mistake.
- With a known sentence, do not return null for a short reading: judge it, even if it is one or two words.`
}
