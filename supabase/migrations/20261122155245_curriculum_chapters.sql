-- Structured curriculum: chapters of increasing difficulty (A1 -> B2), each with
-- four short lessons and a final test. The structure is fixed and shared by every
-- learner; lesson content is generated per learner (purpose, level) in a later step.

-- ---------------------------------------------------------------------------
-- chapters (was curriculum_topics)
-- ---------------------------------------------------------------------------
alter table public.curriculum_topics rename to chapters;
alter policy "curriculum_topics: read" on public.chapters rename to "chapters: read";

-- Placeholder topics from the local seed are replaced by the real curriculum.
delete from public.chapters;

alter table public.chapters
  add column description_it text not null default '',
  -- Grammar and themes of the chapter, in English, for content generation.
  add column grammar_focus text not null default '';

alter table public.sessions rename column topic_id to chapter_id;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id bigint generated always as identity primary key,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  sort_order integer not null,
  slug text not null unique,
  title text not null,
  -- What the lesson teaches, in English, for content generation.
  focus text not null,
  unique (chapter_id, sort_order)
);

create index lessons_chapter_idx on public.lessons (chapter_id);

alter table public.sessions
  add column lesson_id bigint references public.lessons (id) on delete set null;

-- ---------------------------------------------------------------------------
-- lesson_progress: completed lessons per learner
-- ---------------------------------------------------------------------------
create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  -- Share of exercises answered correctly, 0-100.
  score integer not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

revoke all on public.lessons, public.lesson_progress from anon, authenticated;
grant select on public.lessons to authenticated;
grant select, insert, update on public.lesson_progress to authenticated;

alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

create policy "lessons: read" on public.lessons
  for select to authenticated
  using (true);

create policy "lesson_progress: own rows" on public.lesson_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Curriculum data
-- ---------------------------------------------------------------------------
insert into public.chapters (level, sort_order, slug, title, description_it, grammar_focus) values
  ('A1', 1, 'a1-to-be', 'Presentarsi', 'Il verbo "to be", saluti, nazionalità, numeri e famiglia.', 'verb to be (am/is/are) affirmative, negative and questions; subject pronouns; greetings; countries and nationalities; numbers; possessive adjectives'),
  ('A1', 2, 'a1-things-around', 'Le cose intorno a me', 'Articoli, plurali, this/that e there is/are.', 'articles a/an/the; regular and irregular plurals; this/that/these/those; there is/there are; common objects, rooms and places'),
  ('A1', 3, 'a1-daily-routine', 'La mia giornata', 'Il present simple per parlare delle abitudini.', 'present simple affirmative (third person -s); daily routine verbs; telling the time; prepositions of time at/on/in; adverbs of frequency'),
  ('A1', 4, 'a1-questions', 'Domande e negazioni', 'Fare domande e rispondere al presente.', 'present simple questions and negatives with do/does; wh-questions; short answers; like/love/hate + -ing'),
  ('A1', 5, 'a1-can', 'Saper fare e chiedere', 'Can per capacità e richieste, l''imperativo e le indicazioni.', 'can/can''t for ability, requests and permission; imperatives; giving and asking for directions; prepositions of place'),
  ('A1', 6, 'a1-present-continuous', 'Che cosa stai facendo?', 'Il present continuous e la differenza con il present simple.', 'present continuous affirmative, negative and questions; present simple vs present continuous; clothes; weather'),
  ('A2', 1, 'a2-was-were', 'Ieri', 'Il passato del verbo "to be" e le espressioni di tempo.', 'was/were affirmative, negative and questions; there was/there were; past time expressions (yesterday, last week, ago)'),
  ('A2', 2, 'a2-past-simple', 'Raccontare il passato', 'Il past simple dei verbi regolari e irregolari.', 'past simple of regular (-ed) and common irregular verbs; questions and negatives with did; sequencing words (first, then, after that, finally)'),
  ('A2', 3, 'a2-food-quantities', 'Cibo e quantità', 'Nomi numerabili e non, some/any, much/many.', 'countable and uncountable nouns; some/any; much/many/a lot of; how much/how many; would like; ordering food'),
  ('A2', 4, 'a2-comparisons', 'Fare confronti', 'Comparativi, superlativi e as ... as.', 'comparative and superlative adjectives (regular and irregular); as ... as / not as ... as; describing places and people'),
  ('A2', 5, 'a2-future', 'Piani e futuro', 'Going to, present continuous per gli appuntamenti e will.', 'be going to for plans and predictions; present continuous for arrangements; will for decisions, offers and predictions; invitations'),
  ('A2', 6, 'a2-experiences', 'Esperienze', 'Il present perfect per le esperienze e le azioni recenti.', 'present perfect form; ever/never; been vs gone; just/already/yet; present perfect vs past simple'),
  ('B1', 1, 'b1-how-long', 'Da quanto tempo?', 'For e since, present perfect e present perfect continuous.', 'present perfect with for/since; present perfect continuous; how long; present perfect simple vs continuous'),
  ('B1', 2, 'b1-narrative', 'Raccontare una storia', 'Past continuous e past perfect nei racconti.', 'past continuous; past perfect; when/while/as; narrative tenses together; used to'),
  ('B1', 3, 'b1-conditionals', 'Se...', 'Zero, primo e secondo condizionale.', 'zero, first and second conditional; unless; if vs when; would for imaginary situations'),
  ('B1', 4, 'b1-passive', 'La forma passiva', 'Il passivo al presente, al passato e con i modali.', 'passive voice in present simple, past simple, present perfect and with modals; by + agent; when to use the passive'),
  ('B1', 5, 'b1-modals', 'Obblighi e consigli', 'Must, have to, should e i loro negativi.', 'must/have to/don''t have to/mustn''t; should/ought to; had better; could/might for possibility'),
  ('B1', 6, 'b1-reported-speech', 'Il discorso indiretto', 'Riferire affermazioni, domande e richieste.', 'reported statements with tense backshift; reported questions; reported requests and commands; say vs tell'),
  ('B2', 1, 'b2-conditionals', 'Rimpianti e ipotesi', 'Terzo condizionale, condizionali misti e wish.', 'third conditional; mixed conditionals; wish / if only for present and past regrets'),
  ('B2', 2, 'b2-deduction', 'Deduzioni', 'Must, might, can''t have per fare ipotesi sul passato.', 'modals of deduction in the present (must/might/can''t be) and past (must/might/can''t have + past participle)'),
  ('B2', 3, 'b2-relative-clauses', 'Frasi relative', 'Relative determinative, non determinative e pronomi.', 'defining and non-defining relative clauses; who/which/that/whose/where; omitting the relative pronoun; reduced relative clauses'),
  ('B2', 4, 'b2-gerunds-infinitives', 'Gerundio o infinito?', 'I verbi seguiti da -ing o da to.', 'verbs followed by gerund or infinitive; verbs that change meaning (remember, stop, try); prepositions + -ing; be used to / get used to'),
  ('B2', 5, 'b2-passive-causative', 'Farsi fare le cose', 'Passivo avanzato e forma causativa.', 'have/get something done; passive reporting structures (it is said that, he is believed to); passive with continuous and perfect forms'),
  ('B2', 6, 'b2-linking', 'Collegare le idee', 'Connettivi per argomentare e scrivere testi chiari.', 'linking words for contrast, cause, result and addition (although, despite, whereas, therefore, as a result); discourse markers in opinions');

insert into public.lessons (chapter_id, sort_order, slug, title, focus)
select c.id, l.sort_order, l.slug, l.title, l.focus
from (values
  ('a1-to-be', 1, 'a1-to-be-hello', 'Ciao, sono...', 'greetings and introducing yourself with I am / you are / he is / she is'),
  ('a1-to-be', 2, 'a1-to-be-where-from', 'Da dove vieni?', 'to be questions and negatives; countries and nationalities'),
  ('a1-to-be', 3, 'a1-to-be-numbers', 'Numeri ed età', 'numbers 1-100; How old are you?; phone numbers and prices'),
  ('a1-to-be', 4, 'a1-to-be-family', 'La mia famiglia', 'possessive adjectives my/your/his/her/our/their; family members'),
  ('a1-things-around', 1, 'a1-things-articles', 'Un oggetto, l''oggetto', 'a/an/the with everyday objects'),
  ('a1-things-around', 2, 'a1-things-plurals', 'Uno, due, tanti', 'regular and irregular plurals (people, children, men, women)'),
  ('a1-things-around', 3, 'a1-things-this-that', 'Questo e quello', 'this/that/these/those for near and far things'),
  ('a1-things-around', 4, 'a1-things-there-is', 'Cosa c''è nella stanza', 'there is/there are; rooms and furniture; prepositions in/on/under/next to'),
  ('a1-daily-routine', 1, 'a1-routine-verbs', 'Le mie abitudini', 'present simple with I/you/we/they; daily routine verbs'),
  ('a1-daily-routine', 2, 'a1-routine-third-person', 'Lui e lei', 'third person -s/-es/-ies; describing someone else''s day'),
  ('a1-daily-routine', 3, 'a1-routine-time', 'Che ore sono?', 'telling the time; at/on/in with times, days and months'),
  ('a1-daily-routine', 4, 'a1-routine-frequency', 'Sempre, a volte, mai', 'adverbs of frequency and their position'),
  ('a1-questions', 1, 'a1-questions-do-does', 'Do you...?', 'yes/no questions with do/does and short answers'),
  ('a1-questions', 2, 'a1-questions-negatives', 'Non mi piace', 'negatives with don''t/doesn''t'),
  ('a1-questions', 3, 'a1-questions-wh', 'Chi, cosa, dove, quando', 'wh-questions: what, where, when, who, why, how'),
  ('a1-questions', 4, 'a1-questions-likes', 'Gusti e passioni', 'like/love/hate/enjoy + -ing; talking about hobbies'),
  ('a1-can', 1, 'a1-can-ability', 'So nuotare', 'can/can''t for ability; skills and abilities'),
  ('a1-can', 2, 'a1-can-requests', 'Posso...?', 'can for requests and permission; polite requests'),
  ('a1-can', 3, 'a1-can-imperatives', 'Fai così', 'imperatives for instructions and advice'),
  ('a1-can', 4, 'a1-can-directions', 'Come arrivo a...?', 'asking for and giving directions; places in town; prepositions of place'),
  ('a1-present-continuous', 1, 'a1-continuous-now', 'In questo momento', 'present continuous affirmative for actions happening now'),
  ('a1-present-continuous', 2, 'a1-continuous-questions', 'Cosa stai facendo?', 'present continuous questions and negatives'),
  ('a1-present-continuous', 3, 'a1-continuous-vs-simple', 'Sempre o adesso?', 'present simple vs present continuous'),
  ('a1-present-continuous', 4, 'a1-continuous-clothes-weather', 'Vestiti e tempo', 'describing clothes and the weather'),
  ('a2-was-were', 1, 'a2-was-were-form', 'Dov''eri ieri?', 'was/were affirmative, negative and questions'),
  ('a2-was-were', 2, 'a2-was-were-time', 'Ieri, la settimana scorsa', 'past time expressions: yesterday, last..., ... ago, in 2010'),
  ('a2-was-were', 3, 'a2-was-were-there-was', 'C''era una volta', 'there was/there were; describing places in the past'),
  ('a2-was-were', 4, 'a2-was-were-born', 'Quando sei nato?', 'was born; dates and years; talking about childhood'),
  ('a2-past-simple', 1, 'a2-past-regular', 'Ho lavorato, ho giocato', 'past simple of regular verbs and -ed pronunciation'),
  ('a2-past-simple', 2, 'a2-past-irregular', 'I verbi irregolari', 'past simple of the most common irregular verbs'),
  ('a2-past-simple', 3, 'a2-past-questions', 'Did you...?', 'past simple questions and negatives with did'),
  ('a2-past-simple', 4, 'a2-past-story', 'Raccontare una giornata', 'sequencing words to tell a story: first, then, after that, finally'),
  ('a2-food-quantities', 1, 'a2-food-countable', 'Si contano o no?', 'countable and uncountable nouns; food and drinks'),
  ('a2-food-quantities', 2, 'a2-food-some-any', 'Un po'' di...', 'some/any in affirmative, negative and questions'),
  ('a2-food-quantities', 3, 'a2-food-much-many', 'Quanto? Quanti?', 'much/many/a lot of; how much/how many'),
  ('a2-food-quantities', 4, 'a2-food-restaurant', 'Al ristorante', 'would like; ordering food and paying the bill'),
  ('a2-comparisons', 1, 'a2-comparatives', 'Più grande, più bello', 'comparative adjectives (-er, more, irregular better/worse)'),
  ('a2-comparisons', 2, 'a2-superlatives', 'Il migliore', 'superlative adjectives (-est, most, best/worst)'),
  ('a2-comparisons', 3, 'a2-as-as', 'Tanto quanto', 'as ... as and not as ... as'),
  ('a2-comparisons', 4, 'a2-describing-places', 'Città a confronto', 'describing and comparing places'),
  ('a2-future', 1, 'a2-going-to', 'Cosa farai?', 'be going to for plans and intentions'),
  ('a2-future', 2, 'a2-arrangements', 'Appuntamenti', 'present continuous for fixed arrangements'),
  ('a2-future', 3, 'a2-will', 'Decido adesso', 'will for spontaneous decisions, offers and promises'),
  ('a2-future', 4, 'a2-invitations', 'Ti va di...?', 'making, accepting and refusing invitations'),
  ('a2-experiences', 1, 'a2-present-perfect-form', 'Ho visto, ho fatto', 'present perfect form with regular and irregular past participles'),
  ('a2-experiences', 2, 'a2-ever-never', 'Sei mai stato...?', 'ever/never for life experiences; been vs gone'),
  ('a2-experiences', 3, 'a2-just-already-yet', 'Appena, già, ancora', 'just/already/yet with the present perfect'),
  ('a2-experiences', 4, 'a2-perfect-vs-past', 'Quando o mai?', 'present perfect vs past simple'),
  ('b1-how-long', 1, 'b1-for-since', 'For o since?', 'present perfect with for and since'),
  ('b1-how-long', 2, 'b1-pp-continuous', 'Sto aspettando da ore', 'present perfect continuous form and use'),
  ('b1-how-long', 3, 'b1-simple-vs-continuous', 'Risultato o durata?', 'present perfect simple vs continuous'),
  ('b1-how-long', 4, 'b1-life-changes', 'Come è cambiata la mia vita', 'talking about life changes and how long things have lasted'),
  ('b1-narrative', 1, 'b1-past-continuous', 'Mentre camminavo...', 'past continuous for background actions; when/while'),
  ('b1-narrative', 2, 'b1-past-perfect', 'Era già partito', 'past perfect for earlier past actions'),
  ('b1-narrative', 3, 'b1-used-to', 'Da bambino...', 'used to for past habits and states'),
  ('b1-narrative', 4, 'b1-telling-stories', 'Una storia da raccontare', 'combining narrative tenses in a story'),
  ('b1-conditionals', 1, 'b1-zero-first', 'Se piove...', 'zero and first conditional; unless'),
  ('b1-conditionals', 2, 'b1-second', 'Se vincessi...', 'second conditional for imaginary situations'),
  ('b1-conditionals', 3, 'b1-first-vs-second', 'Possibile o immaginario?', 'first vs second conditional; if vs when'),
  ('b1-conditionals', 4, 'b1-advice-if', 'Se fossi in te', 'giving advice with If I were you'),
  ('b1-passive', 1, 'b1-passive-present', 'È fatto in Italia', 'present simple passive'),
  ('b1-passive', 2, 'b1-passive-past', 'Fu costruito nel...', 'past simple passive; by + agent'),
  ('b1-passive', 3, 'b1-passive-perfect-modals', 'È stato deciso', 'present perfect passive and passive with modals'),
  ('b1-passive', 4, 'b1-passive-use', 'Quando usare il passivo', 'choosing active or passive in news and descriptions'),
  ('b1-modals', 1, 'b1-must-have-to', 'Devo', 'must vs have to for obligation'),
  ('b1-modals', 2, 'b1-dont-have-to-mustnt', 'Non devo / non serve', 'mustn''t vs don''t have to'),
  ('b1-modals', 3, 'b1-should', 'Dovresti', 'should/ought to/had better for advice'),
  ('b1-modals', 4, 'b1-possibility', 'Forse', 'might/may/could for possibility'),
  ('b1-reported-speech', 1, 'b1-reported-statements', 'Ha detto che...', 'reported statements and tense backshift'),
  ('b1-reported-speech', 2, 'b1-say-tell', 'Say o tell?', 'say vs tell; changes of time and place words'),
  ('b1-reported-speech', 3, 'b1-reported-questions', 'Mi ha chiesto se...', 'reported questions'),
  ('b1-reported-speech', 4, 'b1-reported-requests', 'Mi ha detto di...', 'reported requests and commands'),
  ('b2-conditionals', 1, 'b2-third-conditional', 'Se l''avessi saputo', 'third conditional'),
  ('b2-conditionals', 2, 'b2-mixed-conditionals', 'Se avessi studiato, ora...', 'mixed conditionals'),
  ('b2-conditionals', 3, 'b2-wish-present', 'Vorrei che...', 'wish / if only for present situations'),
  ('b2-conditionals', 4, 'b2-wish-past', 'Rimpianti', 'wish / if only for past regrets'),
  ('b2-deduction', 1, 'b2-deduction-present', 'Deve essere lui', 'must/might/can''t be for present deductions'),
  ('b2-deduction', 2, 'b2-deduction-past', 'Deve aver dimenticato', 'must/might/can''t have + past participle'),
  ('b2-deduction', 3, 'b2-should-have', 'Avresti dovuto', 'should have / could have for criticism and missed chances'),
  ('b2-deduction', 4, 'b2-speculating', 'Fare ipotesi', 'speculating about mysteries and situations'),
  ('b2-relative-clauses', 1, 'b2-defining', 'La persona che...', 'defining relative clauses; who/which/that/where/whose'),
  ('b2-relative-clauses', 2, 'b2-non-defining', 'Che, tra l''altro...', 'non-defining relative clauses and commas'),
  ('b2-relative-clauses', 3, 'b2-omitting-pronoun', 'Senza il pronome', 'omitting the relative pronoun; prepositions in relative clauses'),
  ('b2-relative-clauses', 4, 'b2-reduced-relatives', 'Frasi più brevi', 'reduced relative clauses with -ing and past participles'),
  ('b2-gerunds-infinitives', 1, 'b2-verb-ing', 'Verbi + -ing', 'verbs followed by the gerund'),
  ('b2-gerunds-infinitives', 2, 'b2-verb-to', 'Verbi + to', 'verbs followed by the infinitive'),
  ('b2-gerunds-infinitives', 3, 'b2-meaning-change', 'Remember, stop, try', 'verbs that change meaning with -ing or to'),
  ('b2-gerunds-infinitives', 4, 'b2-used-to-get-used-to', 'Abituarsi', 'be used to / get used to + -ing vs used to'),
  ('b2-passive-causative', 1, 'b2-have-done', 'Farsi tagliare i capelli', 'have something done'),
  ('b2-passive-causative', 2, 'b2-get-done', 'Get something done', 'get something done; causative in everyday situations'),
  ('b2-passive-causative', 3, 'b2-reporting-passive', 'Si dice che...', 'it is said that / he is believed to be'),
  ('b2-passive-causative', 4, 'b2-passive-continuous-perfect', 'Sta per essere fatto', 'passive with continuous and perfect forms'),
  ('b2-linking', 1, 'b2-contrast', 'Eppure', 'contrast: although, even though, despite, in spite of, whereas'),
  ('b2-linking', 2, 'b2-cause-result', 'Perciò', 'cause and result: because of, due to, therefore, as a result'),
  ('b2-linking', 3, 'b2-addition', 'Inoltre', 'addition and examples: moreover, furthermore, such as'),
  ('b2-linking', 4, 'b2-opinions', 'Secondo me', 'expressing and supporting opinions with discourse markers')
) as l (chapter_slug, sort_order, slug, title, focus)
join public.chapters c on c.slug = l.chapter_slug;
