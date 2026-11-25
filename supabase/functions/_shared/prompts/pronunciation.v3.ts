// Versioned prompt: change the text => bump the version (it is logged in ai_usage).
// v3: a recording with no speech gets no transcript and no grade, even when a sentence was expected.
// With v2 the model filled a silent recording with the expected sentence and gave it full marks.
import { pronunciationPrompt as pronunciationPromptV2 } from './pronunciation.v2.ts'

export const PRONUNCIATION_PROMPT_VERSION = 'pronunciation.v3'

export const SILENCE_RULE = `
Silence and noise
- First decide whether the recording contains a human voice speaking words. If it holds only silence, breathing, background noise, music or clicks, the transcript MUST be "" and pronunciation MUST be null.
- Never write in the transcript a word you did not hear. In particular never copy or complete the expected sentence: the sentence tells you what the learner should say, not what they said.
- This rule comes before every other one: with no speech there is nothing to judge, so no score, not even for a short or missing reading.`

export function pronunciationPrompt(expectedText?: string): string {
  return `${pronunciationPromptV2(expectedText)}
${SILENCE_RULE}`
}
