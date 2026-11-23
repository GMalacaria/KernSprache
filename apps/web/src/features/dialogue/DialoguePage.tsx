import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { canRecord, canSpeak, speak, stopSpeaking } from '../../lib/audio'
import { StudyPrompts } from '../study/StudyPrompts'
import { StudyTimerBar } from '../study/StudyTimerBar'
import { useStudyActivity } from '../study/useStudyTimer'
import { endSession, sendTutorTurn } from './api'
import { CorrectionList } from './CorrectionList'
import type { DialogueTurn } from './types'
import { VoiceComposer } from './VoiceComposer'

const MAX_CHARS = 2000

export type DialogueMode = 'written' | 'oral'

interface DialoguePageProps {
  initialMode?: DialogueMode
  onExit: () => void
}

export function DialoguePage({ initialMode = 'written', onExit }: DialoguePageProps) {
  const queryClient = useQueryClient()
  const voiceAvailable = canRecord()
  const [mode, setMode] = useState<DialogueMode>(voiceAvailable ? initialMode : 'written')
  const { markActivity } = useStudyActivity(mode)
  const [turns, setTurns] = useState<DialogueTurn[]>([])
  const [draft, setDraft] = useState('')
  const sessionId = useRef<string | undefined>(undefined)
  const bottom = useRef<HTMLDivElement>(null)

  const send = useMutation({
    mutationFn: sendTutorTurn,
    onSuccess: (res, request) => {
      sessionId.current = res.session_id
      const userTurn = request.messages.at(-1)
      setTurns((prev) => [
        ...prev.slice(0, -1),
        {
          id: `u${prev.length}`,
          role: 'user',
          content: userTurn?.content ?? '',
          corrections: res.corrections,
          newVocab: res.new_vocab,
        },
        { id: `a${prev.length}`, role: 'assistant', content: res.reply },
      ])
      if (mode === 'oral') speak(res.reply)
      void queryClient.invalidateQueries({ queryKey: ['review'] })
    },
    onError: () => {
      // Drop the unanswered user turn and give the text back for a retry.
      setTurns((prev) => {
        const last = prev.at(-1)
        if (last?.role === 'user') setDraft(last.content)
        return prev.slice(0, -1)
      })
    },
  })

  const finish = useMutation({
    mutationFn: async () => {
      stopSpeaking()
      if (sessionId.current) await endSession(sessionId.current)
    },
    onSettled: onExit,
  })

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, send.isPending])

  useEffect(() => stopSpeaking, [])

  function sendText(text: string) {
    const content = text.trim()
    if (!content || send.isPending) return
    const next: DialogueTurn[] = [...turns, { id: `p${turns.length}`, role: 'user', content }]
    setTurns(next)
    send.mutate({
      session_id: sessionId.current,
      messages: next.map(({ role, content }) => ({ role, content })),
    })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || send.isPending) return
    sendText(draft)
    setDraft('')
  }

  return (
    <main className="page dialogue">
      <header className="row">
        <h1>Dialogo</h1>
        <button type="button" className="link" onClick={() => finish.mutate()} disabled={finish.isPending}>
          Termina
        </button>
      </header>

      <StudyTimerBar />
      <StudyPrompts onSwitchToOral={voiceAvailable ? () => setMode('oral') : undefined} onExit={() => finish.mutate()} />

      {voiceAvailable && (
        <div className="segmented" role="group" aria-label="Modalità">
          <button type="button" aria-pressed={mode === 'written'} onClick={() => setMode('written')}>
            Scritto
          </button>
          <button type="button" aria-pressed={mode === 'oral'} onClick={() => setMode('oral')}>
            Orale
          </button>
        </div>
      )}

      {turns.length === 0 && (
        <p className="muted">
          {mode === 'oral'
            ? 'Tocca "Parla", rispondi in inglese ad alta voce e tocca di nuovo per inviare. Il tutor ti risponde a voce e corregge ogni errore.'
            : 'Scrivi in inglese, anche frasi semplici. Il tutor ti risponde e corregge ogni errore.'}
        </p>
      )}

      <ol className="turns">
        {turns.map((turn) => (
          <li key={turn.id} className={`turn turn-${turn.role}`}>
            <p className="bubble" lang={turn.role === 'assistant' ? 'en' : undefined}>
              {turn.content}
            </p>
            {turn.role === 'assistant' && canSpeak() && (
              <button type="button" className="link listen" onClick={() => speak(turn.content)}>
                Ascolta
              </button>
            )}
            {turn.corrections && <CorrectionList corrections={turn.corrections} />}
            {turn.newVocab && turn.newVocab.length > 0 && (
              <p className="vocab">
                Parole nuove:{' '}
                {turn.newVocab.map((v) => (
                  <span key={v.en} className="tag">
                    {v.en} = {v.it}
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
        {send.isPending && <li className="turn turn-assistant muted">Il tutor sta scrivendo…</li>}
      </ol>
      <div ref={bottom} />

      {send.isError && <p className="error">{send.error.message}</p>}

      {mode === 'oral' ? (
        <VoiceComposer disabled={send.isPending} onTranscript={sendText} onActivity={markActivity} />
      ) : (
        <form onSubmit={onSubmit} className="composer">
          <textarea
            aria-label="Il tuo messaggio in inglese"
            lang="en"
            rows={2}
            maxLength={MAX_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) onSubmit(e)
            }}
            placeholder="Write here…"
          />
          <button type="submit" disabled={send.isPending || !draft.trim()}>
            Invia
          </button>
        </form>
      )}
    </main>
  )
}
