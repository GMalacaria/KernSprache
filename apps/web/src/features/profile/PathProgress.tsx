import { useTranslation } from 'react-i18next'
import type { StudiedLanguage } from '../languages/languages'
import type { CefrLevel } from '../path/progress'
import { usePathOf } from '../path/usePath'
import { levelProgress } from './profileStats'

/** Chapters passed per level in one language: the path is never added up across languages. */
export function PathProgress({
  language,
  level,
  showName,
}: {
  language: StudiedLanguage
  level: CefrLevel
  /** With more than one language on screen, each block says which one it is. */
  showName: boolean
}) {
  const { t } = useTranslation(['profile', 'common'])
  const { path } = usePathOf(language, level)
  if (!path) return null
  return (
    <div className="path-progress">
      {showName && <h3 className="small-heading">{t(`common:languages.${language}.name`)}</h3>}
      <ul className="level-progress">
        {levelProgress(path).map((item) => (
          <li key={item.level}>
            <span className="level-name">{item.level}</span>
            <div
              className="bar"
              role="progressbar"
              aria-label={t('common:level', { level: item.level })}
              aria-valuemin={0}
              aria-valuemax={item.total}
              aria-valuenow={item.done}
            >
              <span style={{ width: `${item.total ? (item.done / item.total) * 100 : 0}%` }} />
            </div>
            <small>{t('chapters', { done: item.done, total: item.total })}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
