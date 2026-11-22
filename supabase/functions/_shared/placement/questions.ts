// Fixed placement-test bank: 4 questions per level, authored (not generated) so the
// result is comparable over time. Answers never leave the server.

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export interface WrittenQuestion {
  id: string
  level: CefrLevel
  /** Sentence with a gap (___) or a question, in English. */
  prompt: string
  options: [string, string, string, string]
  answer: 0 | 1 | 2 | 3
}

export const WRITTEN_QUESTIONS: WrittenQuestion[] = [
  // A1
  { id: 'a1-be', level: 'A1', prompt: 'She ___ a teacher.', options: ['are', 'is', 'am', 'be'], answer: 1 },
  {
    id: 'a1-present-simple',
    level: 'A1',
    prompt: 'I ___ coffee every morning.',
    options: ['drinks', 'drinking', 'drink', 'am drink'],
    answer: 2,
  },
  {
    id: 'a1-there-are',
    level: 'A1',
    prompt: 'There ___ two apples on the table.',
    options: ['are', 'is', 'be', 'am'],
    answer: 0,
  },
  {
    id: 'a1-do-question',
    level: 'A1',
    prompt: 'What time ___ you get up?',
    options: ['does', 'are', 'is', 'do'],
    answer: 3,
  },
  // A2
  {
    id: 'a2-past-simple',
    level: 'A2',
    prompt: 'Yesterday we ___ to the cinema.',
    options: ['go', 'went', 'gone', 'going'],
    answer: 1,
  },
  {
    id: 'a2-comparative',
    level: 'A2',
    prompt: 'This hotel is ___ than the other one.',
    options: ['cheaper', 'more cheap', 'cheapest', 'the cheaper'],
    answer: 0,
  },
  {
    id: 'a2-going-to',
    level: 'A2',
    prompt: "I'm going ___ my grandparents next weekend.",
    options: ['visit', 'visiting', 'visited', 'to visit'],
    answer: 3,
  },
  {
    id: 'a2-much-many',
    level: 'A2',
    prompt: 'How ___ money do you have?',
    options: ['many', 'a lot', 'much', 'lot'],
    answer: 2,
  },
  // B1
  {
    id: 'b1-present-perfect',
    level: 'B1',
    prompt: 'I ___ here since 2019.',
    options: ['live', 'have lived', 'am living', 'lived'],
    answer: 1,
  },
  {
    id: 'b1-first-conditional',
    level: 'B1',
    prompt: 'If it rains tomorrow, we ___ at home.',
    options: ['would stay', 'stayed', 'will stay', 'stay will'],
    answer: 2,
  },
  {
    id: 'b1-passive',
    level: 'B1',
    prompt: 'The museum ___ in 1850.',
    options: ['was built', 'built', 'has built', 'is building'],
    answer: 0,
  },
  {
    id: 'b1-reported-question',
    level: 'B1',
    prompt: 'She asked me where I ___.',
    options: ['do live', 'live', 'did live', 'lived'],
    answer: 3,
  },
  // B2
  {
    id: 'b2-third-conditional',
    level: 'B2',
    prompt: 'If I ___ about the problem, I would have helped you.',
    options: ['knew', 'had known', 'have known', 'would know'],
    answer: 1,
  },
  {
    id: 'b2-past-perfect',
    level: 'B2',
    prompt: 'By the time we arrived, the film ___.',
    options: ['already started', 'has already started', 'had already started', 'was already starting'],
    answer: 2,
  },
  {
    id: 'b2-used-to-ing',
    level: 'B2',
    prompt: "I'm not used to ___ up so early.",
    options: ['getting', 'get', 'got', 'be getting'],
    answer: 0,
  },
  {
    id: 'b2-modal-deduction',
    level: 'B2',
    prompt: 'She ___ have left already: her car is still here.',
    options: ['must', 'should', 'would', "can't"],
    answer: 3,
  },
]

export interface OralPrompt {
  id: string
  level: CefrLevel
  /** Instruction in Italian; the learner answers in English. */
  prompt_it: string
}

export const ORAL_PROMPTS: OralPrompt[] = [
  { id: 'oral-a1', level: 'A1', prompt_it: 'Presentati: come ti chiami, da dove vieni e cosa ti piace fare?' },
  { id: 'oral-a2', level: 'A2', prompt_it: 'Racconta cosa hai fatto lo scorso fine settimana.' },
  {
    id: 'oral-b1',
    level: 'B1',
    prompt_it: 'Parla di un viaggio o di un progetto che vuoi fare in futuro, e spiega perché.',
  },
  {
    id: 'oral-b2',
    level: 'B2',
    prompt_it: 'Secondo te è meglio vivere in città o in campagna? Spiega la tua opinione con qualche argomento.',
  },
]
