import type { WrittenQuestion } from '../questions.ts'

/** English placement questions (the original bank). */
export const EN_QUESTIONS: WrittenQuestion[] = [
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
    id: 'b1-past-perfect',
    level: 'B1',
    prompt: 'By the time we arrived, the film ___.',
    options: ['already started', 'has already started', 'had already started', 'was already starting'],
    answer: 2,
  },
  {
    id: 'b1-used-to-ing',
    level: 'B1',
    prompt: "I'm not used to ___ up so early.",
    options: ['getting', 'get', 'got', 'be getting'],
    answer: 0,
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
    id: 'b2-modal-deduction',
    level: 'B2',
    prompt: 'She ___ have left already: her car is still here.',
    options: ['must', 'should', 'would', "can't"],
    answer: 3,
  },
  {
    id: 'b2-inversion',
    level: 'B2',
    prompt: 'Hardly ___ the house when it started to rain.',
    options: ['I had left', 'had I left', 'I left', 'did I leave'],
    answer: 1,
  },
  {
    id: 'b2-passive-reporting',
    level: 'B2',
    prompt: 'The thief is believed ___ the country last week.',
    options: ['to leave', 'leaving', 'to have left', 'having left'],
    answer: 2,
  },
]
