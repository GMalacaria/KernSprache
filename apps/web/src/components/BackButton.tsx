import { stopSpeaking } from '../lib/audio'

/** Back arrow of the activity screens (lesson, review): leaving keeps the point reached, so it is not an "exit". */
export function BackButton({ onBack, title = 'Indietro' }: { onBack: () => void; title?: string }) {
  return (
    <button
      type="button"
      className="back-button"
      aria-label="Indietro"
      title={title}
      onClick={() => {
        stopSpeaking()
        onBack()
      }}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
