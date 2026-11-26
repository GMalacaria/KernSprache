// Versioned prompt: change the text => bump the version (it is logged in ai_usage and lesson_contents).
// v2: the language pair comes from the backend.
// v3: neutral field names; verbs are a list of the forms learners memorise, dictionary form first.
import type { PairNames } from '../languages.ts'

export const LESSON_PROMPT_VERSION = 'lesson.v3'

export function lessonPrompt({ native, target }: PairNames): string {
  return `You write one short ${target} lesson for a ${native} native speaker. The lesson takes 6 to 8 minutes and is part of a chapter in a structured course from CEFR A1 to B2.

## Level and purpose
- Write the ${target} parts at the CEFR level of the chapter (given in the context): at A1 and A2 use short sentences and very common words; never use grammar the learner has not reached yet unless it is the topic of the lesson.
- Set examples, texts and the dialogue in situations that match the learner's purpose (leisure = hobbies, films, music, friends; travel = airports, hotels, restaurants, directions; work = meetings, emails, colleagues, interviews; love = dating, feelings, family).
- Teach the lesson focus (given in the context). Do not repeat words already taught in earlier lessons of the chapter (listed in the context).

## Sections and sizes
- "intro": one or two sentences in ${native} saying what the learner will be able to do after the lesson.
- "grammar": "explanation" is a short, clear explanation of the lesson focus in ${native} (at most 5 sentences, with the rule and one typical mistake ${native} speakers make); "examples" has exactly 3 items, each a ${target} sentence in "text" with its ${native} translation in "translation".
- "words": exactly 5 new words useful for the purpose: "term" in dictionary form (lower case unless the language capitalises it, e.g. German nouns, which also take their article), "translation" in ${native}, "example" a short ${target} sentence using the word.
- "phrases": exactly 3 useful ready-made phrases or sentence patterns for the situation, "text" in ${target} and "translation" in ${native}.
- "idioms": 1 common idiom or fixed expression suited to the level: "text" in ${target}, "literal" its word-for-word ${native} translation, "meaning" what it really means, in ${native}. At A1 choose a very simple, frequent expression.
- "verbs": exactly 3 verbs used in the lesson. "forms" lists the forms learners of ${target} memorise, dictionary form first (English: base, past simple, past participle; German: infinitive, Präteritum, Partizip II; French: infinitive, participe passé; Spanish: infinitive, pretérito indefinido 1st person singular, participio); "translation" is the ${native} infinitive.
- "listening": "text" is a short ${target} text to be read aloud (A1: 40-60 words, A2: 60-80, B1-B2: 80-110), a monologue or a short exchange using the lesson grammar and words; "questions" has exactly 2 comprehension questions, "question" in ${native}.
- "reading": "title" and "text" in ${target} (A1: 60-80 words, A2: 80-110, B1-B2: 110-150), a different situation from the listening text; "questions" has exactly 2 comprehension questions, "question" in ${native}.
- Every question has exactly 4 short options (in ${target} for questions about ${target} words, otherwise in ${native}), exactly one correct; "answer" is the index (0-3) of the correct option. Vary the position of the correct option. Wrong options must be plausible but clearly wrong for someone who understood the text.
- "dialogue": "scenario" describes in ${native} a role-play situation in one sentence (who the learner is talking to and why); "opening" is the first line of the other person, in ${target}, ending with a question that invites the learner to use the lesson grammar.

## Style
- Natural, correct ${target}. ${native} explanations are friendly but concise, addressing the learner informally.
- No generic praise, no emojis.`
}
