import { useEffect, useRef, useState } from 'react'
import { AppMenu, type AppMenuActions } from '../home/AppMenu'
import { MenuButton } from '../home/SideMenu'
import { LEVELS, type ChapterView } from './progress'
import { usePath } from './usePath'

interface PathPageProps {
  userId: string
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
  menu: AppMenuActions
}

const STATUS_LABEL: Record<ChapterView['status'], string> = {
  skipped: 'Superato con il test',
  done: 'Completato',
  current: 'In corso',
  locked: 'Bloccato',
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

export function PathPage({ userId, onOpenLesson, onOpenTest, menu }: PathPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { path, isError } = usePath(userId)
  const currentRef = useRef<HTMLLIElement>(null)

  // Land on the chapter in progress instead of the top of a long list.
  useEffect(() => {
    if (path) currentRef.current?.scrollIntoView({ block: 'start' })
  }, [path])

  return (
    <main className="page">
      <header className="row sticky-header">
        <h1>Percorso</h1>
        <MenuButton onClick={() => setMenuOpen(true)} />
      </header>
      {isError && <p className="error">Impossibile caricare il percorso.</p>}
      {!path && !isError && <p>Caricamento…</p>}
      {path &&
        LEVELS.map((level) => (
          <section key={level} className="level-section">
            <h2>Livello {level}</h2>
            <ol className="chapters">
              {path
                .filter((c) => c.level === level)
                .map((chapter) => {
                  const folded = chapter.status === 'skipped' || chapter.status === 'done'
                  const header = (
                    <>
                      <strong>{chapter.title}</strong>
                      <span className="chapter-badges">
                        <span className="tag">{STATUS_LABEL[chapter.status]}</span>
                        {chapter.skipTestAvailable && (
                          <button
                            type="button"
                            className="link icon-button"
                            aria-label={`Sblocca "${chapter.title}" con una verifica`}
                            title="Sblocca con una verifica"
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
                      <p className="muted">{chapter.description_it}</p>
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
                                {lesson.status === 'locked' && <span className="visually-hidden"> (bloccata)</span>}
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                      {chapter.status === 'current' &&
                        (chapter.testAvailable ? (
                          <button type="button" className="primary-action" onClick={() => onOpenTest(chapter.id)}>
                            Verifica del capitolo
                            <small>Scritto e orale: con 70 su 100 passi al capitolo successivo</small>
                          </button>
                        ) : (
                          <p className="muted">
                            Lezioni completate: {chapter.completedLessons} di {chapter.lessons.length}. Poi c'è la
                            verifica del capitolo.
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
      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} userId={userId} current="path" actions={menu} />
    </main>
  )
}
