import type { User } from '@supabase/supabase-js'
import { Trans, useTranslation } from 'react-i18next'
import type { DialogueMode } from '../dialogue/DialoguePage'
import { purposeLabel } from '../onboarding/purposes'
import { useDueCount } from '../review/useDueCount'
import { GoalRing } from '../study/GoalRing'
import { useStudyTimer } from '../study/useStudyTimer'
import { chapterAwaitingTest, nextLesson } from '../path/progress'
import { usePath } from '../path/usePath'
import { useProfile } from './useProfile'
import { LanguageSelect } from '../languages/LanguageSwitch'

interface HomePageProps {
  user: User
  onStartDialogue: (mode: DialogueMode) => void
  onStartReview: () => void
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
}

export function HomePage({
  user,
  onStartDialogue,
  onStartReview,
  onOpenLesson,
  onOpenTest,
}: HomePageProps) {
  const { t } = useTranslation(['home', 'common'])
  const profile = useProfile(user.id)
  const dueCount = useDueCount()
  const timer = useStudyTimer()
  const recommended = timer.status.recommendedMode
  const { path } = usePath(user.id)
  const next = path ? nextLesson(path) : null
  const testChapter = path ? chapterAwaitingTest(path) : null
  const goalMinutes = profile.data?.daily_goal_minutes
  // With no lesson or test to continue, the dialogue becomes the main action.
  const hasMainAction = Boolean(next || testChapter)
  const secondary = 'secondary'

  return (
    <main className="page home">
      <header className="row home-header">
        <h1>{t('common:appName')}</h1>
        <LanguageSelect />
      </header>

      {profile.data && (
        <p className="profile-summary">
          <Trans
            t={t}
            i18nKey="summary"
            values={{ level: profile.data.level, purpose: purposeLabel(profile.data.purpose), minutes: goalMinutes }}
            components={{ strong: <strong /> }}
          />
        </p>
      )}

      <GoalRing />
      {timer.status.goalReached && (
        <p className="muted goal-hint">{t('goalReachedHint')}</p>
      )}
      {goalMinutes !== undefined && timer.ready && timer.goalSeconds !== goalMinutes * 60 && (
        <p className="muted goal-hint">
          {t('newGoalTomorrow', { minutes: goalMinutes })}
        </p>
      )}

      <div className="home-actions">
        {next ? (
          <button type="button" className="primary-action" onClick={() => onOpenLesson(next.lesson.id)}>
            {t('continuePath', { title: next.lesson.title })}
            <small>
              {next.chapter.level} · {next.chapter.title}
            </small>
          </button>
        ) : (
          testChapter && (
            <button type="button" className="primary-action" onClick={() => onOpenTest(testChapter.id)}>
              {t('chapterTest', { title: testChapter.title })}
              <small>{t('chapterTestHint', { level: testChapter.level })}</small>
            </button>
          )
        )}
        <button type="button" className={hasMainAction ? secondary : undefined} onClick={() => onStartDialogue(recommended)}>
          {recommended === 'oral' ? t('startOralDialogue') : t('startDialogue')}
        </button>
        <button type="button" className={secondary} onClick={onStartReview}>
          {dueCount.data !== undefined ? t('reviewDue', { count: dueCount.data }) : t('review')}
        </button>
      </div>

    </main>
  )
}
