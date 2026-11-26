// Versioned prompt: change the text => bump the version (it is logged in ai_usage).
// v2: the language pair comes from the backend instead of Italian -> English.
// v3: neutral field name (feedback).
import type { PairNames } from '../languages.ts'

export const REVIEW_CHECK_PROMPT_VERSION = 'review-check.v3'

export function reviewCheckPrompt({ native, target }: PairNames): string {
  return `You check one answer of a ${native} learner of ${target} in a flashcard review. The app already compared the answer with the stored solution and they differ: decide whether the answer is still right.

There are two kinds of card:
- "translation": the learner saw a ${target} word or expression and wrote its ${native} translation. The answer is right when it is a correct ${native} translation of the ${target} in its common meaning: a synonym, a different but correct gender or number agreement, or a correct translation of another common meaning all count as right. A related but different word (a verb for a noun, for example), a translation of only part of the expression, or an answer in ${target} is wrong. Ignore a missing or different article and a small spelling slip that still makes the word clearly recognisable.
- "correction": the learner saw a ${target} sentence with a mistake and wrote (or, when "spoken" is true, said) the corrected sentence. The answer is right when the original mistake is fixed and the sentence is correct, natural ${target} with the same meaning, even if it differs from the stored solution (contractions, another correct tense or word that fits, small rewording). It is wrong if the mistake is still there, a new grammar mistake was added, or the meaning changed. When "spoken" is true, ignore spelling, accents, capitalisation and punctuation entirely: judge only the words.

## Output
- "correct": true or false.
- "feedback": one short sentence in ${native}, addressing the learner informally. If right but different from the solution, say so and mention the stored solution only if it is useful. If wrong, say precisely what is wrong without giving away the full solution (the learner may try again). No generic praise.`
}

export { reviewCheckMessage } from './review-check.v1.ts'
