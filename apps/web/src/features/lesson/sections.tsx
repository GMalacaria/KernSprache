import { useTranslation } from 'react-i18next'
import { ListenButton } from '../../components/ListenButton'
import { canSpeak } from '../../lib/audio'
import type { LessonContent } from './types'

function Listen({ text }: { text: string }) {
  return <ListenButton text={text} className="link listen" />
}

export function GrammarView({ content }: { content: LessonContent }) {
  return (
    <>
      <p className="lesson-intro">{content.intro_it}</p>
      <p>{content.grammar.explanation_it}</p>
      <ul className="examples">
        {content.grammar.examples.map((e) => (
          <li key={e.en}>
            <span lang="en">{e.en}</span> <Listen text={e.en} />
            <br />
            <small className="muted">{e.it}</small>
          </li>
        ))}
      </ul>
    </>
  )
}

export function WordsView({ content }: { content: LessonContent }) {
  return (
    <ul className="cards">
      {content.words.map((w) => (
        <li key={w.en} className="card">
          <strong lang="en">{w.en}</strong> <Listen text={w.en} /> = {w.it}
          <br />
          <small className="muted" lang="en">
            {w.example_en}
          </small>
        </li>
      ))}
    </ul>
  )
}

export function PhrasesView({ content }: { content: LessonContent }) {
  const { t } = useTranslation('lesson')
  return (
    <>
      <h3 className="small-heading">{t('views.usefulPhrases')}</h3>
      <ul className="cards">
        {content.phrases.map((p) => (
          <li key={p.en} className="card">
            <strong lang="en">{p.en}</strong> <Listen text={p.en} />
            <br />
            {p.it}
          </li>
        ))}
      </ul>
      {content.idioms.length > 0 && (
        <>
          <h3 className="small-heading">{t('views.idioms')}</h3>
          <ul className="cards">
            {content.idioms.map((i) => (
              <li key={i.en} className="card">
                <strong lang="en">{i.en}</strong> <Listen text={i.en} />
                <br />
                <small className="muted">{t('views.literally', { text: i.it })}</small>
                <br />
                {t('views.means', { text: i.meaning_it })}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

export function VerbsView({ content }: { content: LessonContent }) {
  const { t } = useTranslation('lesson')
  return (
    <table className="verbs">
      <thead>
        <tr>
          <th>{t('views.verbBase')}</th>
          <th>{t('views.verbPast')}</th>
          <th>{t('views.verbParticiple')}</th>
          <th>{t('views.verbNative')}</th>
        </tr>
      </thead>
      <tbody>
        {content.verbs.map((v) => (
          <tr key={v.base} lang="en">
            <td>{v.base}</td>
            <td>{v.past}</td>
            <td>{v.past_participle}</td>
            <td lang="it">{v.it}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DictationIntro({ count }: { count: number }) {
  const { t } = useTranslation('lesson')
  return (
    <div className="stack">
      <p>{t('views.dictationIntro', { count })}</p>
      <p className="muted">{t('views.dictationRules')}</p>
    </div>
  )
}

export function RepeatIntro({ count }: { count: number }) {
  const { t } = useTranslation('lesson')
  return (
    <div className="stack">
      <p>{t('views.repeatIntro', { count })}</p>
      <p className="muted">{t('views.repeatRules')}</p>
    </div>
  )
}

export function ListeningView({ content, showText }: { content: LessonContent; showText: boolean }) {
  const { t } = useTranslation('lesson')
  return (
    <div className="stack">
      {canSpeak() ? (
        <ListenButton text={content.listening.text_en} label={t('views.listenText')} />
      ) : (
        <p className="muted">{t('views.noSpeech')}</p>
      )}
      {(showText || !canSpeak()) && (
        <p className="passage" lang="en">
          {content.listening.text_en}
        </p>
      )}
    </div>
  )
}

export function ReadingView({ content }: { content: LessonContent }) {
  return (
    <article className="passage">
      <h3 lang="en">{content.reading.title_en}</h3>
      <p lang="en">{content.reading.text_en}</p>
    </article>
  )
}

/** Lit light bulb: opens the lesson's grammar and words. */
export function LightBulbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <g stroke="var(--on-lemon)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 1.5v1.8M4.6 4.6l1.3 1.3M19.4 4.6l-1.3 1.3M2.2 11.5H4M20 11.5h1.8" />
      </g>
      <path
        d="M12 5.2a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.5h5.2V18c0-.8.4-1.5 1-2A6 6 0 0 0 12 5.2Z"
        fill="var(--lemon)"
        stroke="var(--on-lemon)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.6 20.3h4.8M10.3 22.4h3.4" stroke="var(--on-lemon)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** The lesson's grammar and new words, on their own page (opened from the light bulb). */
export function LessonNotes({ content }: { content: LessonContent }) {
  const { t } = useTranslation('lesson')
  return (
    <>
      <h2>{t('sections.grammar')}</h2>
      <GrammarView content={content} />
      <h2>{t('sections.words')}</h2>
      <WordsView content={content} />
    </>
  )
}
