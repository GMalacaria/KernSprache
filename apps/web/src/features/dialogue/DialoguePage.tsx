import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ListenButton } from '../../components/ListenButton'
import { canRecord, speak, stopSpeaking } from '../../lib/audio'
import { usePracticeActivity } from '../study/useStudyTimer'
import { endSession, sendTutorTurn } from './api'
import { CorrectionList } from './CorrectionList'
import type { DialogueTurn, Pronunciation } from './types'
import { PronunciationNote } from './PronunciationNote'
import { BackHeader } from '../../components/BackHeader'
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
  const { t } = useTranslation(['dialogue', 'common'])
  const [mode, setMode] = useState<DialogueMode>(voiceAvailable ? initialMode : 'written')
  // Free dialogue is extra practice: its time is saved for statistics, not counted towards the daily goal.
  const { markActivity } = usePracticeActivity('dialogue')
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
          pronunciation: prev.at(-1)?.pronunciation,
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

  function sendText(text: string, pronunciation?: Pronunciation) {
    const content = text.trim()
    if (!content || send.isPending) return
    const next: DialogueTurn[] = [...turns, { id: `p${turns.length}`, role: 'user', content, pronunciation }]
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
      {/* Going back ends the dialogue session (and its corrections stay in the review). */}
      <BackHeader title={t('title')} onBack={() => finish.isPending || finish.mutate()} />

      {voiceAvailable && (
        <div className="segmented" role="group" aria-label={t('modeAria')}>
          <button type="button" aria-pressed={mode === 'written'} onClick={() => setMode('written')}>
            {t('common:parts.written')}
          </button>
          <button type="button" aria-pressed={mode === 'oral'} onClick={() => setMode('oral')}>
            {t('common:parts.oral')}
          </button>
        </div>
      )}

      {turns.length === 0 && (
        <p className="muted">
          {mode === 'oral' ? t('hintOral') : t('hintWritten')}
        </p>
      )}

      <ol className="turns">
        {turns.map((turn) => (
          <li key={turn.id} className={`turn turn-${turn.role}`}>
            <p className="bubble" lang={turn.role === 'assistant' ? 'en' : undefined}>
              {turn.content}
            </p>
            {turn.role === 'assistant' && (
              <ListenButton text={turn.content} className="link listen" label={t('listen')} />
            )}
            {turn.pronunciation && <PronunciationNote pronunciation={turn.pronunciation} />}
            {turn.corrections && <CorrectionList corrections={turn.corrections} />}
            {turn.newVocab && turn.newVocab.length > 0 && (
              <p className="vocab">
                {t('newWords')}{' '}
                {turn.newVocab.map((v) => (
                  <span key={v.en} className="tag">
                    {v.en} = {v.it}
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
        {send.isPending && <li className="turn turn-assistant muted" role="status">
            {t('typing')} <span className="dots" aria-hidden="true" /></li>}
      </ol>
      <div ref={bottom} />

      {send.isError && <p className="error">{send.error.message}</p>}

      {mode === 'oral' ? (
        <VoiceComposer disabled={send.isPending} onTranscript={sendText} onActivity={markActivity} />
      ) : (
        <form onSubmit={onSubmit} className="composer">
          <textarea
            aria-label={t('messageAria')}
            lang="en"
            rows={2}
            maxLength={MAX_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) onSubmit(e)
            }}
            placeholder={t('placeholder')}
          />
          <button type="submit" disabled={send.isPending || !draft.trim()}>
            {t('send')}
          </button>
        </form>
      )}
    </main>
  )
}
