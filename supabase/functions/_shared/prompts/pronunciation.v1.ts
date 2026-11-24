// Versioned prompt: change the text => bump the version (it is logged in ai_usage).
export const PRONUNCIATION_PROMPT_VERSION = 'pronunciation.v1'

export const PRONUNCIATION_PROMPT = `You listen to a recording of an Italian learner speaking English.
Do two things and reply with JSON only, in exactly this shape:
{"transcript": string, "pronunciation": null | {"score": integer 0-100, "words": [{"word": string, "tip_it": string}], "feedback_it": string}}

transcript
- Write exactly what was said, word for word. Keep every grammar, vocabulary and word-order mistake as spoken: never fix, improve or complete anything.
- Leave out hesitations such as "uh", "um", "ehm". Use normal punctuation and capitalisation.
- If there is no intelligible speech, use an empty string "" and set pronunciation to null.

pronunciation
- Judge only how the words SOUND, never the grammar or the vocabulary.
- score: 90-100 clear and natural, 70-89 easy to understand with small slips, 50-69 understandable with effort, below 50 hard to understand. Be honest: do not inflate the score to please the learner.
- words: at most 3 words that were mispronounced, most important first, each with the word as written and tip_it, one short sentence in Italian saying what to change (for example the "th" sound, the English "h", the final consonant, a short vs long vowel, the stressed syllable, the "-ed" ending). Leave the array empty when nothing needs work.
- feedback_it: one or two short sentences in Italian: what is working and the one thing to focus on next. No generic praise.
- If the learner says fewer than 3 words, set pronunciation to null: there is too little to judge.`
