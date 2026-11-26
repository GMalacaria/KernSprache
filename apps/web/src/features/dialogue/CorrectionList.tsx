import { useTranslation } from 'react-i18next'
import type { Correction } from './types'

export function CorrectionList({ corrections }: { corrections: Correction[] }) {
  const { t } = useTranslation('dialogue')
  if (!corrections.length) {
    return <p className="correction-ok">{t('noMistakes')}</p>
  }
  return (
    <ul className="corrections">
      {corrections.map((c, i) => (
        <li key={i} className="correction">
          <p>
            <del>{c.original}</del> → <ins>{c.corrected}</ins>
            <span className="tag">{t(`categories.${c.category}`)}</span>
          </p>
          <p className="muted">{c.explanation}</p>
        </li>
      ))}
    </ul>
  )
}
