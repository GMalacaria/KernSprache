import { useTranslation } from 'react-i18next'
import { purposeLabel } from '../onboarding/purposes'
import { useLearnerLanguages, useSwitchLanguage } from './useLanguageSwitch'
import { useStudiedLanguage } from './useLanguage'
import { isStudiedLanguage, STUDIED_LANGUAGES, type StudiedLanguage } from './languages'

/** Compact switch for the home header: only when the learner studies more than one language. */
export function LanguageSelect() {
  const { t } = useTranslation()
  const current = useStudiedLanguage()
  const languages = useLearnerLanguages()
  const switchTo = useSwitchLanguage()
  const studied = (languages.data ?? []).map((l) => l.language).filter(isStudiedLanguage)
  if (studied.length < 2) return null
  return (
    <label className="language-select">
      <span className="visually-hidden">{t('languageSwitch.label')}</span>
      <select
        value={current}
        disabled={switchTo.isPending}
        onChange={(e) => switchTo.mutate(e.target.value as StudiedLanguage)}
      >
        {studied.map((code) => (
          <option key={code} value={code}>
            {t(`languages.${code}.name`)}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Profile section: the languages studied, each with its level and purpose, and the ones that can be added. */
export function LanguagesSection() {
  const { t } = useTranslation(['common', 'profile'])
  const current = useStudiedLanguage()
  const languages = useLearnerLanguages()
  const switchTo = useSwitchLanguage()
  const rows = (languages.data ?? []).filter((l) => isStudiedLanguage(l.language))
  const others = STUDIED_LANGUAGES.filter((code) => !rows.some((l) => l.language === code))

  return (
    <section>
      <h2>{t('languageSwitch.yours')}</h2>
      <ul className="language-list">
        {rows.map((l) => (
          <li key={l.language} className={l.language === current ? 'active' : undefined}>
            <span>
              <strong>{t(`languages.${l.language as StudiedLanguage}.name`)}</strong>{' '}
              <span className="muted">
                {l.level} · {purposeLabel(l.purpose)}
              </span>
            </span>
            {l.language === current ? (
              <span className="tag">{t('languageSwitch.studying')}</span>
            ) : (
              <button
                type="button"
                className="link"
                disabled={switchTo.isPending}
                onClick={() => switchTo.mutate(l.language as StudiedLanguage)}
              >
                {t('languageSwitch.study')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <>
          <h3 className="small-heading">{t('languageSwitch.add')}</h3>
          <p className="muted">{t('languageSwitch.addHint')}</p>
          <div className="row language-add">
            {others.map((code) => (
              <button
                key={code}
                type="button"
                className="secondary"
                disabled={switchTo.isPending}
                onClick={() => switchTo.mutate(code)}
              >
                {t(`languages.${code}.name`)}
              </button>
            ))}
          </div>
        </>
      )}
      {switchTo.isError && <p className="error">{t('languageSwitch.error')}</p>}
    </section>
  )
}
