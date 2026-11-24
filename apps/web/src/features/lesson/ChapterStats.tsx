import { useQuery } from '@tanstack/react-query'
import { fetchChapterStats } from './api'
import { type StatsSummary, summarizeStats } from './stats'

/** Three numbers: mistakes, longest run of correct answers, success rate. */
export function StatsGrid({ summary }: { summary: StatsSummary }) {
  return (
    <ul className="stats-grid">
      <li>
        <strong>{summary.mistakes}</strong>
        <small>{summary.mistakes === 1 ? 'errore' : 'errori'}</small>
      </li>
      <li>
        <strong>{summary.bestStreak}</strong>
        <small>giuste di fila (record)</small>
      </li>
      <li>
        <strong>{summary.successRate === null ? '–' : `${summary.successRate}%`}</strong>
        <small>risposte giuste</small>
      </li>
    </ul>
  )
}

/** Summary of the learner's completed lessons in a chapter; nothing when none was done. */
export function ChapterStats({ chapterId, title = 'Le lezioni del capitolo' }: { chapterId: number; title?: string }) {
  const stats = useQuery({ queryKey: ['chapter-stats', chapterId], queryFn: () => fetchChapterStats(chapterId) })
  if (!stats.data || stats.data.length === 0) return null
  const summary = summarizeStats(stats.data)
  return (
    <section className="chapter-stats">
      <h2 className="small-heading">
        {title} ({summary.lessons} {summary.lessons === 1 ? 'lezione' : 'lezioni'}, {summary.answers} risposte)
      </h2>
      <StatsGrid summary={summary} />
    </section>
  )
}
