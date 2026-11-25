// Versioned prompts: change the text => bump the version (it is logged in ai_usage).
// v2 / pronunciation.v3: the language pair comes from the backend; pronunciation tips are about the sounds of the
// studied language, explained to a speaker of the native one.
import type { PairNames } from '../languages.ts'

export const TRANSCRIBE_PROMPT_VERSION = 'transcribe.v2'
export const PRONUNCIATION_PROMPT_VERSION = 'pronunciation.v3'

export { NO_SPEECH_MARKER } from './transcribe.v1.ts'
import { NO_SPEECH_MARKER } from './transcribe.v1.ts'

export function transcribePrompt({ native, target }: PairNames): string {
  return `Transcribe this recording of a ${native} learner speaking ${target}.

- Write exactly what was said, word for word, in the normal spelling of ${target} (accents included). Keep every grammar, vocabulary and word-order mistake as spoken: the transcript is used to correct the learner, so never fix, improve or complete anything.
- If the learner says a word in ${native}, write it as spoken.
- Leave out hesitations such as "uh", "um", "ehm".
- Use normal punctuation and capitalisation.
- Reply with the transcript only, no quotes and no comments.
- If there is no intelligible speech, reply with exactly: ${NO_SPEECH_MARKER}`
}

function basePronunciationPrompt({ native, target }: PairNames): string {
  return `You listen to a recording of a ${native} learner speaking ${target}.
Do two things and reply with JSON only, in exactly this shape:
{"transcript": string, "pronunciation": null | {"score": integer 0-100, "words": [{"word": string, "tip_it": string}], "feedback_it": string}}
(The field names ending in "_it" are historical: they hold ${native} text.)

transcript
- Write exactly what was said, word for word, in the normal spelling of ${target}. Keep every grammar, vocabulary and word-order mistake as spoken: never fix, improve or complete anything.
- Leave out hesitations such as "uh", "um", "ehm". Use normal punctuation and capitalisation.
- If there is no intelligible speech, use an empty string "" and set pronunciation to null.

pronunciation
- Judge only how the words SOUND, never the grammar or the vocabulary.
- score: 90-100 clear and natural, 70-89 easy to understand with small slips, 50-69 understandable with effort, below 50 hard to understand. Be honest: do not inflate the score to please the learner.
- words: at most 3 words that were mispronounced, most important first, each with the word as written and tip_it, one short sentence in ${native} saying what to change, about the sounds of ${target} that are hard for ${native} speakers (for example a sound that does not exist in ${native}, a short vs long vowel, a nasal or rounded vowel, the stressed syllable, a final consonant or ending that must be heard or stay silent). Leave the array empty when nothing needs work.
- feedback_it: one or two short sentences in ${native}: what is working and the one thing to focus on next. No generic praise.
- If the learner says fewer than 3 words, set pronunciation to null: there is too little to judge.`
}

/** With `expectedText` the learner was reading that sentence aloud and is judged against it (as in v2). */
export function pronunciationPrompt(
  names: PairNames,
  expectedText?: string,
): string {
  const base = basePronunciationPrompt(names)
  if (!expectedText) return base
  return `${base}

The learner was asked to read this sentence aloud: ${JSON.stringify(expectedText)}
- The transcript must be what you actually hear, word for word. Never copy it from the sentence above and never fix it to match: if the learner said a different word or form, write what they said.
- Judge the pronunciation against that sentence: a word that is missing, replaced or unclear counts as a mistake, and a word read well is not a mistake. List a replaced or missing word first in "words", with a tip_it that says which word was expected.
- A missing or replaced word caps the score at 75, and more than one caps it at 60. Do not give above 85 unless every word was clear.
- feedback_it names the one thing to fix; no generic praise.
- With a known sentence, do not return null for a short reading: judge it, even if it is one or two words.`
}
