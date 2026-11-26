import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { PendingApprovalPage } from './features/auth/PendingApprovalPage'
import { SetPasswordPage } from './features/auth/SetPasswordPage'
import { useAuthSession } from './features/auth/useAuthSession'
import { ChapterTestPage } from './features/chapter-test/ChapterTestPage'
import { DialoguePage, type DialogueMode } from './features/dialogue/DialoguePage'
import { HomePage } from './features/home/HomePage'
import { useProfile } from './features/home/useProfile'
import { InstallDialog } from './features/onboarding/InstallDialog'
import { markOffered, useInstallMode, wasOffered } from './lib/install'
import { LessonPage } from './features/lesson/LessonPage'
import { PathPage } from './features/path/PathPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { rememberScroll, savedScroll, useRestoreScroll } from './features/nav/scrollMemory'
import { TabBar, type Tab } from './features/nav/TabBar'
import { SettingsPage } from './features/settings/SettingsPage'
import { chapterAfter, neighbours, usePath, usePrefetchCurrentChapter } from './features/path/usePath'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { PlacementTestPage } from './features/placement/PlacementTestPage'
import { ReviewPage } from './features/review/ReviewPage'
import { StudyTimerProvider } from './features/study/StudyTimerContext'
import { Waiting } from './components/Waiting'
import { LanguageProvider } from './features/languages/LanguageContext'
import { isStudiedLanguage } from './features/languages/languages'
import { i18n } from './i18n'

/** The install offer appears a few seconds after the learner is in the app. */
const INSTALL_OFFER_DELAY_MS = 4000

type View = Tab | 'dialogue' | 'review' | 'goals' | 'placement' | 'lesson' | 'chapter-test'

/** Main screens: they show the tab bar. Activities have their own way back. */
const TABS: readonly View[] = ['home', 'path', 'profile', 'settings']

function isTab(view: View): view is Tab {
  return TABS.includes(view)
}

export function App() {
  const { session, recovering, endRecovery } = useAuthSession()

  return (
    <>
      {session === undefined ? (
        <main className="page">
          <Waiting title={i18n.t('loading.app')} compact />
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
  const [view, setViewNow] = useState<View>('home')
  // Main screens come back where they were left; activities and screens opened for the first time start at the top.
  useRestoreScroll(view, isTab(view))
  // Cross-fade between screens where the browser supports view transitions.
  function setView(next: View) {
    if (isTab(view)) rememberScroll(view)
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setViewNow(next)
      return
    }
    document.startViewTransition(() => flushSync(() => setViewNow(next)))
  }
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>('written')
  const [lessonId, setLessonId] = useState<number | null>(null)
  const [testChapterId, setTestChapterId] = useState<number | null>(null)
  // Decided when the test opens: a pass changes the chapter's status while the result is on screen.
  const [skipAhead, setSkipAhead] = useState(false)
  const { path } = usePath(user.id)
  const installMode = useInstallMode()
  const [installOpen, setInstallOpen] = useState(false)
  const signedInAndReady = Boolean(profile.data?.approved && profile.data.onboarded_at)

  // One offer per device, after sign-in (never on the login page) and once the app is usable.
  useEffect(() => {
    if (!signedInAndReady || installMode === null || wasOffered()) return
    const id = window.setTimeout(() => {
      if (document.querySelector('dialog[open]')) return
      markOffered()
      setInstallOpen(true)
    }, INSTALL_OFFER_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [signedInAndReady, installMode])
  usePrefetchCurrentChapter(profile.data?.onboarded_at ? path : undefined)

  function openLesson(id: number) {
    setLessonId(id)
    setView('lesson')
  }

  function openTest(chapterId: number) {
    setTestChapterId(chapterId)
    setSkipAhead(path?.find((c) => c.id === chapterId)?.status === 'locked')
    setView('chapter-test')
  }

  function openDialogue(mode: DialogueMode) {
    setDialogueMode(mode)
    setView('dialogue')
  }

  if (profile.isPending) {
    return (
      <main className="page">
        <Waiting title={i18n.t('loading.profile')} compact />
      </main>
    )
  }
  if (profile.isError) {
    return (
      <main className="page">
        <p className="error">{i18n.t('errors.profileLoad')}</p>
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

  const language = isStudiedLanguage(profile.data.active_language) ? profile.data.active_language : 'en'

  // First run (also for a language studied for the first time): language, purpose and daily goal, then the
  // placement test (or skip it).
  if (!profile.data.onboarded_at) {
    return (
      <LanguageProvider language={language}>
        {profile.data.purpose ? (
          <PlacementTestPage userId={user.id} firstRun onDone={() => setView('home')} />
        ) : (
          <OnboardingPage key={language} userId={user.id} initial={initial} onDone={() => setView('home')} />
        )}
      </LanguageProvider>
    )
  }

  return (
    <LanguageProvider language={language}>
    <StudyTimerProvider userId={user.id}>
      {view === 'dialogue' ? (
        <DialoguePage initialMode={dialogueMode} onExit={() => setView('home')} />
      ) : view === 'review' ? (
        <ReviewPage onExit={() => setView('home')} />
      ) : view === 'profile' ? (
        <ProfilePage
          userId={user.id}
          onEditGoals={() => setView('goals')}
          onRetakePlacement={() => setView('placement')}
        />
      ) : view === 'settings' ? (
        <SettingsPage
          userId={user.id}
          email={user.email}
          onInstall={installMode ? () => setInstallOpen(true) : undefined}
        />
      ) : view === 'path' ? (
        <PathPage
          userId={user.id}
          onOpenLesson={openLesson}
          onOpenTest={openTest}
          landOnCurrent={savedScroll('path') === undefined}
        />
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
          skipAhead={skipAhead}
          onExit={() => setView('path')}
        />
      ) : view === 'placement' ? (
        <PlacementTestPage userId={user.id} firstRun={false} onDone={() => setView('home')} />
      ) : view === 'goals' ? (
        <OnboardingPage userId={user.id} initial={initial} editing onDone={() => setView('profile')} />
      ) : (
        <HomePage
          user={user}
          onStartDialogue={openDialogue}
          onStartReview={() => setView('review')}
          onOpenLesson={openLesson}
          onOpenTest={openTest}
        />
      )}
      {isTab(view) && <TabBar current={view} onSelect={setView} />}
      <InstallDialog open={installOpen} mode={installMode} onClose={() => setInstallOpen(false)} />
    </StudyTimerProvider>
    </LanguageProvider>
  )
}
