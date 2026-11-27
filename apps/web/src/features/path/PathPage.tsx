import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LEVELS } from './progress'
import { usePath } from './usePath'
import { Waiting } from '../../components/Waiting'

interface PathPageProps {
  userId: string
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
  /** First visit: scroll to the chapter in progress. Later visits come back where the learner left the list. */
  landOnCurrent: boolean
}

/** Open padlock: the chapter is locked but a test can open it. */
function OpenLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.9" />
    </svg>
  )
}

export function PathPage({ userId, onOpenLesson, onOpenTest, landOnCurrent }: PathPageProps) {
  const { t } = useTranslation('path')
  const { path, isError } = usePath(userId)
  const currentRef = useRef<HTMLLIElement>(null)

  // First visit: land on the chapter in progress instead of the top of a long list (only once per visit).
  const landed = useRef(!landOnCurrent)
  useEffect(() => {
    if (!path || landed.current) return
    landed.current = true
    currentRef.current?.scrollIntoView({ block: 'start' })
  }, [path])

  return (
    <main className="page">
      <header className="sticky-header">
        <h1>{t('title')}</h1>
      </header>
      {isError && <p className="error">{t('loadError')}</p>}
      {!path && !isError && <Waiting title={t('loading')} compact />}
      {path &&
        LEVELS.map((level) => (
          <section key={level} className="level-section">
            <h2>{t('level', { level })}</h2>
            <ol className="chapters">
              {path
                .filter((c) => c.level === level)
                .map((chapter) => {
                  const folded = chapter.status === 'skipped' || chapter.status === 'done'
                  const header = (
                    <>
                      <strong>{chapter.title}</strong>
                      <span className="chapter-badges">
                        <span className="tag">{t(`status.${chapter.status}`)}</span>
                        {chapter.skipTestAvailable && (
                          <button
                            type="button"
                            className="link icon-button"
                            aria-label={t('unlockAria', { title: chapter.title })}
                            title={t('unlockTitle')}
                            onClick={() => onOpenTest(chapter.id)}
                          >
                            <OpenLock />
                          </button>
                        )}
                      </span>
                    </>
                  )
                  const body = (
                    <>
                      <p className="muted">{chapter.description}</p>
                      {chapter.status !== 'locked' && (
                        <ol className="lessons">
                          {chapter.lessons.map((lesson) => (
                            <li key={lesson.id}>
                              <button
                                type="button"
                                className={`lesson-link lesson-${lesson.status}`}
                                disabled={lesson.status === 'locked'}
                                onClick={() => onOpenLesson(lesson.id)}
                              >
                                <span className="lesson-mark" aria-hidden="true">
                                  {lesson.status === 'done' ? '✓' : lesson.status === 'locked' ? '–' : '›'}
                                </span>
                                {lesson.title}
                                {lesson.status === 'locked' && <span className="visually-hidden">{t('lessonLocked')}</span>}
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                      {chapter.status === 'current' &&
                        (chapter.testAvailable ? (
                          <button type="button" className="primary-action" onClick={() => onOpenTest(chapter.id)}>
                            {t('chapterTest')}
                            <small>{t('chapterTestHint')}</small>
                          </button>
                        ) : (
                          <p className="muted">
                            {t('lessonsDone', { done: chapter.completedLessons, total: chapter.lessons.length })}
                          </p>
                        ))}
                    </>
                  )
                  return folded ? (
                    <li key={chapter.id} className={`chapter chapter-${chapter.status} chapter-folded`}>
                      <details>
                        <summary>{header}</summary>
                        {body}
                      </details>
                    </li>
                  ) : (
                    <li
                      key={chapter.id}
                      ref={chapter.status === 'current' ? currentRef : undefined}
                      className={`chapter chapter-${chapter.status}`}
                    >
                      <div className="row">{header}</div>
                      {body}
                    </li>
                  )
                })}
            </ol>
          </section>
        ))}
    </main>
  )
}
