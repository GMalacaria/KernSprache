import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endSession, sendTutorTurn } from './api'
import { CorrectionList } from './CorrectionList'
import type { DialogueTurn } from './types'

const MAX_CHARS = 2000

export function DialoguePage({ onExit }: { onExit: () => void }) {
  const queryClient = useQueryClient()
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
        { id: `u${prev.length}`, role: 'user', content: userTurn?.content ?? '', corrections: res.corrections, newVocab: res.new_vocab },
        { id: `a${prev.length}`, role: 'assistant', content: res.reply },
      ])
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
      if (sessionId.current) await endSession(sessionId.current)
    },
    onSettled: onExit,
  })

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, send.isPending])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || send.isPending) return
    const next: DialogueTurn[] = [...turns, { id: `p${turns.length}`, role: 'user', content: text }]
    setTurns(next)
    setDraft('')
    send.mutate({
      session_id: sessionId.current,
      messages: next.map(({ role, content }) => ({ role, content })),
    })
  }

  return (
    <main className="page dialogue">
      <header className="row">
        <h1>Dialogo</h1>
        <button type="button" className="link" onClick={() => finish.mutate()} disabled={finish.isPending}>
          Termina
        </button>
      </header>

      {turns.length === 0 && (
        <p className="muted">Scrivi in inglese, anche frasi semplici. Il tutor ti risponde e corregge ogni errore.</p>
      )}

      <ol className="turns">
        {turns.map((turn) => (
          <li key={turn.id} className={`turn turn-${turn.role}`}>
            <p className="bubble" lang={turn.role === 'assistant' ? 'en' : undefined}>{turn.content}</p>
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
    </main>
  )
}
