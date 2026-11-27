import { useStudiedLanguage } from '../languages/useLanguage'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { i18n } from '../../i18n'
import { canRecord, prefetchSpeech, stopSpeaking } from '../../lib/audio'
import { NoMicrophone } from '../../components/NoMicrophone'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity, useStudyTimer } from '../study/useStudyTimer'
import { addToReview, fetchLessonProgress, saveDictationResult, getLesson, prefetchChapter, recordLessonStats, savePart } from './api'
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
  LessonNotes,
  LightBulbIcon,
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
        title: i18n.t('sections.listening', { ns: 'lesson' }),
        learn: (showAll) => <ListeningView content={content} showText={showAll} />,
        quiz: comprehensionQuiz(content.listening.questions),
        keepDuringQuiz: true,
      },
      ...(repeat.length
        ? [{ key: 'repeat', title: i18n.t('sections.repeat', { ns: 'lesson' }), learn: () => <RepeatIntro count={repeat.length} />, quiz: [], repeat }]
        : []),
    ]
  }
  const dictation = dictationSentences(content)
  return [
    { key: 'grammar', title: i18n.t('sections.grammar', { ns: 'lesson' }), learn: () => <GrammarView content={content} />, quiz: [] },
    { key: 'words', title: i18n.t('sections.words', { ns: 'lesson' }), learn: () => <WordsView content={content} />, quiz: wordQuiz(content) },
    {
      key: 'phrases',
      title: i18n.t('sections.phrases', { ns: 'lesson' }),
      learn: () => <PhrasesView content={content} />,
      quiz: phraseQuiz(content),
    },
    { key: 'verbs', title: i18n.t('sections.verbs', { ns: 'lesson' }), learn: () => <VerbsView content={content} />, quiz: verbQuiz(content) },
    ...(dictation.length
      ? [{ key: 'dictation', title: i18n.t('sections.dictation', { ns: 'lesson' }), learn: () => <DictationIntro count={dictation.length} />, quiz: [], dictation }]
      : []),
    {
      key: 'reading',
      title: i18n.t('sections.reading', { ns: 'lesson' }),
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
  const { t } = useTranslation(['lesson', 'common'])
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
  // The grammar-and-words page, opened from the light bulb: it covers the lesson without unmounting it,
  // so the dialogue in progress and the point reached stay as they are.
  const [notesOpen, setNotesOpen] = useState(false)

  // The part opened first: the one still to do, or the one the daily timer suggests.
  const part: LessonPart =
    chosenPart ?? initialPart(progress.data, voice ? timer.status.recommendedMode : 'written')
  // The clock runs only while studying: not on the end-of-part summary, the "microphone needed" notice,
  // or the grammar-and-words page.
  const { markActivity } = useStudyActivity(notesOpen || finished || (part === 'oral' && !voice) ? null : part)

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
      content.listening.text,
      ...dictationSentences(content).map((d) => d.text),
      ...repeatSentences(content).map((d) => d.text),
    ])
  }, [content])

  // Last lesson of the chapter: get the next chapter's lessons ready.
  useEffect(() => {
    if (nextLessonId === undefined && nextChapterId !== undefined) prefetchChapter(nextChapterId)
  }, [nextLessonId, nextChapterId])

  if (lesson.isPending || progress.isPending) {
    return (
      <Shell onExit={onExit} title={t('title')}>
        <Waiting
          title={t('loading.title')}
          hints={[t('loading.hint1'), t('loading.hint2'), t('loading.hint3')]}
        />
      </Shell>
    )
  }
  if (lesson.isError || progress.isError) {
    return (
      <Shell onExit={onExit} title={t('title')}>
        <p className="error">{lesson.error?.message ?? t('errors.progress')}</p>
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
      onOpenNotes={() => {
        stopSpeaking()
        setNotesOpen(true)
      }}
      progress={
        <>
          <div className="segmented part-tabs" role="group" aria-label={t('partsAria')}>
            {(['written', 'oral'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={p === part} onClick={() => switchPart(p)}>
                {t(`common:parts.${p}`)}
                {partDone(row, p) && <span aria-label={t('partDoneMark')}> ✓</span>}
              </button>
            ))}
          </div>
          {!finished && !blockedByMic && (
            <div className="placement-progress">
              <small>
                {t('step', {
                  title: inDialogue ? t('dialogue') : section?.title,
                  current: Math.min(state.sectionIndex + 1, totalSteps),
                  total: totalSteps,
                })}
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
          title={t('noMic.title')}
          why={t('noMic.why')}
        />
      ) : (
        <>
          {partDone(row, part) && state.sectionIndex === 0 && phase.kind === 'learn' && (
            <div className="notice stack">
              <p>{t('partAlreadyDone', { part: t(`partName.${part}`) })}</p>
              {/* A part already done can go straight to its dialogue, e.g. to practise speaking for longer. */}
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  stopSpeaking()
                  update((s) => ({ ...s, sectionIndex: sections.length, phase: { kind: 'learn' } }))
                }}
              >
                {t('goToDialogue')}
              </button>
            </div>
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
                {exerciseCount(section) ? t('tryIt') : t('common:actions.next')}
              </button>
            </section>
          )}

          {section && phase.kind === 'quiz' && section.dictation?.[phase.index] && (
            <section>
              <h2>
                {t('sentenceOf', { title: section.title, current: phase.index + 1, total: section.dictation.length })}
              </h2>
              <Dictation
                key={`${section.key}-${phase.index}`}
                sentence={section.dictation[phase.index] as DictationSentence}
                onAttempt={answer}
                onTextShown={() => answer(false)}
                onDone={advance}
                onFinished={(result) => saveDictationResult(meta.id, result)}
              />
            </section>
          )}

          {section && phase.kind === 'quiz' && section.repeat?.[phase.index] && (
            <section>
              <h2>
                {t('sentenceOf', { title: section.title, current: phase.index + 1, total: section.repeat.length })}
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
                {t('questionOf', { title: section.title, current: phase.index + 1, total: section.quiz.length })}
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
              <h2>{t(`dialogueTitle.${part}`)}</h2>
              <LessonDialogue
                key={part}
                lessonId={meta.id}
                scenario={lessonContent.dialogue.scenario}
                opening={lessonContent.dialogue.opening}
                mode={part}
                onActivity={markActivity}
                onFinished={finishPart}
              />
            </section>
          )}
        </>
      )}
      {notesOpen && (
        <div className="notes-page" role="dialog" aria-modal="true" aria-label={t('notes.title')}>
          <header className="lesson-header">
            <BackButton onBack={() => setNotesOpen(false)} />
            <h1>{t('notes.title')}</h1>
          </header>
          <div className="notes-body">
            <LessonNotes content={lessonContent} />
          </div>
        </div>
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
  const { t } = useTranslation(['lesson', 'common'])
  const { part, stats } = finished
  const language = useStudiedLanguage()
  const other = otherPart(part)
  const lastOfChapter = nextLessonId === undefined
  const queryClient = useQueryClient()
  const started = useRef(false)
  const save = useMutation({
    mutationFn: async () => {
      const saved = await savePart(lessonId, part, stats)
      if (!saved.completed || !saved.total) return { ...saved, added: 0 }
      await recordLessonStats(lessonId, saved.total)
      const added = await addToReview(userId, language, [
        ...content.words.map((w) => ({ text: w.term, translation: w.translation })),
        ...content.phrases,
        ...content.idioms.map((i) => ({ text: i.text, translation: i.meaning })),
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
      <h2>{completed ? t('done.lesson') : t('done.part', { part: t(`partName.${part}`) })}</h2>
      {shown.answers > 0 && (
        <>
          <h3 className="small-heading">
            {completed ? t('done.allLesson', { count: shown.answers }) : t('done.thisPart', { count: shown.answers })}
          </h3>
          <StatsGrid summary={summarizeStats([{ lesson_id: lessonId, ...shown }])} />
        </>
      )}
      {save.isPending && <Waiting title={t('done.saving')} compact />}
      {save.isError && (
        <p className="error">
          {t('errors.save')}{' '}
          <button type="button" className="link" onClick={() => save.mutate()}>
            {t('common:actions.retry')}
          </button>
        </p>
      )}

      {save.isSuccess && !completed && (
        <>
          <p>
            {t('done.missingPart', { part: t(`partName.${other}`) })}
          </p>
          {other === 'oral' && !canRecord() ? (
            <p className="muted">
              {t('done.noMicForOral')}
            </p>
          ) : (
            <div className="stack">
              <button type="button" onClick={() => onSwitchPart(other)}>
                {t('done.switchPart', { part: t(`partName.${other}`) })}
              </button>
              <button type="button" className="link" onClick={onExit}>
                {t('done.backToPath')}
              </button>
            </div>
          )}
        </>
      )}

      {save.isSuccess && completed && (
        <>
          <p>
            {save.data.added > 0 ? t('done.added', { count: save.data.added }) : t('done.alreadyInReview')}
          </p>
          {/* Last lesson: the chapter's totals, read back once this lesson is saved. */}
          {lastOfChapter && <ChapterStats chapterId={chapterId} title={t('done.chapterInNumbers')} />}
          <div className="stack">
            {nextLessonId !== undefined && (
              <button type="button" onClick={() => onOpenLesson(nextLessonId)}>
                {t('done.nextLesson')}
              </button>
            )}
            <button type="button" className={nextLessonId !== undefined ? 'link' : undefined} onClick={onExit}>
              {t('done.backToPath')}
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
  /** Opens the lesson's grammar and words (light bulb in the header); absent while the lesson loads. */
  onOpenNotes?: () => void
  /** Pinned under the title, like the title itself. */
  progress?: ReactNode
  /** When it changes the content scrolls back to the top (next question, next part). */
  resetKey?: string
  children: ReactNode
}

/** Title and progress stay put; only the lesson content scrolls, so the answer and Avanti are never off screen. */
function Shell({ title, onExit, onOpenNotes, progress, resetKey, children }: ShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [resetKey])
  return (
    <main className="page lesson">
      <header className="lesson-header">
        <BackButton onBack={onExit} title={i18n.t('backTitle', { ns: 'lesson' })} />
        <h1>{title}</h1>
        {onOpenNotes && (
          <button
            type="button"
            className="notes-button"
            aria-label={i18n.t('notes.open', { ns: 'lesson' })}
            title={i18n.t('notes.open', { ns: 'lesson' })}
            onClick={onOpenNotes}
          >
            <LightBulbIcon />
          </button>
        )}
      </header>
      {progress}
      <div className="lesson-body" ref={bodyRef}>
        {children}
      </div>
    </main>
  )
}
