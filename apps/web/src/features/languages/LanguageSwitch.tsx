import { useTranslation } from 'react-i18next'
import { purposeLabel } from '../onboarding/purposes'
import { useLearnerLanguages, useSwitchLanguage } from './useLanguageSwitch'
import { useStudiedLanguage } from './useLanguage'
import { isStudiedLanguage, STUDIED_LANGUAGES, type StudiedLanguage } from './languages'

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
        <div className="stack language-add">
          <label htmlFor="add-language" className="small-heading">
            {t('languageSwitch.add')}
          </label>
          <select
            id="add-language"
            value=""
            disabled={switchTo.isPending}
            onChange={(e) => {
              if (e.target.value) switchTo.mutate(e.target.value as StudiedLanguage)
            }}
          >
            <option value="" disabled>
              {t('languageSwitch.choose')}
            </option>
            {others.map((code) => (
              <option key={code} value={code}>
                {t(`languages.${code}.name`)}
              </option>
            ))}
          </select>
          <p className="muted">{t('languageSwitch.addHint')}</p>
        </div>
      )}
      {switchTo.isError && <p className="error">{t('languageSwitch.error')}</p>}
    </section>
  )
}
