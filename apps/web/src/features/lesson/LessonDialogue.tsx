import { ListenButton } from '../../components/ListenButton'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { canRecord, speak } from '../../lib/audio'
import { sendTutorTurn } from '../dialogue/api'
import { CorrectionList } from '../dialogue/CorrectionList'
import type { DialogueMode } from '../dialogue/DialoguePage'
import type { ChatMessage, DialogueTurn } from '../dialogue/types'
import { VoiceComposer } from '../dialogue/VoiceComposer'

export const LESSON_DIALOGUE_TURNS = 3

interface LessonDialogueProps {
  lessonId: number
  scenario: string
  opening: string
  mode: DialogueMode
  onModeChange: (mode: DialogueMode) => void
  onActivity: () => void
  onFinished: () => void
}

/** Short role-play with the tutor at the end of a lesson: three learner turns. */
export function LessonDialogue({ lessonId, scenario, opening, mode, onModeChange, onActivity, onFinished }: LessonDialogueProps) {
  const [turns, setTurns] = useState<DialogueTurn[]>([{ id: 'opening', role: 'assistant', content: opening }])
  const [draft, setDraft] = useState('')
  const sessionId = useRef<string | undefined>(undefined)
  const learnerTurns = turns.filter((t) => t.role === 'user' && t.corrections).length
  const voice = canRecord()

  const send = useMutation({
    mutationFn: sendTutorTurn,
    onSuccess: (res, request) => {
      sessionId.current = res.session_id
      const last = request.messages.at(-1)
      setTurns((prev) => [
        ...prev.slice(0, -1),
        { id: `u${prev.length}`, role: 'user', content: last?.content ?? '', corrections: res.corrections, newVocab: res.new_vocab },
        { id: `a${prev.length}`, role: 'assistant', content: res.reply },
      ])
      if (mode === 'oral') speak(res.reply)
    },
    onError: () =>
      setTurns((prev) => {
        const last = prev.at(-1)
        if (last?.role === 'user') setDraft(last.content)
        return prev.slice(0, -1)
      }),
  })

  function sendText(text: string) {
    const content = text.trim()
    if (!content || send.isPending) return
    const next: DialogueTurn[] = [...turns, { id: `p${turns.length}`, role: 'user', content }]
    setTurns(next)
    // The role-play starts with the tutor's line; a short user cue keeps the history valid for every provider.
    const messages: ChatMessage[] = [
      { role: 'user', content: "Let's start the role-play." },
      ...next.map(({ role, content: c }) => ({ role, content: c })),
    ]
    send.mutate({ session_id: sessionId.current, lesson_id: lessonId, messages })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    sendText(draft)
    setDraft('')
  }

  const finished = learnerTurns >= LESSON_DIALOGUE_TURNS

  return (
    <div>
      <p className="notice">{scenario}</p>
      {voice && (
        <div className="segmented" role="group" aria-label="Modalità">
          <button type="button" aria-pressed={mode === 'written'} onClick={() => onModeChange('written')}>
            Scritto
          </button>
          <button type="button" aria-pressed={mode === 'oral'} onClick={() => onModeChange('oral')}>
            Orale
          </button>
        </div>
      )}
      <ol className="turns">
        {turns.map((turn) => (
          <li key={turn.id} className={`turn turn-${turn.role}`}>
            <p className="bubble" lang={turn.role === 'assistant' ? 'en' : undefined}>
              {turn.content}
            </p>
            {turn.role === 'assistant' && (
              <ListenButton text={turn.content} className="link listen" label="Ascolta" />
            )}
            {turn.corrections && <CorrectionList corrections={turn.corrections} />}
          </li>
        ))}
        {send.isPending && <li className="turn turn-assistant muted">Il tutor sta scrivendo…</li>}
      </ol>
      {send.isError && <p className="error">{send.error.message}</p>}

      {finished ? (
        <button type="button" onClick={onFinished}>
          Concludi la lezione
        </button>
      ) : (
        <>
          <p className="muted">
            Rispondi ancora {LESSON_DIALOGUE_TURNS - learnerTurns}{' '}
            {LESSON_DIALOGUE_TURNS - learnerTurns === 1 ? 'volta' : 'volte'}.
          </p>
          {mode === 'oral' ? (
            <VoiceComposer disabled={send.isPending} onTranscript={sendText} onActivity={onActivity} />
          ) : (
            <form onSubmit={onSubmit} className="composer">
              <textarea
                aria-label="La tua risposta in inglese"
                lang="en"
                rows={2}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write here…"
              />
              <button type="submit" disabled={send.isPending || !draft.trim()}>
                Invia
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
