import type { CefrLevel } from '../questions.ts'
import type { BankPassage, BankQuestion, GrammarTopic, PlacementBank, VocabDomain } from './types.ts'

// English placement bank (native language: Italian). Every grammar topic points to the English lesson that teaches it
// (supabase/migrations/20261122155245_curriculum_chapters.sql).

type Options = [string, string, string, string]
type Answer = 0 | 1 | 2 | 3

const GRAMMAR_TOPICS = {
  to_be: { level: 'A1', chapter: 'a1-to-be', lesson: 'a1-to-be-where-from' },
  present_simple_third_person: { level: 'A1', chapter: 'a1-daily-routine', lesson: 'a1-routine-third-person' },
  there_is_are: { level: 'A1', chapter: 'a1-things-around', lesson: 'a1-things-there-is' },
  do_does_questions: { level: 'A1', chapter: 'a1-questions', lesson: 'a1-questions-do-does' },
  prepositions_of_time: { level: 'A1', chapter: 'a1-daily-routine', lesson: 'a1-routine-time' },
  present_continuous: { level: 'A1', chapter: 'a1-present-continuous', lesson: 'a1-continuous-now' },
  past_simple_irregular: { level: 'A2', chapter: 'a2-past-simple', lesson: 'a2-past-irregular' },
  past_simple_questions: { level: 'A2', chapter: 'a2-past-simple', lesson: 'a2-past-questions' },
  much_many: { level: 'A2', chapter: 'a2-food-quantities', lesson: 'a2-food-much-many' },
  comparatives: { level: 'A2', chapter: 'a2-comparisons', lesson: 'a2-comparatives' },
  going_to: { level: 'A2', chapter: 'a2-future', lesson: 'a2-going-to' },
  present_perfect_experience: { level: 'A2', chapter: 'a2-experiences', lesson: 'a2-ever-never' },
  for_since: { level: 'B1', chapter: 'b1-how-long', lesson: 'b1-for-since' },
  past_perfect: { level: 'B1', chapter: 'b1-narrative', lesson: 'b1-past-perfect' },
  second_conditional: { level: 'B1', chapter: 'b1-conditionals', lesson: 'b1-second' },
  passive_past: { level: 'B1', chapter: 'b1-passive', lesson: 'b1-passive-past' },
  mustnt_dont_have_to: { level: 'B1', chapter: 'b1-modals', lesson: 'b1-dont-have-to-mustnt' },
  reported_questions: { level: 'B1', chapter: 'b1-reported-speech', lesson: 'b1-reported-questions' },
  third_conditional: { level: 'B2', chapter: 'b2-conditionals', lesson: 'b2-third-conditional' },
  deduction_past: { level: 'B2', chapter: 'b2-deduction', lesson: 'b2-deduction-past' },
  non_defining_relatives: { level: 'B2', chapter: 'b2-relative-clauses', lesson: 'b2-non-defining' },
  gerund_infinitive_meaning: { level: 'B2', chapter: 'b2-gerunds-infinitives', lesson: 'b2-meaning-change' },
  causative: { level: 'B2', chapter: 'b2-passive-causative', lesson: 'b2-have-done' },
  contrast_linkers: { level: 'B2', chapter: 'b2-linking', lesson: 'b2-contrast' },
} as const satisfies Record<string, GrammarTopic>

type GrammarTopicId = keyof typeof GRAMMAR_TOPICS

/** A gap sentence: the shown sentence is the prompt with the right option in the gap. */
function gap(
  base: Pick<BankQuestion, 'id' | 'skill' | 'level' | 'topic'>,
  prompt: string,
  options: Options,
  answer: Answer,
  translation: string,
): BankQuestion {
  return { ...base, prompt, options, answer, sentence: prompt.replace('___', options[answer]), translation }
}

function grammar(
  id: string,
  topic: GrammarTopicId,
  prompt: string,
  options: Options,
  answer: Answer,
  translation: string,
): BankQuestion {
  return gap({ id, skill: 'grammar', level: GRAMMAR_TOPICS[topic].level, topic }, prompt, options, answer, translation)
}

function vocab(
  id: string,
  level: CefrLevel,
  topic: VocabDomain,
  prompt: string,
  options: Options,
  answer: Answer,
  translation: string,
): BankQuestion {
  return gap({ id, skill: 'vocabulary', level, topic }, prompt, options, answer, translation)
}

/** A question about a passage: skill, level and topic come from the passage. */
function about(
  passage: BankPassage,
  id: string,
  prompt: string,
  options: Options,
  answer: Answer,
  sentence: string,
  translation: string,
): BankQuestion {
  const { skill, level, topic } = passage
  return { id, skill, level, topic, passage: passage.id, prompt, options, answer, sentence, translation }
}

const GRAMMAR: BankQuestion[] = [
  // A1
  grammar(
    'g-a1-be',
    'to_be',
    'My parents ___ from Naples.',
    ['is', 'am', 'are', 'be'],
    2,
    'I miei genitori sono di Napoli.',
  ),
  grammar(
    'g-a1-third-person',
    'present_simple_third_person',
    'My brother ___ in a bank.',
    ['works', 'work', 'working', 'is work'],
    0,
    'Mio fratello lavora in una banca.',
  ),
  grammar(
    'g-a1-there-are',
    'there_is_are',
    'There ___ three chairs in the kitchen.',
    ['is', 'be', 'am', 'are'],
    3,
    'Ci sono tre sedie in cucina.',
  ),
  grammar(
    'g-a1-does',
    'do_does_questions',
    '___ your sister speak French?',
    ['Do', 'Does', 'Is', 'Are'],
    1,
    'Tua sorella parla francese?',
  ),
  grammar(
    'g-a1-at',
    'prepositions_of_time',
    "The shop opens ___ nine o'clock.",
    ['in', 'on', 'at', 'to'],
    2,
    'Il negozio apre alle nove.',
  ),
  grammar(
    'g-a1-continuous',
    'present_continuous',
    'Please be quiet: the baby ___.',
    ['sleeps', 'are sleeping', 'sleep', 'is sleeping'],
    3,
    'Per favore, fai silenzio: il bambino sta dormendo.',
  ),
  // A2
  grammar(
    'g-a2-went',
    'past_simple_irregular',
    'Last summer we ___ to Greece.',
    ['went', 'go', 'gone', 'have gone'],
    0,
    "L'estate scorsa siamo andati in Grecia.",
  ),
  grammar(
    'g-a2-did',
    'past_simple_questions',
    'What ___ you do yesterday evening?',
    ['do', 'did', 'were', 'have'],
    1,
    'Cosa hai fatto ieri sera?',
  ),
  grammar(
    'g-a2-many',
    'much_many',
    'How ___ eggs do we need for the cake?',
    ['much', 'lot', 'many', 'any'],
    2,
    'Quante uova ci servono per la torta?',
  ),
  grammar(
    'g-a2-bigger',
    'comparatives',
    'My new flat is ___ than the old one.',
    ['more big', 'biggest', 'big', 'bigger'],
    3,
    'Il mio nuovo appartamento è più grande di quello vecchio.',
  ),
  grammar(
    'g-a2-going-to',
    'going_to',
    'Look at those black clouds! It ___ rain.',
    ['is going to', 'goes to', 'is go to', 'going to'],
    0,
    'Guarda quelle nuvole nere! Sta per piovere.',
  ),
  grammar(
    'g-a2-ever',
    'present_perfect_experience',
    'Have you ever ___ sushi?',
    ['ate', 'eaten', 'eat', 'eating'],
    1,
    'Hai mai mangiato il sushi?',
  ),
  // B1
  grammar(
    'g-b1-since',
    'for_since',
    'I have lived in this city ___ 2015.',
    ['for', 'from', 'since', 'during'],
    2,
    'Vivo in questa città dal 2015.',
  ),
  grammar(
    'g-b1-had-left',
    'past_perfect',
    'When we got to the station, the train ___ ten minutes before.',
    ['has left', 'leaves', 'is leaving', 'had left'],
    3,
    'Quando siamo arrivati in stazione, il treno era partito dieci minuti prima.',
  ),
  grammar(
    'g-b1-second-conditional',
    'second_conditional',
    'If I ___ more free time, I would learn to play the piano.',
    ['had', 'have', 'would have', 'will have'],
    0,
    'Se avessi più tempo libero, imparerei a suonare il pianoforte.',
  ),
  grammar(
    'g-b1-was-built',
    'passive_past',
    'This bridge ___ in 1890.',
    ['built', 'was built', 'has built', 'is building'],
    1,
    'Questo ponte è stato costruito nel 1890.',
  ),
  grammar(
    'g-b1-dont-have-to',
    'mustnt_dont_have_to',
    'The museum is free, so you ___ pay.',
    ["mustn't", "haven't to", "don't have to", "don't must"],
    2,
    'Il museo è gratuito, quindi non serve pagare.',
  ),
  grammar(
    'g-b1-asked-if',
    'reported_questions',
    'She asked me ___ I was ready to leave.',
    ['that', 'what', 'do', 'if'],
    3,
    'Mi ha chiesto se ero pronto a partire.',
  ),
  // B2
  grammar(
    'g-b2-third-conditional',
    'third_conditional',
    "If she ___ the bus, she wouldn't have been late for the interview.",
    ["hadn't missed", "didn't miss", "wouldn't miss", "hasn't missed"],
    0,
    "Se non avesse perso l'autobus, non sarebbe arrivata in ritardo al colloquio.",
  ),
  grammar(
    'g-b2-must-have',
    'deduction_past',
    'All the lights are off: they ___ gone to bed.',
    ['must', 'must have', 'can have', 'should had'],
    1,
    'Le luci sono tutte spente: devono essere andati a letto.',
  ),
  grammar(
    'g-b2-who',
    'non_defining_relatives',
    'My sister, ___ lives in Rome, is a doctor.',
    ['that', 'which', 'who', 'whose'],
    2,
    'Mia sorella, che vive a Roma, è medico.',
  ),
  grammar(
    'g-b2-stopped-smoking',
    'gerund_infinitive_meaning',
    'He stopped ___ because he wanted to stay healthy.',
    ['to smoke', 'smoke', 'smoked', 'smoking'],
    3,
    'Ha smesso di fumare perché voleva restare in salute.',
  ),
  grammar(
    'g-b2-having-repaired',
    'causative',
    "I'm ___ my car repaired tomorrow.",
    ['having', 'making', 'doing', 'letting'],
    0,
    'Domani mi faccio riparare la macchina.',
  ),
  grammar(
    'g-b2-despite',
    'contrast_linkers',
    '___ the rain, we went for a long walk.',
    ['Although', 'Despite', 'However', 'Even'],
    1,
    'Nonostante la pioggia, abbiamo fatto una lunga passeggiata.',
  ),
]

const VOCABULARY: BankQuestion[] = [
  // A1
  vocab(
    'v-a1-eat',
    'A1',
    'food',
    "I'm hungry. Let's ___ something.",
    ['drink', 'sleep', 'eat', 'wear'],
    2,
    'Ho fame. Mangiamo qualcosa.',
  ),
  vocab(
    'v-a1-uncle',
    'A1',
    'people',
    "My mother's brother is my ___.",
    ['uncle', 'cousin', 'nephew', 'grandfather'],
    0,
    'Il fratello di mia madre è mio zio.',
  ),
  vocab(
    'v-a1-coat',
    'A1',
    'everyday',
    "It's very cold today. Put on your ___.",
    ['shorts', 'sunglasses', 'sandals', 'coat'],
    3,
    'Oggi fa molto freddo. Mettiti il cappotto.',
  ),
  vocab(
    'v-a1-bedroom',
    'A1',
    'home',
    'We sleep in the ___.',
    ['kitchen', 'bedroom', 'garden', 'bathroom'],
    1,
    'Dormiamo in camera da letto.',
  ),
  vocab(
    'v-a1-station',
    'A1',
    'travel',
    'Excuse me, where is the train ___?',
    ['airport', 'port', 'station', 'road'],
    2,
    "Mi scusi, dov'è la stazione dei treni?",
  ),
  vocab(
    'v-a1-tuesday',
    'A1',
    'everyday',
    'The day after Monday is ___.',
    ['Sunday', 'Wednesday', 'Thursday', 'Tuesday'],
    3,
    'Il giorno dopo lunedì è martedì.',
  ),
  // A2
  vocab(
    'v-a2-pay',
    'A2',
    'money',
    'Can I ___ by card?',
    ['pay', 'buy', 'spend', 'cost'],
    0,
    'Posso pagare con la carta?',
  ),
  vocab(
    'v-a2-doctor',
    'A2',
    'health',
    'I have a terrible headache. I need to see a ___.',
    ['lawyer', 'doctor', 'waiter', 'plumber'],
    1,
    'Ho un mal di testa terribile. Devo andare dal medico.',
  ),
  vocab(
    'v-a2-booked',
    'A2',
    'travel',
    'We ___ a room at a small hotel near the beach.',
    ['borrowed', 'lent', 'booked', 'spent'],
    2,
    'Abbiamo prenotato una camera in un piccolo albergo vicino alla spiaggia.',
  ),
  vocab(
    'v-a2-turn-off',
    'A2',
    'home',
    'Please ___ the light when you leave the room.',
    ['turn on', 'turn up', 'turn over', 'turn off'],
    3,
    'Per favore, spegni la luce quando esci dalla stanza.',
  ),
  vocab(
    'v-a2-excited',
    'A2',
    'feelings',
    'The children were very ___ the night before the school trip.',
    ['excited', 'boring', 'exciting', 'tiring'],
    0,
    'I bambini erano molto emozionati la sera prima della gita scolastica.',
  ),
  vocab(
    'v-a2-take-care',
    'A2',
    'work',
    'In my job I ___ care of elderly people.',
    ['make', 'take', 'do', 'have'],
    1,
    'Nel mio lavoro mi prendo cura delle persone anziane.',
  ),
  // B1
  vocab(
    'v-b1-afraid',
    'B1',
    'feelings',
    "I'm not ___ of spiders.",
    ['scary', 'fear', 'afraid', 'worried'],
    2,
    'Non ho paura dei ragni.',
  ),
  vocab(
    'v-b1-made-mistake',
    'B1',
    'work',
    'She ___ a mistake in the report, so she had to rewrite it.',
    ['did', 'took', 'had', 'made'],
    3,
    'Ha fatto un errore nella relazione, quindi ha dovuto riscriverla.',
  ),
  vocab(
    'v-b1-cancelled',
    'B1',
    'travel',
    'Our flight was ___ because of the fog.',
    ['cancelled', 'stopped', 'closed', 'broken'],
    0,
    'Il nostro volo è stato cancellato per la nebbia.',
  ),
  vocab(
    'v-b1-lend',
    'B1',
    'money',
    'Could you ___ me twenty euros until Friday?',
    ['borrow', 'lend', 'owe', 'rent'],
    1,
    'Mi presti venti euro fino a venerdì?',
  ),
  vocab(
    'v-b1-give-up',
    'B1',
    'health',
    "I'm trying to ___ up smoking.",
    ['take', 'put', 'give', 'make'],
    2,
    'Sto cercando di smettere di fumare.',
  ),
  vocab(
    'v-b1-broadcast',
    'B1',
    'media',
    'The final will be ___ live on TV.',
    ['published', 'printed', 'written', 'broadcast'],
    3,
    'La finale sarà trasmessa in diretta in TV.',
  ),
  // B2
  vocab(
    'v-b2-lay-off',
    'B2',
    'work',
    'The company had to ___ 200 workers because of the crisis.',
    ['lay off', 'lay down', 'lay out', 'lay up'],
    0,
    "L'azienda ha dovuto licenziare 200 lavoratori a causa della crisi.",
  ),
  vocab(
    'v-b2-convincing',
    'B2',
    'society',
    'Her argument was so ___ that everyone agreed with her.',
    ['convinced', 'convincing', 'persuaded', 'confident'],
    1,
    'La sua argomentazione era così convincente che tutti le hanno dato ragione.',
  ),
  vocab(
    'v-b2-pose',
    'B2',
    'nature',
    'Rising sea levels ___ a serious threat to coastal cities.',
    ['make', 'do', 'pose', 'put'],
    2,
    "L'innalzamento del livello del mare rappresenta una seria minaccia per le città costiere.",
  ),
  vocab(
    'v-b2-broke-promise',
    'B2',
    'people',
    'He ___ his promise and never called me back.',
    ['missed', 'lost', 'failed', 'broke'],
    3,
    'Non ha mantenuto la promessa e non mi ha mai richiamato.',
  ),
  vocab(
    'v-b2-introduced',
    'B2',
    'society',
    'The government has ___ new measures to reduce traffic.',
    ['introduced', 'inserted', 'entered', 'included'],
    0,
    'Il governo ha introdotto nuove misure per ridurre il traffico.',
  ),
  vocab(
    'v-b2-put-off',
    'B2',
    'work',
    "Let's ___ the meeting until next week.",
    ['put up', 'put off', 'put out', 'put away'],
    1,
    'Rimandiamo la riunione alla settimana prossima.',
  ),
]

// Reading

const MARTA: BankPassage = {
  id: 'rp-a1-marta',
  skill: 'reading',
  level: 'A1',
  topic: 'people',
  text: "Hi, I'm Marta. I'm 25 and I live in Madrid with my sister. I work in a café near the park. " +
    'I start at seven in the morning, so I get up very early. In the evening I like reading and watching films. ' +
    'My sister is a nurse and she works at night.',
}

const NOTE: BankPassage = {
  id: 'rp-a1-note',
  skill: 'reading',
  level: 'A1',
  topic: 'home',
  text: "Dear Tom, I'm at the supermarket. There is pasta in the cupboard and there are tomatoes in the fridge. " +
    "Please don't eat the cake: it's for Grandma's birthday tomorrow! I'm back at six. Love, Mum",
}

const LISBON: BankPassage = {
  id: 'rp-a2-lisbon',
  skill: 'reading',
  level: 'A2',
  topic: 'travel',
  text: 'Hi Sara, we arrived in Lisbon on Saturday. The hotel is small but very clean, and it is only five minutes ' +
    'from the old town. Yesterday we visited a castle and ate fresh fish by the river. The weather was hot, so ' +
    "today we're going to take a train to the beach. See you next week! Luca",
}

const NOTICE: BankPassage = {
  id: 'rp-a2-notice',
  skill: 'reading',
  level: 'A2',
  topic: 'work',
  text: 'Staff notice. From next Monday, the office will open at 8:30 instead of 9:00. The canteen will close at ' +
    '2 pm, one hour earlier than now. If you want to work from home on Fridays, please send an email to Anna in ' +
    'Human Resources before the end of the month.',
}

const CYCLING: BankPassage = {
  id: 'rp-b1-cycling',
  skill: 'reading',
  level: 'B1',
  topic: 'health',
  text: 'More and more people are choosing to cycle to work. Not only is it cheaper than driving, but it also ' +
    'helps them stay fit without going to the gym. However, many cyclists complain that city roads are still ' +
    'dangerous. In some cities, the local council has built new bike lanes, and the number of accidents has ' +
    'fallen by almost a third.',
}

const BERLIN: BankPassage = {
  id: 'rp-b1-berlin',
  skill: 'reading',
  level: 'B1',
  topic: 'feelings',
  text: "When I moved to Berlin, I didn't speak a word of German. For the first few months I felt lonely, because " +
    "I couldn't follow conversations at work. Then a colleague suggested a language exchange: I helped her with " +
    'Italian and she helped me with German. After a year I was able to chat with my neighbours, and now Berlin ' +
    'really feels like home.',
}

const NEWS: BankPassage = {
  id: 'rp-b2-news',
  skill: 'reading',
  level: 'B2',
  topic: 'media',
  text: 'Although social media allows news to spread faster than ever, it has also made it harder to tell facts ' +
    'from rumours. Studies suggest that false stories are shared more often than true ones, largely because they ' +
    'tend to be more surprising. Some platforms now label misleading posts, but critics argue that this approach ' +
    'treats the symptoms rather than the cause: what is really needed, they say, is better media literacy in ' +
    'schools.',
}

const FOUR_DAY_WEEK: BankPassage = {
  id: 'rp-b2-four-day-week',
  skill: 'reading',
  level: 'B2',
  topic: 'work',
  text: 'Four-day working weeks are no longer just an experiment. In a recent trial involving sixty companies, ' +
    'most employers reported that productivity stayed the same or even improved, while staff said they felt less ' +
    'stressed. Yet the model is not suitable for every sector: hospitals and shops, for instance, cannot simply ' +
    'close one day a week. For them, the challenge lies in reorganising shifts without hiring extra people.',
}

const READING: BankQuestion[] = [
  about(
    MARTA,
    'r-a1-marta-work',
    'Where does Marta work?',
    ['In a café', 'In a hospital', 'In a park', 'In a cinema'],
    0,
    'I work in a café near the park.',
    'Lavoro in un bar vicino al parco.',
  ),
  about(
    MARTA,
    'r-a1-marta-early',
    'Why does Marta get up early?',
    ['Her sister works at night.', 'She likes the morning.', 'She starts work at seven.', 'She lives near the park.'],
    2,
    'I start at seven in the morning, so I get up very early.',
    'Comincio alle sette del mattino, quindi mi alzo molto presto.',
  ),
  about(
    NOTE,
    'r-a1-note-tomatoes',
    'Where are the tomatoes?',
    ['In the cupboard', 'In the fridge', 'At the supermarket', 'On the table'],
    1,
    'There are tomatoes in the fridge.',
    'Ci sono dei pomodori nel frigorifero.',
  ),
  about(
    NOTE,
    'r-a1-note-cake',
    "Why can't Tom eat the cake?",
    ['It is for dinner tonight.', 'It is not ready.', 'Mum wants to eat it.', "It is for his grandmother's birthday."],
    3,
    "Please don't eat the cake: it's for Grandma's birthday tomorrow!",
    'Per favore non mangiare la torta: è per il compleanno della nonna domani!',
  ),
  about(
    LISBON,
    'r-a2-lisbon-yesterday',
    'What did Luca do yesterday?',
    ['He went to the beach.', 'He took a train.', 'He visited a castle and ate fish.', 'He looked for a hotel.'],
    2,
    'Yesterday we visited a castle and ate fresh fish by the river.',
    'Ieri abbiamo visitato un castello e mangiato pesce fresco sul fiume.',
  ),
  about(
    LISBON,
    'r-a2-lisbon-beach',
    'Why are they going to the beach today?',
    [
      'Because the weather is hot.',
      'Because the hotel is near it.',
      'Because the old town is closed.',
      'Because Sara is there.',
    ],
    0,
    "The weather was hot, so today we're going to take a train to the beach.",
    'Faceva caldo, quindi oggi prendiamo un treno per andare al mare.',
  ),
  about(
    NOTICE,
    'r-a2-notice-open',
    'What time does the office open now?',
    ['At 8:00', 'At 8:30', 'At 2:00', 'At 9:00'],
    3,
    'From next Monday, the office will open at 8:30 instead of 9:00.',
    "Da lunedì prossimo l'ufficio aprirà alle 8:30 invece che alle 9:00.",
  ),
  about(
    NOTICE,
    'r-a2-notice-home',
    'What should you do if you want to work from home on Fridays?',
    [
      'Talk to your manager on Monday.',
      'Send Anna an email before the end of the month.',
      'Go to the canteen before 2 pm.',
      'Fill in a form on Friday.',
    ],
    1,
    'If you want to work from home on Fridays, please send an email to Anna in Human Resources before the end ' +
      'of the month.',
    "Se vuoi lavorare da casa il venerdì, manda un'email ad Anna dell'ufficio del personale prima della fine del " +
      'mese.',
  ),
  about(
    CYCLING,
    'r-b1-cycling-why',
    'According to the text, why do people cycle to work?',
    [
      'It saves money and keeps them fit.',
      'Their offices have no parking.',
      'Roads are safer than before.',
      'The council pays them.',
    ],
    0,
    'Not only is it cheaper than driving, but it also helps them stay fit without going to the gym.',
    'Non solo costa meno che andare in macchina, ma li aiuta anche a restare in forma senza andare in palestra.',
  ),
  about(
    CYCLING,
    'r-b1-cycling-lanes',
    'What happened in the cities that built new bike lanes?',
    [
      'More people bought cars.',
      'Cyclists stopped complaining.',
      'There were fewer accidents.',
      'Roads became more dangerous.',
    ],
    2,
    'In some cities, the local council has built new bike lanes, and the number of accidents has fallen by ' +
      'almost a third.',
    'In alcune città il comune ha costruito nuove piste ciclabili e il numero di incidenti è sceso di quasi un ' +
      'terzo.',
  ),
  about(
    BERLIN,
    'r-b1-berlin-lonely',
    'Why did the writer feel lonely at first?',
    [
      'She missed her family.',
      "She couldn't follow conversations at work.",
      'Her neighbours were unfriendly.',
      'She had no job.',
    ],
    1,
    "For the first few months I felt lonely, because I couldn't follow conversations at work.",
    'Nei primi mesi mi sentivo sola, perché non riuscivo a seguire le conversazioni al lavoro.',
  ),
  about(
    BERLIN,
    'r-b1-berlin-helped',
    'What helped the writer most?',
    [
      'A language course',
      'Living with her neighbours',
      'Watching German films',
      'A language exchange with a colleague',
    ],
    3,
    'Then a colleague suggested a language exchange: I helped her with Italian and she helped me with German.',
    "Poi una collega mi ha proposto uno scambio linguistico: io l'aiutavo con l'italiano e lei aiutava me con il " +
      'tedesco.',
  ),
  about(
    NEWS,
    'r-b2-news-false',
    'According to studies, why are false stories shared more often?',
    [
      'They are written by experts.',
      'Platforms promote them.',
      'They tend to be more surprising.',
      'They spread more slowly.',
    ],
    2,
    'Studies suggest that false stories are shared more often than true ones, largely because they tend to be ' +
      'more surprising.',
    'Gli studi indicano che le notizie false vengono condivise più spesso di quelle vere, soprattutto perché ' +
      'tendono a sorprendere di più.',
  ),
  about(
    NEWS,
    'r-b2-news-critics',
    'What do the critics think is really needed?',
    [
      'Teaching people at school to judge information',
      'Labelling more posts as misleading',
      'Closing social media platforms',
      'Spreading news faster',
    ],
    0,
    'What is really needed, they say, is better media literacy in schools.',
    'Quello che serve davvero, dicono, è insegnare meglio a scuola a valutare i media.',
  ),
  about(
    FOUR_DAY_WEEK,
    'r-b2-four-day-trial',
    'What did most employers in the trial report?',
    [
      'Staff felt more stressed.',
      'Many workers left.',
      'The trial was too expensive.',
      'Productivity stayed the same or improved.',
    ],
    3,
    'Most employers reported that productivity stayed the same or even improved.',
    'La maggior parte dei datori di lavoro ha riferito che la produttività è rimasta uguale o è persino migliorata.',
  ),
  about(
    FOUR_DAY_WEEK,
    'r-b2-four-day-sectors',
    "What is the writer's point about hospitals and shops?",
    [
      'They already work four days a week.',
      'They cannot easily adopt the model.',
      'They should hire more people.',
      'They took part in the trial.',
    ],
    1,
    'Hospitals and shops, for instance, cannot simply close one day a week.',
    'Ospedali e negozi, per esempio, non possono semplicemente chiudere un giorno a settimana.',
  ),
]

// Listening: the text is the script the server turns into audio (one voice, at most 600 characters, like `speak`).

const TRAIN: BankPassage = {
  id: 'lp-a1-train',
  skill: 'listening',
  level: 'A1',
  topic: 'travel',
  text: 'Good morning. This is an announcement for passengers on the ten fifteen train to Bristol. The train is ' +
    'late. It will leave at ten forty-five from platform three. Thank you.',
}

const VOICEMAIL: BankPassage = {
  id: 'lp-a1-voicemail',
  skill: 'listening',
  level: 'A1',
  topic: 'food',
  text: "Hi Paul, it's Emma. I'm at the shop now. Do we need milk? I've got bread and eggs. Call me back, please. " +
    'Oh, and dinner is at eight, not seven. Bye!',
}

const FLAT: BankPassage = {
  id: 'lp-a2-flat',
  skill: 'listening',
  level: 'A2',
  topic: 'home',
  text: "Hello, I'm calling about the flat in King Street. I saw the advert online. Is it still available? I'd " +
    'like to know if the rent includes the bills, and if I can see it on Saturday morning. My number is double ' +
    'seven, five, two, nine, one. Thanks.',
}

const SPORTS_CENTRE: BankPassage = {
  id: 'lp-a2-sports-centre',
  skill: 'listening',
  level: 'A2',
  topic: 'health',
  text: 'Welcome to Greenfield Sports Centre. The swimming pool is open every day from seven in the morning to ' +
    'nine in the evening, but it is closed on Sunday afternoons for cleaning. Yoga classes are on Tuesdays and ' +
    'Thursdays. Remember to bring your membership card, or you will have to pay for a day ticket.',
}

const UPDATE: BankPassage = {
  id: 'lp-b1-update',
  skill: 'listening',
  level: 'B1',
  topic: 'work',
  text: 'Hi everyone, just a quick update before the weekend. The meeting with our new client has been moved from ' +
    'Monday to Wednesday, because their manager is ill. That gives us two more days to finish the presentation, ' +
    "so please don't send me your slides tonight: Tuesday lunchtime is fine. And if anyone has questions about " +
    "the budget, ask Mark, not me, because I'll be travelling on Monday.",
}

const WEATHER: BankPassage = {
  id: 'lp-b1-weather',
  skill: 'listening',
  level: 'B1',
  topic: 'travel',
  text: "If you're planning a trip to the mountains this weekend, be careful. Heavy snow is expected on Saturday " +
    'night, and some roads may be closed by Sunday morning. Drivers are advised to carry chains and to check the ' +
    'traffic news before leaving. The weather should improve on Monday, when temperatures will rise again.',
}

const HOUSING: BankPassage = {
  id: 'lp-b2-housing',
  skill: 'listening',
  level: 'B2',
  topic: 'society',
  text: 'Our city is getting more expensive every year, and young people are paying the price. Many of them would ' +
    'like to live on their own, but rents have risen much faster than salaries. As a result, more and more ' +
    'people in their thirties still share flats or live with their parents. Building new homes would help, but ' +
    'only if they are genuinely affordable, rather than luxury apartments that end up empty.',
}

const FARM: BankPassage = {
  id: 'lp-b2-farm',
  skill: 'listening',
  level: 'B2',
  topic: 'nature',
  text: 'I used to think working from a farm would be peaceful, and in a way it is. What I had not anticipated ' +
    'was how much the seasons would shape my schedule. In spring, I barely have time to answer emails, whereas in ' +
    "winter I can focus on writing for weeks. It's taught me to stop fighting my own rhythm, which, oddly " +
    'enough, has made me more productive than I ever was in the city.',
}

const LISTENING: BankQuestion[] = [
  about(
    TRAIN,
    'l-a1-train-time',
    'What time does the train leave now?',
    ['10:45', '10:15', '10:30', '11:45'],
    0,
    'It will leave at ten forty-five from platform three.',
    'Partirà alle dieci e quarantacinque dal binario tre.',
  ),
  about(
    TRAIN,
    'l-a1-train-platform',
    'Which platform does the train leave from?',
    ['Platform 1', 'Platform 2', 'Platform 3', 'Platform 10'],
    2,
    'It will leave at ten forty-five from platform three.',
    'Partirà alle dieci e quarantacinque dal binario tre.',
  ),
  about(
    VOICEMAIL,
    'l-a1-voicemail-got',
    'What has Emma got?',
    ['Milk and bread', 'Bread and eggs', 'Milk and eggs', 'Only bread'],
    1,
    "I've got bread and eggs.",
    'Ho preso pane e uova.',
  ),
  about(
    VOICEMAIL,
    'l-a1-voicemail-dinner',
    'What time is dinner?',
    ['At six', 'At seven', 'At nine', 'At eight'],
    3,
    'Dinner is at eight, not seven.',
    'La cena è alle otto, non alle sette.',
  ),
  about(
    FLAT,
    'l-a2-flat-why',
    'Why is the person calling?',
    ['To pay the bills', 'To sell a flat', 'To ask about a flat to rent', 'To book a hotel'],
    2,
    "I'm calling about the flat in King Street. I saw the advert online.",
    "Chiamo per l'appartamento in King Street. Ho visto l'annuncio online.",
  ),
  about(
    FLAT,
    'l-a2-flat-when',
    'When would the caller like to see the flat?',
    ['On Saturday morning', 'On Sunday morning', 'On Saturday evening', 'Today'],
    0,
    "I'd like to know if the rent includes the bills, and if I can see it on Saturday morning.",
    "Vorrei sapere se l'affitto comprende le bollette e se posso vederlo sabato mattina.",
  ),
  about(
    SPORTS_CENTRE,
    'l-a2-sports-closed',
    'When is the swimming pool closed?',
    ['Every morning', 'On Tuesdays and Thursdays', 'Every evening after seven', 'On Sunday afternoons'],
    3,
    'It is closed on Sunday afternoons for cleaning.',
    'È chiusa la domenica pomeriggio per le pulizie.',
  ),
  about(
    SPORTS_CENTRE,
    'l-a2-sports-card',
    'What happens if you forget your membership card?',
    ['You cannot do yoga.', 'You have to pay for a day ticket.', 'You have to go home.', 'You get a new card.'],
    1,
    'Remember to bring your membership card, or you will have to pay for a day ticket.',
    'Ricordati di portare la tessera, altrimenti dovrai pagare un biglietto giornaliero.',
  ),
  about(
    UPDATE,
    'l-b1-update-moved',
    'Why was the meeting moved?',
    [
      "The client's manager is ill.",
      'The presentation is not ready.',
      'The speaker is travelling.',
      'Mark is busy on Monday.',
    ],
    0,
    'The meeting with our new client has been moved from Monday to Wednesday, because their manager is ill.',
    'La riunione con il nuovo cliente è stata spostata da lunedì a mercoledì, perché il loro responsabile è malato.',
  ),
  about(
    UPDATE,
    'l-b1-update-budget',
    'Who should you ask about the budget?',
    ['The client', 'The speaker', 'Mark', 'The manager'],
    2,
    'If anyone has questions about the budget, ask Mark, not me.',
    'Se qualcuno ha domande sul budget, chieda a Mark, non a me.',
  ),
  about(
    WEATHER,
    'l-b1-weather-purpose',
    'What is the main purpose of the message?',
    [
      'To advertise a ski resort',
      'To warn travellers about bad weather',
      'To announce new roads',
      'To sell snow chains',
    ],
    1,
    "If you're planning a trip to the mountains this weekend, be careful.",
    'Se state organizzando una gita in montagna questo fine settimana, fate attenzione.',
  ),
  about(
    WEATHER,
    'l-b1-weather-improve',
    'When should the weather improve?',
    ['On Saturday night', 'On Sunday morning', 'This weekend', 'On Monday'],
    3,
    'The weather should improve on Monday, when temperatures will rise again.',
    'Il tempo dovrebbe migliorare lunedì, quando le temperature torneranno a salire.',
  ),
  about(
    HOUSING,
    'l-b2-housing-concern',
    "What is the speaker's main concern?",
    [
      'Young people work too little.',
      'Salaries are rising too fast.',
      'Housing is too expensive for young people.',
      'There are too many empty flats.',
    ],
    2,
    'Many of them would like to live on their own, but rents have risen much faster than salaries.',
    'Molti vorrebbero vivere da soli, ma gli affitti sono aumentati molto più rapidamente degli stipendi.',
  ),
  about(
    HOUSING,
    'l-b2-housing-new-homes',
    'What does the speaker say about building new homes?',
    [
      'It only helps if the homes are affordable.',
      'It is never a good idea.',
      'Luxury flats are the best solution.',
      'It is already happening everywhere.',
    ],
    0,
    'Building new homes would help, but only if they are genuinely affordable.',
    'Costruire nuove case servirebbe, ma solo se fossero davvero accessibili.',
  ),
  about(
    FARM,
    'l-b2-farm-surprise',
    'What did the speaker not expect?',
    [
      'The farm being so quiet',
      'Having to answer emails',
      'Moving back to the city',
      'How much the seasons would shape their schedule',
    ],
    3,
    'What I had not anticipated was how much the seasons would shape my schedule.',
    'Quello che non avevo previsto era quanto le stagioni avrebbero influenzato i miei orari.',
  ),
  about(
    FARM,
    'l-b2-farm-now',
    'How does the speaker feel about it now?',
    [
      'They still find it frustrating.',
      'They have accepted it and are more productive.',
      'They want to go back to the city.',
      'They work less than before.',
    ],
    1,
    "It's taught me to stop fighting my own rhythm, which, oddly enough, has made me more productive than I ever " +
      'was in the city.',
    'Mi ha insegnato a smettere di lottare contro il mio ritmo, e questo, stranamente, mi ha reso più produttivo ' +
      'di quanto fossi mai stato in città.',
  ),
]

export const EN_BANK: PlacementBank = {
  grammarTopics: GRAMMAR_TOPICS,
  questions: [...GRAMMAR, ...VOCABULARY, ...READING, ...LISTENING],
  passages: [
    MARTA,
    NOTE,
    LISBON,
    NOTICE,
    CYCLING,
    BERLIN,
    NEWS,
    FOUR_DAY_WEEK,
    TRAIN,
    VOICEMAIL,
    FLAT,
    SPORTS_CENTRE,
    UPDATE,
    WEATHER,
    HOUSING,
    FARM,
  ],
}
