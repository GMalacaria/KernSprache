import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchChapterStats } from './api'
import { type StatsSummary, summarizeStats } from './stats'

/** Three numbers: mistakes, longest run of correct answers, success rate. */
export function StatsGrid({ summary }: { summary: StatsSummary }) {
  const { t } = useTranslation('lesson')
  return (
    <ul className="stats-grid">
      <li>
        <strong>{summary.mistakes}</strong>
        <small>{t('stats.mistakes', { count: summary.mistakes })}</small>
      </li>
      <li>
        <strong>{summary.bestStreak}</strong>
        <small>{t('stats.bestRun')}</small>
      </li>
      <li>
        <strong>{summary.successRate === null ? '–' : `${summary.successRate}%`}</strong>
        <small>{t('stats.correct')}</small>
      </li>
    </ul>
  )
}

/** Summary of the learner's completed lessons in a chapter; nothing when none was done. */
export function ChapterStats({ chapterId, title }: { chapterId: number; title?: string }) {
  const { t } = useTranslation('lesson')
  const stats = useQuery({ queryKey: ['chapter-stats', chapterId], queryFn: () => fetchChapterStats(chapterId) })
  if (!stats.data || stats.data.length === 0) return null
  const summary = summarizeStats(stats.data)
  return (
    <section className="chapter-stats">
      <h2 className="small-heading">
        {t('stats.heading', { title: title ?? t('stats.chapterLessons'), count: summary.lessons, answers: summary.answers })}
      </h2>
      <StatsGrid summary={summary} />
    </section>
  )
}
