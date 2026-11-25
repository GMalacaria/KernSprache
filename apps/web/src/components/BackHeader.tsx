import { BackButton } from './BackButton'

/** Title of a screen opened from somewhere else, with the back arrow in front (no "Esci"/"Annulla" text). */
export function BackHeader({ title, onBack, backTitle }: { title: string; onBack: () => void; backTitle?: string }) {
  return (
    <header className="lesson-header">
      <BackButton onBack={onBack} title={backTitle} />
      <h1>{title}</h1>
    </header>
  )
}
