// Versioned prompt: change the text => bump the version (it is logged in ai_usage).
export const TRANSCRIBE_PROMPT_VERSION = 'transcribe.v1'

export const NO_SPEECH_MARKER = '[no speech]'

export const TRANSCRIBE_PROMPT = `Transcribe this recording of an Italian learner speaking English.

- Write exactly what was said, word for word. Keep every grammar, vocabulary and word-order mistake as spoken: the transcript is used to correct the learner, so never fix, improve or complete anything.
- If the learner says a word in Italian, write it as spoken.
- Leave out hesitations such as "uh", "um", "ehm".
- Use normal punctuation and capitalisation.
- Reply with the transcript only, no quotes and no comments.
- If there is no intelligible speech, reply with exactly: ${NO_SPEECH_MARKER}`
