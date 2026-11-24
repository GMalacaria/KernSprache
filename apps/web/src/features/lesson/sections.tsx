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
  return (
    <>
      <h3 className="small-heading">Espressioni utili</h3>
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
          <h3 className="small-heading">Modi di dire</h3>
          <ul className="cards">
            {content.idioms.map((i) => (
              <li key={i.en} className="card">
                <strong lang="en">{i.en}</strong> <Listen text={i.en} />
                <br />
                <small className="muted">Letteralmente: {i.it}</small>
                <br />
                Significa: {i.meaning_it}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

export function VerbsView({ content }: { content: LessonContent }) {
  return (
    <table className="verbs">
      <thead>
        <tr>
          <th>Base</th>
          <th>Past simple</th>
          <th>Past participle</th>
          <th>Italiano</th>
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
  return (
    <div className="stack">
      <p>
        Ascolterai {count} {count === 1 ? 'frase' : 'frasi'} e le scriverai. Se sbagli, vedrai sottolineate le parole che non
        coincidono e riproverai finché la frase è giusta.
      </p>
      <p className="muted">
        Puoi leggere il testo, ma ogni tentativo sbagliato e la lettura del testo abbassano il punteggio.
      </p>
    </div>
  )
}

export function RepeatIntro({ count }: { count: number }) {
  return (
    <div className="stack">
      <p>
        Ascolta {count} {count === 1 ? 'frase' : 'frasi'} e {count === 1 ? 'ripetila' : 'ripetile'} a voce: valuto la
        pronuncia parola per parola.
      </p>
      <p className="muted">Conta il primo tentativo valutato; puoi riprovare quante volte vuoi per migliorare.</p>
    </div>
  )
}

export function ListeningView({ content, showText }: { content: LessonContent; showText: boolean }) {
  return (
    <div className="stack">
      {canSpeak() ? (
        <ListenButton text={content.listening.text_en} label="Ascolta il testo" />
      ) : (
        <p className="muted">La sintesi vocale non è disponibile: leggi il testo.</p>
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
