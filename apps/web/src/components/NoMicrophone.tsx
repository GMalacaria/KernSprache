import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Explains that the activity needs the microphone: there is no written fallback for the oral half. */
export function NoMicrophone({ title, why }: { title: string; why: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="notice">
      <h2>{title}</h2>
      <p>{why}</p>
      <p>{t('noMicrophone')}</p>
    </section>
  )
}
