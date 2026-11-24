import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord, prefetchSpeech, stopSpeaking } from '../../lib/audio'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity, useStudyTimer } from '../study/useStudyTimer'
import { addToReview, completeLesson, getLesson, prefetchChapter, recordLessonStats } from './api'
import { ChapterStats, StatsGrid } from './ChapterStats'
import { Dictation } from './DictationExercise'
import { dictationSentences, type DictationSentence } from './dictation'
import { LessonDialogue } from './LessonDialogue'
import { MultipleChoice } from './MultipleChoice'
import {
  addAnswer,
  comprehensionQuiz,
  EMPTY_TALLY,
  lessonScore,
  phraseQuiz,
  type QuizTally,
  verbQuiz,
  wordQuiz,
} from './quiz'
import { summarizeStats } from './stats'
import { DictationIntro, GrammarView, ListeningView, PhrasesView, ReadingView, VerbsView, WordsView } from './sections'
import type { LessonContent, QuizQuestion } from './types'
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
  /** Keep the learning material visible while answering (listening, reading). */
  keepDuringQuiz?: boolean
}

function exerciseCount(section: Section): number {
  return section.dictation?.length ?? section.quiz.length
}

function sectionsFor(content: LessonContent): Section[] {
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
    {
      key: 'listening',
      title: 'Ascolto',
      learn: (showAll) => <ListeningView content={content} showText={showAll} />,
      quiz: comprehensionQuiz(content.listening.questions),
      keepDuringQuiz: true,
    },
    ...(dictation.length
      ? [
          {
            key: 'dictation',
            title: 'Dettato',
            learn: () => <DictationIntro count={dictation.length} />,
            quiz: [],
            dictation,
          },
        ]
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

export function LessonPage({ userId, lessonId, nextLessonId, nextChapterId, onOpenLesson, onExit }: LessonPageProps) {
  const lesson = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => getLesson(lessonId), staleTime: Infinity })
  const timer = useStudyTimer()
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>(
    canRecord() ? timer.status.recommendedMode : 'written',
  )
  const [sectionIndex, setSectionIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'learn' })
  const [tally, setTally] = useState<QuizTally>(EMPTY_TALLY)
  const sections = useMemo(() => (lesson.data ? sectionsFor(lesson.data.content) : []), [lesson.data])
  const inDialogue = sectionIndex === sections.length
  const { markActivity } = useStudyActivity(inDialogue && dialogueMode === 'oral' ? 'oral' : 'written')

  // Audio the learner has to hear anyway (listening passage, dictation): prepare it now, so the
  // tap plays at once instead of waiting for the voice to be generated.
  const lessonContent = lesson.data?.content
  useEffect(() => {
    if (!lessonContent) return
    void prefetchSpeech([lessonContent.listening.text_en, ...dictationSentences(lessonContent).map((d) => d.en)])
  }, [lessonContent])

  // Last lesson of the chapter: get the next chapter's lessons ready.
  useEffect(() => {
    if (nextLessonId === undefined && nextChapterId !== undefined) prefetchChapter(nextChapterId)
  }, [nextLessonId, nextChapterId])

  if (lesson.isPending) {
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
  if (lesson.isError) {
    return (
      <Shell onExit={onExit} title="Lezione">
        <p className="error">{lesson.error.message}</p>
      </Shell>
    )
  }

  const { content, lesson: meta } = lesson.data
  const section = sections[sectionIndex]

  function nextSection() {
    stopSpeaking()
    setSectionIndex((i) => i + 1)
    setPhase({ kind: 'learn' })
  }

  function advance() {
    if (!section || phase.kind !== 'quiz') return
    if (phase.index + 1 < exerciseCount(section)) setPhase({ kind: 'quiz', index: phase.index + 1 })
    else nextSection()
  }

  function onAnswered(correct: boolean) {
    setTally((t) => addAnswer(t, correct))
    advance()
  }

  const done = sectionIndex > sections.length
  const totalSteps = sections.length + 1

  return (
    <Shell
      onExit={onExit}
      title={meta.title}
      progress={
        !done && (
          <div className="placement-progress">
            <small>
              {inDialogue ? 'Dialogo' : section?.title} · parte {Math.min(sectionIndex + 1, totalSteps)} di {totalSteps}
            </small>
            <div className="bar">
              <span style={{ width: `${(sectionIndex / totalSteps) * 100}%` }} />
            </div>
          </div>
        )
      }
      resetKey={`${sectionIndex}-${phase.kind}-${phase.kind === 'quiz' ? phase.index : 0}`}
    >
      <StudyTimerBar />
      <StudyPrompts onSwitchToOral={canRecord() ? () => setDialogueMode('oral') : undefined} onExit={onExit} />

      {section && phase.kind === 'learn' && (
        <section>
          <h2>{section.title}</h2>
          {section.learn(false)}
          <button
            type="button"
            className="next-step"
            onClick={() => (exerciseCount(section) ? setPhase({ kind: 'quiz', index: 0 }) : nextSection())}
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
            onAttempt={(correct) => setTally((t) => addAnswer(t, correct))}
            onTextShown={() => setTally((t) => addAnswer(t, false))}
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
            onAnswered={onAnswered}
          />
        </section>
      )}

      {inDialogue && (
        <section>
          <h2>Dialogo</h2>
          <LessonDialogue
            lessonId={meta.id}
            scenario={content.dialogue.scenario_it}
            opening={content.dialogue.opening_en}
            mode={dialogueMode}
            onModeChange={setDialogueMode}
            onActivity={markActivity}
            onFinished={() => setSectionIndex((i) => i + 1)}
          />
        </section>
      )}

      {done && (
        <LessonDone
          userId={userId}
          lessonId={meta.id}
          chapterId={meta.chapter_id}
          content={content}
          tally={tally}
          nextLessonId={nextLessonId}
          onOpenLesson={onOpenLesson}
          onExit={onExit}
        />
      )}
    </Shell>
  )
}

interface LessonDoneProps {
  userId: string
  lessonId: number
  chapterId: number
  content: LessonContent
  tally: QuizTally
  nextLessonId?: number
  onOpenLesson: (lessonId: number) => void
  onExit: () => void
}

function LessonDone({
  userId,
  lessonId,
  chapterId,
  content,
  tally,
  nextLessonId,
  onOpenLesson,
  onExit,
}: LessonDoneProps) {
  const score = lessonScore(tally.correct, tally.answered)
  const lastOfChapter = nextLessonId === undefined
  const queryClient = useQueryClient()
  const started = useRef(false)
  const save = useMutation({
    mutationFn: async () => {
      await completeLesson(lessonId, score)
      await recordLessonStats(lessonId, { answers: tally.answered, correct: tally.correct, bestStreak: tally.bestStreak })
      return addToReview(userId, [
        ...content.words,
        ...content.phrases,
        ...content.idioms.map((i) => ({ en: i.en, it: i.meaning_it })),
      ])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-progress'] })
      void queryClient.invalidateQueries({ queryKey: ['review'] })
      void queryClient.invalidateQueries({ queryKey: ['chapter-stats', chapterId] })
    },
  })

  const { mutate } = save
  // Save once when the lesson ends (the ref guards against StrictMode double effects).
  useEffect(() => {
    if (started.current) return
    started.current = true
    mutate()
  }, [mutate])

  return (
    <section className="success-card notice">
      <h2>Lezione completata</h2>
      {tally.answered > 0 && <h3 className="small-heading">Questa lezione ({tally.answered} risposte)</h3>}
      {tally.answered > 0 && (
        <StatsGrid
          summary={summarizeStats([
            { lesson_id: lessonId, answers: tally.answered, correct: tally.correct, best_streak: tally.bestStreak },
          ])}
        />
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
      {save.isSuccess && (
        <p>
          {save.data > 0
            ? `${save.data} tra parole ed espressioni aggiunte al ripasso.`
            : 'Le parole di questa lezione erano già nel ripasso.'}
        </p>
      )}
      {/* Last lesson: the chapter's totals, read back once this lesson is saved. */}
      {lastOfChapter && save.isSuccess && <ChapterStats chapterId={chapterId} title="Il capitolo in numeri" />}
      <div className="stack">
        {nextLessonId !== undefined && (
          <button type="button" disabled={!save.isSuccess} onClick={() => onOpenLesson(nextLessonId)}>
            Prossima lezione
          </button>
        )}
        <button type="button" className={nextLessonId !== undefined ? 'link' : undefined} onClick={onExit}>
          Torna al percorso
        </button>
      </div>
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
      <header className="row">
        <h1>{title}</h1>
        <button
          type="button"
          className="link"
          onClick={() => {
            stopSpeaking()
            onExit()
          }}
        >
          Esci
        </button>
      </header>
      {progress}
      <div className="lesson-body" ref={bodyRef}>
        {children}
      </div>
    </main>
  )
}
