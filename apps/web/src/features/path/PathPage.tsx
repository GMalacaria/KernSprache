import { useEffect, useRef } from 'react'
import { LEVELS, type ChapterView } from './progress'
import { usePath } from './usePath'

interface PathPageProps {
  userId: string
  onOpenLesson: (lessonId: number) => void
  onOpenTest: (chapterId: number) => void
  onExit: () => void
}

const STATUS_LABEL: Record<ChapterView['status'], string> = {
  skipped: 'Superato con il test',
  done: 'Completato',
  current: 'In corso',
  locked: 'Bloccato',
}

export function PathPage({ userId, onOpenLesson, onOpenTest, onExit }: PathPageProps) {
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
        <button type="button" className="link" onClick={onExit}>
          Home
        </button>
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
                      <span className="tag">{STATUS_LABEL[chapter.status]}</span>
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
                      {chapter.skipTestAvailable && (
                        <button type="button" className="secondary skip-test" onClick={() => onOpenTest(chapter.id)}>
                          Salta qui con una verifica
                        </button>
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
    </main>
  )
}
