import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord, prefetchSpeech, stopSpeaking } from '../../lib/audio'
import { NoMicrophone } from '../../components/NoMicrophone'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity, useStudyTimer } from '../study/useStudyTimer'
import { addToReview, fetchLessonProgress, getLesson, prefetchChapter, recordLessonStats, savePart } from './api'
import { ChapterStats, StatsGrid } from './ChapterStats'
import { Dictation } from './DictationExercise'
import { dictationSentences, type DictationSentence } from './dictation'
import { LessonDialogue } from './LessonDialogue'
import { MultipleChoice } from './MultipleChoice'
import {
  clearResume,
  initialPart,
  loadResume,
  otherPart,
  PART_LABEL,
  partDone,
  repeatSentences,
  saveResume,
  tallyToStats,
  type LessonPart,
  type PartStats,
} from './parts'
import { addAnswer, comprehensionQuiz, EMPTY_TALLY, phraseQuiz, type QuizTally, verbQuiz, wordQuiz } from './quiz'
import { RepeatExercise } from './RepeatExercise'
import { summarizeStats } from './stats'
import {
  DictationIntro,
  GrammarView,
  ListeningView,
  PhrasesView,
  ReadingView,
  RepeatIntro,
  VerbsView,
  WordsView,
} from './sections'
import type { LessonContent, QuizQuestion } from './types'
import { BackButton } from '../../components/BackButton'
import { Waiting } from '../../components/Waiting'

interface LessonPageProps {
  userId: string
  lessonId: number
  /** Next lesson of the same chapter, if any. */
  nextLessonId?: number
  /** Chapter after this one: prepared in the background when its last lesson is opened. */
  nextChapterId?: number
  onOpenLesson: (lessonId: number) => void
  onExit: () => void
}

interface Section {
  key: string
  title: string
  learn: (showAll: boolean) => ReactNode
  quiz: QuizQuestion[]
  /** Dictation sentences, for sections that are written from what was heard instead of multiple choice. */
  dictation?: DictationSentence[]
  /** Sentences to read aloud, graded by their pronunciation (oral part). */
  repeat?: DictationSentence[]
  /** Keep the learning material visible while answering (listening, reading). */
  keepDuringQuiz?: boolean
}

function exerciseCount(section: Section): number {
  return section.dictation?.length ?? section.repeat?.length ?? section.quiz.length
}

/**
 * The sections of one part; each part then ends with the dialogue with the tutor (written or spoken).
 * Written: grammar, words, expressions, verbs, dictation, reading. Oral: listening, repeating sentences aloud.
 */
function sectionsFor(content: LessonContent, part: LessonPart): Section[] {
  if (part === 'oral') {
    const repeat = repeatSentences(content)
    return [
      {
        key: 'listening',
        title: 'Ascolto',
        learn: (showAll) => <ListeningView content={content} showText={showAll} />,
        quiz: comprehensionQuiz(content.listening.questions),
        keepDuringQuiz: true,
      },
      ...(repeat.length
        ? [{ key: 'repeat', title: 'Ripeti la frase', learn: () => <RepeatIntro count={repeat.length} />, quiz: [], repeat }]
        : []),
    ]
  }
  const dictation = dictationSentences(content)
  return [
    { key: 'grammar', title: 'Grammatica', learn: () => <GrammarView content={content} />, quiz: [] },
    { key: 'words', title: 'Parole nuove', learn: () => <WordsView content={content} />, quiz: wordQuiz(content) },
    {
      key: 'phrases',
      title: 'Espressioni e modi di dire',
      learn: () => <PhrasesView content={content} />,
      quiz: phraseQuiz(content),
    },
    { key: 'verbs', title: 'Verbi', learn: () => <VerbsView content={content} />, quiz: verbQuiz(content) },
    ...(dictation.length
      ? [{ key: 'dictation', title: 'Dettato', learn: () => <DictationIntro count={dictation.length} />, quiz: [], dictation }]
      : []),
    {
      key: 'reading',
      title: 'Lettura',
      learn: () => <ReadingView content={content} />,
      quiz: comprehensionQuiz(content.reading.questions),
      keepDuringQuiz: true,
    },
  ]
}

type Phase = { kind: 'learn' } | { kind: 'quiz'; index: number }

/** Where the learner is in one part. */
interface PartState {
  sectionIndex: number
  phase: Phase
  tally: QuizTally
}

const START: PartState = { sectionIndex: 0, phase: { kind: 'learn' }, tally: EMPTY_TALLY }

function resumedState(lessonId: number, part: LessonPart): PartState {
  const resume = loadResume(lessonId, part)
  return { sectionIndex: resume.sectionIndex, phase: { kind: 'learn' }, tally: resume.tally }
}

/** A part just finished: shown until the learner moves on. */
interface Finished {
  part: LessonPart
  stats: PartStats
  /** Distinguishes two finishes of the same part (it can be redone). */
  at: number
}

export function LessonPage({ userId, lessonId, nextLessonId, nextChapterId, onOpenLesson, onExit }: LessonPageProps) {
  const lesson = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => getLesson(lessonId), staleTime: Infinity })
  const progress = useQuery({ queryKey: ['lesson-progress-row', lessonId], queryFn: () => fetchLessonProgress(lessonId) })
  const timer = useStudyTimer()
  const voice = canRecord()
  const [chosenPart, setChosenPart] = useState<LessonPart | null>(null)
  const [states, setStates] = useState<Record<LessonPart, PartState>>(() => ({
    written: resumedState(lessonId, 'written'),
    oral: resumedState(lessonId, 'oral'),
  }))
  const [finished, setFinished] = useState<Finished | null>(null)

  // The part opened first: the one still to do, or the one the daily timer suggests.
  const part: LessonPart =
    chosenPart ?? initialPart(progress.data, voice ? timer.status.recommendedMode : 'written')
  // The clock runs only while studying: not on the end-of-part summary, nor on the "microphone needed" notice.
  const { markActivity } = useStudyActivity(finished || (part === 'oral' && !voice) ? null : part)

  const content = lesson.data?.content
  const sections = useMemo(() => (content ? sectionsFor(content, part) : []), [content, part])
  const state = states[part]

  // Keep the point reached in each part on the device, so leaving the lesson does not lose it.
  useEffect(() => {
    saveResume(lessonId, 'written', { sectionIndex: states.written.sectionIndex, tally: states.written.tally })
    saveResume(lessonId, 'oral', { sectionIndex: states.oral.sectionIndex, tally: states.oral.tally })
  }, [lessonId, states])

  // Audio the learner has to hear anyway (listening passage, dictation, sentences to repeat): prepare it now,
  // so the tap plays at once instead of waiting for the voice to be generated.
  useEffect(() => {
    if (!content) return
    void prefetchSpeech([
      content.listening.text_en,
      ...dictationSentences(content).map((d) => d.en),
      ...repeatSentences(content).map((d) => d.en),
    ])
  }, [content])

  // Last lesson of the chapter: get the next chapter's lessons ready.
  useEffect(() => {
    if (nextLessonId === undefined && nextChapterId !== undefined) prefetchChapter(nextChapterId)
  }, [nextLessonId, nextChapterId])

  if (lesson.isPending || progress.isPending) {
    return (
      <Shell onExit={onExit} title="Lezione">
        <Waiting
          title="Preparo la lezione per te"
          hints={[
            'La prima volta può richiedere qualche secondo.',
            'Scelgo parole ed esempi adatti al tuo scopo.',
            'Scrivo il dialogo con il tutor.',
          ]}
        />
      </Shell>
    )
  }
  if (lesson.isError || progress.isError) {
    return (
      <Shell onExit={onExit} title="Lezione">
        <p className="error">{lesson.error?.message ?? 'Non riesco a leggere i tuoi progressi. Riprova tra poco.'}</p>
      </Shell>
    )
  }

  const { content: lessonContent, lesson: meta } = lesson.data
  const row = progress.data
  const section = sections[state.sectionIndex]
  const inDialogue = state.sectionIndex === sections.length
  const blockedByMic = part === 'oral' && !voice

  function update(next: (s: PartState) => PartState) {
    setStates((all) => ({ ...all, [part]: next(all[part]) }))
  }

  function switchPart(next: LessonPart) {
    stopSpeaking()
    setFinished(null)
    setChosenPart(next)
  }

  function nextSection() {
    stopSpeaking()
    update((s) => ({ ...s, sectionIndex: s.sectionIndex + 1, phase: { kind: 'learn' } }))
  }

  function advance() {
    if (!section || state.phase.kind !== 'quiz') return
    if (state.phase.index + 1 < exerciseCount(section)) {
      const index = state.phase.index + 1
      update((s) => ({ ...s, phase: { kind: 'quiz', index } }))
    } else nextSection()
  }

  function answer(correct: boolean) {
    update((s) => ({ ...s, tally: addAnswer(s.tally, correct) }))
  }

  function finishPart() {
    stopSpeaking()
    setFinished({ part, stats: tallyToStats(state.tally), at: Date.now() })
    // The part starts over next time (to practise again); its result is saved by PartDone.
    clearResume(lessonId, part)
    update(() => START)
  }

  const totalSteps = sections.length + 1
  const phase = state.phase

  return (
    <Shell
      onExit={onExit}
      title={meta.title}
      progress={
        <>
          <div className="segmented part-tabs" role="group" aria-label="Parte della lezione">
            {(['written', 'oral'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={p === part} onClick={() => switchPart(p)}>
                {PART_LABEL[p]}
                {partDone(row, p) && <span aria-label=" (fatta)"> ✓</span>}
              </button>
            ))}
          </div>
          {!finished && !blockedByMic && (
            <div className="placement-progress">
              <small>
                {inDialogue ? 'Dialogo' : section?.title} · passo {Math.min(state.sectionIndex + 1, totalSteps)} di{' '}
                {totalSteps}
              </small>
              <div className="bar">
                <span style={{ width: `${(state.sectionIndex / totalSteps) * 100}%` }} />
              </div>
            </div>
          )}
        </>
      }
      resetKey={`${part}-${state.sectionIndex}-${phase.kind}-${phase.kind === 'quiz' ? phase.index : 0}-${finished?.at ?? 0}`}
    >
      <StudyTimerBar />
      <StudyPrompts onSwitchToOral={voice ? () => switchPart('oral') : undefined} onExit={onExit} />

      {finished ? (
        <PartDone
          key={finished.at}
          userId={userId}
          lessonId={meta.id}
          chapterId={meta.chapter_id}
          content={lessonContent}
          finished={finished}
          nextLessonId={nextLessonId}
          onSwitchPart={switchPart}
          onOpenLesson={onOpenLesson}
          onExit={onExit}
        />
      ) : blockedByMic ? (
        <NoMicrophone
          title="Per la parte orale serve il microfono"
          why="La lezione si conclude solo con la parte scritta e quella orale: esercitarsi in una sola delle due non basta per imparare bene la lingua."
        />
      ) : (
        <>
          {partDone(row, part) && state.sectionIndex === 0 && phase.kind === 'learn' && (
            <p className="notice">
              Hai già fatto la parte {part === 'oral' ? 'orale' : 'scritta'} di questa lezione: puoi rifarla per
              ripassare.
            </p>
          )}

          {section && phase.kind === 'learn' && (
            <section>
              <h2>{section.title}</h2>
              {section.learn(false)}
              <button
                type="button"
                className="next-step"
                onClick={() =>
                  exerciseCount(section) ? update((s) => ({ ...s, phase: { kind: 'quiz', index: 0 } })) : nextSection()
                }
              >
                {exerciseCount(section) ? 'Mettiti alla prova' : 'Avanti'}
              </button>
            </section>
          )}

          {section && phase.kind === 'quiz' && section.dictation?.[phase.index] && (
            <section>
              <h2>
                {section.title}: frase {phase.index + 1} di {section.dictation.length}
              </h2>
              <Dictation
                key={`${section.key}-${phase.index}`}
                sentence={section.dictation[phase.index] as DictationSentence}
                onAttempt={answer}
                onTextShown={() => answer(false)}
                onDone={advance}
              />
            </section>
          )}

          {section && phase.kind === 'quiz' && section.repeat?.[phase.index] && (
            <section>
              <h2>
                {section.title}: frase {phase.index + 1} di {section.repeat.length}
              </h2>
              <RepeatExercise
                key={`${section.key}-${phase.index}`}
                sentence={section.repeat[phase.index] as DictationSentence}
                onAnswered={answer}
                onDone={advance}
              />
            </section>
          )}

          {section && phase.kind === 'quiz' && section.quiz[phase.index] && (
            <section>
              <h2>
                {section.title}: domanda {phase.index + 1} di {section.quiz.length}
              </h2>
              {section.keepDuringQuiz && section.learn(false)}
              <MultipleChoice
                key={`${section.key}-${phase.index}`}
                question={section.quiz[phase.index] as QuizQuestion}
                onAnswered={(correct) => {
                  answer(correct)
                  advance()
                }}
              />
            </section>
          )}

          {inDialogue && (
            <section>
              <h2>{part === 'oral' ? 'Dialogo a voce' : 'Dialogo scritto'}</h2>
              <LessonDialogue
                key={part}
                lessonId={meta.id}
                scenario={lessonContent.dialogue.scenario_it}
                opening={lessonContent.dialogue.opening_en}
                mode={part}
                onActivity={markActivity}
                onFinished={finishPart}
              />
            </section>
          )}
        </>
      )}
    </Shell>
  )
}


interface PartDoneProps {
  userId: string
  lessonId: number
  chapterId: number
  content: LessonContent
  finished: Finished
  nextLessonId?: number
  onSwitchPart: (part: LessonPart) => void
  onOpenLesson: (lessonId: number) => void
  onExit: () => void
}

/** End of a part: saves it and, when the other part is done too, completes the lesson. */
function PartDone({
  userId,
  lessonId,
  chapterId,
  content,
  finished,
  nextLessonId,
  onSwitchPart,
  onOpenLesson,
  onExit,
}: PartDoneProps) {
  const { part, stats } = finished
  const other = otherPart(part)
  const lastOfChapter = nextLessonId === undefined
  const queryClient = useQueryClient()
  const started = useRef(false)
  const save = useMutation({
    mutationFn: async () => {
      const saved = await savePart(lessonId, part, stats)
      if (!saved.completed || !saved.total) return { ...saved, added: 0 }
      await recordLessonStats(lessonId, saved.total)
      const added = await addToReview(userId, [
        ...content.words,
        ...content.phrases,
        ...content.idioms.map((i) => ({ en: i.en, it: i.meaning_it })),
      ])
      return { ...saved, added }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-progress-row', lessonId] })
      void queryClient.invalidateQueries({ queryKey: ['lesson-progress'] })
      void queryClient.invalidateQueries({ queryKey: ['review'] })
      void queryClient.invalidateQueries({ queryKey: ['chapter-stats', chapterId] })
    },
  })

  const { mutate } = save
  // Save once when the part ends (the ref guards against StrictMode double effects).
  useEffect(() => {
    if (started.current) return
    started.current = true
    mutate()
  }, [mutate])

  const completed = save.data?.completed === true
  const shown = completed && save.data?.total ? save.data.total : stats

  return (
    <section className="success-card notice">
      <h2>{completed ? 'Lezione completata' : `Parte ${part === 'oral' ? 'orale' : 'scritta'} completata`}</h2>
      {shown.answers > 0 && (
        <>
          <h3 className="small-heading">
            {completed ? 'Tutta la lezione' : 'Questa parte'} ({shown.answers} risposte)
          </h3>
          <StatsGrid summary={summarizeStats([{ lesson_id: lessonId, ...shown }])} />
        </>
      )}
      {save.isPending && <Waiting title="Salvo i progressi" compact />}
      {save.isError && (
        <p className="error">
          Non sono riuscito a salvare i progressi.{' '}
          <button type="button" className="link" onClick={() => save.mutate()}>
            Riprova
          </button>
        </p>
      )}

      {save.isSuccess && !completed && (
        <>
          <p>
            Per concludere la lezione manca la parte {other === 'oral' ? 'orale' : 'scritta'}: servono tutte e due per
            imparare bene la lingua.
          </p>
          {other === 'oral' && !canRecord() ? (
            <p className="muted">
              Su questo dispositivo il microfono non è disponibile: per la parte orale apri Kern Sprache sul telefono.
            </p>
          ) : (
            <div className="stack">
              <button type="button" onClick={() => onSwitchPart(other)}>
                Passa alla parte {other === 'oral' ? 'orale' : 'scritta'}
              </button>
              <button type="button" className="link" onClick={onExit}>
                Torna al percorso
              </button>
            </div>
          )}
        </>
      )}

      {save.isSuccess && completed && (
        <>
          <p>
            {save.data.added > 0
              ? `${save.data.added} tra parole ed espressioni aggiunte al ripasso.`
              : 'Le parole di questa lezione erano già nel ripasso.'}
          </p>
          {/* Last lesson: the chapter's totals, read back once this lesson is saved. */}
          {lastOfChapter && <ChapterStats chapterId={chapterId} title="Il capitolo in numeri" />}
          <div className="stack">
            {nextLessonId !== undefined && (
              <button type="button" onClick={() => onOpenLesson(nextLessonId)}>
                Prossima lezione
              </button>
            )}
            <button type="button" className={nextLessonId !== undefined ? 'link' : undefined} onClick={onExit}>
              Torna al percorso
            </button>
          </div>
        </>
      )}
    </section>
  )
}

interface ShellProps {
  title: string
  onExit: () => void
  /** Pinned under the title, like the title itself. */
  progress?: ReactNode
  /** When it changes the content scrolls back to the top (next question, next part). */
  resetKey?: string
  children: ReactNode
}

/** Title and progress stay put; only the lesson content scrolls, so the answer and Avanti are never off screen. */
function Shell({ title, onExit, progress, resetKey, children }: ShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [resetKey])
  return (
    <main className="page lesson">
      <header className="lesson-header">
        <BackButton onBack={onExit} title="Indietro: il punto raggiunto resta salvato" />
        <h1>{title}</h1>
      </header>
      {progress}
      <div className="lesson-body" ref={bodyRef}>
        {children}
      </div>
    </main>
  )
}
