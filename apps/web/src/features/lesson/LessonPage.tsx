import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { canRecord, stopSpeaking } from '../../lib/audio'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity, useStudyTimer } from '../study/useStudyTimer'
import { addToReview, completeLesson, getLesson, prefetchChapter } from './api'
import { LessonDialogue } from './LessonDialogue'
import { MultipleChoice } from './MultipleChoice'
import { comprehensionQuiz, lessonScore, phraseQuiz, verbQuiz, wordQuiz } from './quiz'
import { GrammarView, ListeningView, PhrasesView, ReadingView, VerbsView, WordsView } from './sections'
import type { LessonContent, QuizQuestion } from './types'

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
  /** Keep the learning material visible while answering (listening, reading). */
  keepDuringQuiz?: boolean
}

function sectionsFor(content: LessonContent): Section[] {
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
  const [score, setScore] = useState({ correct: 0, answered: 0 })
  const sections = useMemo(() => (lesson.data ? sectionsFor(lesson.data.content) : []), [lesson.data])
  const inDialogue = sectionIndex === sections.length
  const { markActivity } = useStudyActivity(inDialogue && dialogueMode === 'oral' ? 'oral' : 'written')

  // Last lesson of the chapter: get the next chapter's lessons ready.
  useEffect(() => {
    if (nextLessonId === undefined && nextChapterId !== undefined) prefetchChapter(nextChapterId)
  }, [nextLessonId, nextChapterId])

  if (lesson.isPending) {
    return (
      <Shell onExit={onExit} title="Lezione">
        <p>Preparo la lezione per te… (la prima volta può richiedere qualche secondo)</p>
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

  function onAnswered(correct: boolean) {
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), answered: s.answered + 1 }))
    if (!section || phase.kind !== 'quiz') return
    if (phase.index + 1 < section.quiz.length) setPhase({ kind: 'quiz', index: phase.index + 1 })
    else nextSection()
  }

  const done = sectionIndex > sections.length
  const totalSteps = sections.length + 1

  return (
    <Shell onExit={onExit} title={meta.title}>
      <StudyTimerBar />
      <StudyPrompts onSwitchToOral={canRecord() ? () => setDialogueMode('oral') : undefined} onExit={onExit} />

      {!done && (
        <div className="placement-progress">
          <small>
            {inDialogue ? 'Dialogo' : section?.title} · parte {Math.min(sectionIndex + 1, totalSteps)} di {totalSteps}
          </small>
          <div className="bar">
            <span style={{ width: `${(sectionIndex / totalSteps) * 100}%` }} />
          </div>
        </div>
      )}

      {section && phase.kind === 'learn' && (
        <section>
          <h2>{section.title}</h2>
          {section.learn(false)}
          <button
            type="button"
            className="next-step"
            onClick={() => (section.quiz.length ? setPhase({ kind: 'quiz', index: 0 }) : nextSection())}
          >
            {section.quiz.length ? 'Mettiti alla prova' : 'Avanti'}
          </button>
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
          content={content}
          score={lessonScore(score.correct, score.answered)}
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
  content: LessonContent
  score: number
  nextLessonId?: number
  onOpenLesson: (lessonId: number) => void
  onExit: () => void
}

function LessonDone({ userId, lessonId, content, score, nextLessonId, onOpenLesson, onExit }: LessonDoneProps) {
  const queryClient = useQueryClient()
  const started = useRef(false)
  const save = useMutation({
    mutationFn: async () => {
      await completeLesson(lessonId, score)
      return addToReview(userId, [
        ...content.words,
        ...content.phrases,
        ...content.idioms.map((i) => ({ en: i.en, it: i.meaning_it })),
      ])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-progress'] })
      void queryClient.invalidateQueries({ queryKey: ['review'] })
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
      <p>
        Risposte giuste: <strong>{score}%</strong>.
      </p>
      {save.isPending && <p className="muted">Salvo i progressi…</p>}
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

function Shell({ title, onExit, children }: { title: string; onExit: () => void; children: ReactNode }) {
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
      {children}
    </main>
  )
}
