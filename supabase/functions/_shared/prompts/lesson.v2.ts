// Versioned prompt: change the text => bump the version (it is logged in ai_usage and lesson_contents).
// v2: the language pair comes from the backend; verbs are the forms learners of that language memorise.
import type { PairNames } from '../languages.ts'

export const LESSON_PROMPT_VERSION = 'lesson.v2'

export function lessonPrompt({ native, target }: PairNames): string {
  return `You write one short ${target} lesson for a ${native} native speaker. The lesson takes 6 to 8 minutes and is part of a chapter in a structured course from CEFR A1 to B2.

Field names are historical: fields ending in "_en" (and "en") hold ${target} text, fields ending in "_it" (and "it") hold ${native} text.

## Level and purpose
- Write the ${target} parts at the CEFR level of the chapter (given in the context): at A1 and A2 use short sentences and very common words; never use grammar the learner has not reached yet unless it is the topic of the lesson.
- Set examples, texts and the dialogue in situations that match the learner's purpose (leisure = hobbies, films, music, friends; travel = airports, hotels, restaurants, directions; work = meetings, emails, colleagues, interviews; love = dating, feelings, family). If the learner adds details in their own words, use them.
- Teach the lesson focus (given in the context). Do not repeat words already taught in earlier lessons of the chapter (listed in the context).

## Sections and sizes
- "intro_it": one or two sentences in ${native} saying what the learner will be able to do after the lesson.
- "grammar": "explanation_it" is a short, clear explanation of the lesson focus in ${native} (at most 5 sentences, with the rule and one typical mistake ${native} speakers make); "examples" has exactly 3 ${target} sentences with ${native} translation.
- "words": exactly 5 new words useful for the purpose, "en" in dictionary form (lower case unless the language capitalises it, e.g. German nouns, which also take their article), "it" the ${native} translation, "example_en" a short ${target} sentence using the word.
- "phrases": exactly 3 useful ready-made phrases or sentence patterns for the situation, with ${native} translation.
- "idioms": 1 common idiom or fixed expression suited to the level, with the literal ${native} translation in "it" and the real meaning in ${native} in "meaning_it". At A1 choose a very simple, frequent expression.
- "verbs": exactly 3 verbs used in the lesson. "base" is the dictionary form; "past" and "past_participle" are the two forms learners of ${target} memorise with it (English: past simple and past participle; German: Präteritum and Partizip II; French: passé simple is not used, so "past" is the imparfait 1st person singular and "past_participle" the participe passé; Spanish: pretérito indefinido 1st person singular and participio); "it" the ${native} infinitive.
- "listening": "text_en" is a short spoken text (A1: 40-60 words, A2: 60-80, B1-B2: 80-110) that will be read aloud: a monologue or a short exchange using the lesson grammar and words; "questions" has exactly 2 comprehension questions in ${native}.
- "reading": "title_en" and "text_en" (A1: 60-80 words, A2: 80-110, B1-B2: 110-150), a different situation from the listening text; "questions" has exactly 2 comprehension questions in ${native}.
- Every question has exactly 4 short options (in ${target} for questions about ${target} words, otherwise in ${native}), exactly one correct; "answer" is the index (0-3) of the correct option. Vary the position of the correct option. Wrong options must be plausible but clearly wrong for someone who understood the text.
- "dialogue": "scenario_it" describes in ${native} a role-play situation in one sentence (who the learner is talking to and why); "opening_en" is the first line of the other person, in ${target}, ending with a question that invites the learner to use the lesson grammar.

## Style
- Natural, correct ${target}. ${native} explanations are friendly but concise, addressing the learner informally.
- No generic praise, no emojis.`
}
