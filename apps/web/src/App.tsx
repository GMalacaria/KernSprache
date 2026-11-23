import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { PendingApprovalPage } from './features/auth/PendingApprovalPage'
import { SetPasswordPage } from './features/auth/SetPasswordPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { ChapterTestPage } from './features/chapter-test/ChapterTestPage'
import { DialoguePage, type DialogueMode } from './features/dialogue/DialoguePage'
import { HomePage } from './features/home/HomePage'
import { useProfile } from './features/home/useProfile'
import { InstallBanner } from './features/onboarding/InstallBanner'
import { LessonPage } from './features/lesson/LessonPage'
import { PathPage } from './features/path/PathPage'
import { chapterAfter, neighbours, usePath, usePrefetchCurrentChapter } from './features/path/usePath'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { PlacementTestPage } from './features/placement/PlacementTestPage'
import { ReviewPage } from './features/review/ReviewPage'
import { StudyTimerProvider } from './features/study/StudyTimerContext'

type View = 'home' | 'dialogue' | 'review' | 'settings' | 'placement' | 'path' | 'lesson' | 'chapter-test'

export function App() {
  const { session, recovering, endRecovery } = useAuthSession()

  return (
    <>
      <InstallBanner />
      {session === undefined ? (
        <main className="page">
          <p>Caricamento…</p>
        </main>
      ) : session && recovering ? (
        <SetPasswordPage onDone={endRecovery} />
      ) : session ? (
        <SignedInApp user={session.user} />
      ) : (
        <LoginPage />
      )}
    </>
  )
}

function SignedInApp({ user }: { user: User }) {
  const profile = useProfile(user.id)
  const [view, setView] = useState<View>('home')
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('written')
  const [lessonId, setLessonId] = useState<number | null>(null)
  const [testChapterId, setTestChapterId] = useState<number | null>(null)
  const { path } = usePath(user.id)
  usePrefetchCurrentChapter(profile.data?.onboarded_at ? path : undefined)

  function openLesson(id: number) {
    setLessonId(id)
    setView('lesson')
  }

  function openTest(chapterId: number) {
    setTestChapterId(chapterId)
    setView('chapter-test')
  }

  function openDialogue(mode: DialogueMode) {
    setDialogueMode(mode)
    setView('dialogue')
  }

  if (profile.isPending) {
    return (
      <main className="page">
        <p>Caricamento…</p>
      </main>
    )
  }
  if (profile.isError) {
    return (
      <main className="page">
        <p className="error">Impossibile caricare il profilo. Ricarica la pagina.</p>
      </main>
    )
  }

  if (!profile.data.approved) {
    return (
      <PendingApprovalPage email={user.email} checking={profile.isFetching} onCheckAgain={() => void profile.refetch()} />
    )
  }

  const initial = {
    purpose: profile.data.purpose,
    goal: profile.data.goal,
    dailyGoalMinutes: profile.data.daily_goal_minutes,
  }

  // First run: purpose and daily goal, then the placement test (or skip it).
  if (!profile.data.onboarded_at) {
    return profile.data.purpose ? (
      <PlacementTestPage userId={user.id} firstRun onDone={() => setView('home')} />
    ) : (
      <OnboardingPage userId={user.id} initial={initial} onDone={() => setView('home')} />
    )
  }

  return (
    <StudyTimerProvider userId={user.id}>
      {view === 'dialogue' ? (
        <DialoguePage initialMode={dialogueMode} onExit={() => setView('home')} />
      ) : view === 'review' ? (
        <ReviewPage onExit={() => setView('home')} onSwitchToOral={() => openDialogue('oral')} />
      ) : view === 'path' ? (
        <PathPage userId={user.id} onOpenLesson={openLesson} onOpenTest={openTest} onExit={() => setView('home')} />
      ) : view === 'lesson' && lessonId !== null ? (
        <LessonPage
          key={lessonId}
          userId={user.id}
          lessonId={lessonId}
          {...neighbours(path, lessonId)}
          onOpenLesson={openLesson}
          onExit={() => setView('path')}
        />
      ) : view === 'chapter-test' && testChapterId !== null ? (
        <ChapterTestPage
          key={testChapterId}
          userId={user.id}
          chapterId={testChapterId}
          chapterTitle={path?.find((c) => c.id === testChapterId)?.title ?? ''}
          nextChapterId={chapterAfter(path, testChapterId)?.id}
          onExit={() => setView('path')}
        />
      ) : view === 'placement' ? (
        <PlacementTestPage userId={user.id} firstRun={false} onDone={() => setView('home')} />
      ) : view === 'settings' ? (
        <OnboardingPage userId={user.id} initial={initial} editing onDone={() => setView('home')} />
      ) : (
        <HomePage
          user={user}
          onStartDialogue={openDialogue}
          onStartReview={() => setView('review')}
          onEditGoals={() => setView('settings')}
          onRetakePlacement={() => setView('placement')}
          onOpenPath={() => setView('path')}
          onOpenLesson={openLesson}
          onOpenTest={openTest}
        />
      )}
    </StudyTimerProvider>
  )
}
