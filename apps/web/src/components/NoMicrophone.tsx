import type { ReactNode } from 'react'

/** Explains that the activity needs the microphone: there is no written fallback for the oral half. */
export function NoMicrophone({ title, why }: { title: string; why: ReactNode }) {
  return (
    <section className="notice">
      <h2>{title}</h2>
      <p>{why}</p>
      <p>
        Su questo dispositivo il microfono non è disponibile. Apri Kern Sprache sul telefono, oppure usa un browser che
        permetta di registrare e dai il permesso al microfono quando te lo chiede.
      </p>
    </section>
  )
}
