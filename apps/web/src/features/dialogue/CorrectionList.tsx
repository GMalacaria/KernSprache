import type { Correction } from './types'

const CATEGORY_LABELS: Record<Correction['category'], string> = {
  verb_tense: 'Tempo verbale',
  article: 'Articolo',
  preposition: 'Preposizione',
  word_order: 'Ordine delle parole',
  vocabulary: 'Vocabolario',
  spelling: 'Ortografia',
  other: 'Altro',
}

export function CorrectionList({ corrections }: { corrections: Correction[] }) {
  if (!corrections.length) {
    return <p className="correction-ok">Nessun errore in questo messaggio.</p>
  }
  return (
    <ul className="corrections">
      {corrections.map((c, i) => (
        <li key={i} className="correction">
          <p>
            <del>{c.original}</del> → <ins>{c.corrected}</ins>
            <span className="tag">{CATEGORY_LABELS[c.category]}</span>
          </p>
          <p className="muted">{c.explanation_it}</p>
        </li>
      ))}
    </ul>
  )
}
