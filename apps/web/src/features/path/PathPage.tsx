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

  return (
    <main className="page">
      <header className="row">
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
                .map((chapter) => (
                  <li key={chapter.id} className={`chapter chapter-${chapter.status}`}>
                    <div className="row">
                      <strong>{chapter.title}</strong>
                      <span className="tag">{STATUS_LABEL[chapter.status]}</span>
                    </div>
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
                              {lesson.status === 'done' ? '✓' : lesson.status === 'locked' ? '🔒' : '▶'} {lesson.title}
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
                          Lezioni completate: {chapter.completedLessons} di {chapter.lessons.length}. Poi c'è la verifica
                          del capitolo.
                        </p>
                      ))}
                  </li>
                ))}
            </ol>
          </section>
        ))}
    </main>
  )
}
