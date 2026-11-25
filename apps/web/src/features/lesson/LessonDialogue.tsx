import { ListenButton } from '../../components/ListenButton'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { speak } from '../../lib/audio'
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
  /** Fixed by the part of the lesson: written in the written part, spoken in the oral part. */
  mode: DialogueMode
  onActivity: () => void
  onFinished: () => void
}

/** Short role-play with the tutor at the end of each part of a lesson: three learner turns. */
export function LessonDialogue({ lessonId, scenario, opening, mode, onActivity, onFinished }: LessonDialogueProps) {
  const [turns, setTurns] = useState<DialogueTurn[]>([{ id: 'opening', role: 'assistant', content: opening }])
  const [draft, setDraft] = useState('')
  const sessionId = useRef<string | undefined>(undefined)
  const learnerTurns = turns.filter((t) => t.role === 'user' && t.corrections).length
  const bottom = useRef<HTMLDivElement>(null)

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

  // Every new message brings the end of the chat into view, answer box included (the lesson body scrolls).
  useEffect(() => {
    if (turns.length > 1 || send.isPending) bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, send.isPending])

  return (
    <div>
      <p className="notice">{scenario}</p>
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
        {send.isPending && <li className="turn turn-assistant muted" role="status">Il tutor sta scrivendo <span className="dots" aria-hidden="true" /></li>}
      </ol>
      {send.isError && <p className="error">{send.error.message}</p>}

      {finished ? (
        <button type="button" onClick={onFinished}>
          {mode === 'oral' ? 'Concludi la parte orale' : 'Concludi la parte scritta'}
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
      <div ref={bottom} />
    </div>
  )
}
