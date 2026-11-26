import { useStudiedLanguage } from '../languages/useLanguage'
import { useTranslation } from 'react-i18next'
import type { Pronunciation } from './types'

/** How a spoken turn sounded: a score, what to fix (with a tip in Italian) and one line of feedback. */
export function PronunciationNote({ pronunciation }: { pronunciation: Pronunciation }) {
  const lang = useStudiedLanguage()
  const { t } = useTranslation('dialogue')
  const { score, words, feedback } = pronunciation
  return (
    <div className="pronunciation">
      <p className="pronunciation-head">
        <strong>{t('pronunciation')}</strong>
        <span className={`tag score-${score >= 85 ? 'good' : score >= 65 ? 'ok' : 'low'}`}>{score}/100</span>
      </p>
      <p className="pronunciation-feedback">{feedback}</p>
      {words.length > 0 && (
        <ul className="pronunciation-words">
          {words.map((w) => (
            <li key={w.word}>
              <strong lang={lang}>{w.word}</strong>: {w.tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
