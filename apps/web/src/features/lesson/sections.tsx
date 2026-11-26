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
      <p className="lesson-intro">{content.intro}</p>
      <p>{content.grammar.explanation}</p>
      <ul className="examples">
        {content.grammar.examples.map((e) => (
          <li key={e.text}>
            <span lang="en">{e.text}</span> <Listen text={e.text} />
            <br />
            <small className="muted">{e.translation}</small>
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
        <li key={w.term} className="card">
          <strong lang="en">{w.term}</strong> <Listen text={w.term} /> = {w.translation}
          <br />
          <small className="muted" lang="en">
            {w.example}
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
          <li key={p.text} className="card">
            <strong lang="en">{p.text}</strong> <Listen text={p.text} />
            <br />
            {p.translation}
          </li>
        ))}
      </ul>
      {content.idioms.length > 0 && (
        <>
          <h3 className="small-heading">{t('views.idioms')}</h3>
          <ul className="cards">
            {content.idioms.map((i) => (
              <li key={i.text} className="card">
                <strong lang="en">{i.text}</strong> <Listen text={i.text} />
                <br />
                <small className="muted">{t('views.literally', { text: i.literal })}</small>
                <br />
                {t('views.means', { text: i.meaning })}
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
          <th>{t('views.verbForms')}</th>
          <th>{t('views.verbTranslation')}</th>
        </tr>
      </thead>
      <tbody>
        {content.verbs.map((v) => (
          <tr key={v.forms.join('-')}>
            <td lang="en">{v.forms.join(' · ')}</td>
            <td>{v.translation}</td>
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
        <ListenButton text={content.listening.text} label={t('views.listenText')} />
      ) : (
        <p className="muted">{t('views.noSpeech')}</p>
      )}
      {(showText || !canSpeak()) && (
        <p className="passage" lang="en">
          {content.listening.text}
        </p>
      )}
    </div>
  )
}

export function ReadingView({ content }: { content: LessonContent }) {
  return (
    <article className="passage">
      <h3 lang="en">{content.reading.title}</h3>
      <p lang="en">{content.reading.text}</p>
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
