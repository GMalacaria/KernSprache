# English Tutor – CLAUDE.md

App personale (PWA) per imparare l'inglese partendo dalle basi: grammatica, ascolto, dialogo, con un tutor IA che corregge e incentiva, e notifiche push sul telefono.
Per ora l'unico utente è lo sviluppatore. Priorità: costi bassi, codice semplice e manutenibile, nessuna dipendenza dall'abbonamento a Claude (si usa l'API a consumo).

## Obiettivi del prodotto
- Lezioni brevi e strutturate (un argomento di grammatica alla volta), con un percorso da A1 a B2.
- Correzione di ogni errore: frase originale, correzione, spiegazione breve **in italiano**.
- Dialoghi in inglese semplice, scritti e vocali.
- Ripasso con spaced repetition degli errori e delle parole nuove.
- Notifiche: promemoria giornaliero, ripassi in scadenza, streak a rischio.
- Tono del tutor: incoraggiante ma onesto, niente piaggeria né complimenti generici.

## Stack
- **Frontend:** React + TypeScript + Vite, `vite-plugin-pwa` (manifest e service worker).
- **Backend:** Supabase (Auth, Postgres, Edge Functions in Deno, `pg_cron`).
- **IA:** API di Anthropic, chiamata **solo dalle Edge Functions**. La chiave API non deve mai arrivare al client.
- **Voce:** da voce a testo tramite API di trascrizione (es. OpenAI); da testo a voce con `speechSynthesis` del browser nell'MVP, con un'API TTS come possibile alternativa.
- **Spaced repetition:** `ts-fsrs`.
- **Push:** Web Push con chiavi VAPID, inviato da un'Edge Function richiamata da `pg_cron`.
- **Hosting frontend:** Vercel, Netlify o Cloudflare Pages (piano gratuito).

## Vincoli di piattaforma
- iOS: le notifiche push funzionano solo se la PWA è installata da **Safari → Condividi → Aggiungi a Home**. L'app deve mostrare istruzioni di installazione quando non gira in modalità standalone (`display-mode: standalone`) e chiedere il permesso per le notifiche solo dopo un'azione dell'utente.
- Supabase Free mette in pausa i progetti dopo 7 giorni di inattività: va bene con l'uso quotidiano.

## Architettura
```
/apps/web              PWA React
  /src/features        onboarding, home, lesson, dialogue, review, progress
  /src/lib             client Supabase, push, audio
  /src/sw              service worker personalizzato (gestione push)
/supabase
  /migrations          schema SQL + policy RLS
  /functions
    tutor-chat         dialogo + correzioni (output JSON)
    lesson             genera spiegazione + esercizi dell'argomento
    transcribe         proxy verso l'API di trascrizione
    send-reminders     invio delle push (chiamata dal cron)
  /functions/_shared   client IA, prompt, schemi di validazione (zod)
```

### Livello IA (`_shared/ai`)
- Un'interfaccia `AiProvider` con implementazione Anthropic, così il provider resta sostituibile.
- Selezione del modello per tipo di attività: un modello economico (Haiku) per esercizi e correzioni, uno più capace (Sonnet) per dialoghi e spiegazioni. I nomi dei modelli vanno nelle variabili d'ambiente, non nel codice.
- Il contesto lo costruisce il backend a ogni chiamata: livello dell'utente, argomento corrente, ultimi errori ricorrenti, parole in ripasso. Non si fa affidamento sulla memoria del modello.
- Si usa il prompt caching sul system prompt.
- Le risposte strutturate vengono validate con zod; se il JSON non è valido, si riprova una volta e poi si mostra un errore controllato.

Formato delle correzioni:
```json
{
  "reply": "string (risposta del tutor in inglese)",
  "corrections": [
    { "original": "string", "corrected": "string", "explanation_it": "string", "category": "verb_tense|article|preposition|word_order|vocabulary|spelling|other" }
  ],
  "new_vocab": [ { "en": "string", "it": "string" } ]
}
```

## Modello dati (essenziale)
- `profiles`: id (= auth.uid), level (A1–B2), goal, reminder_time, timezone
- `curriculum_topics`: id, level, order, slug, title
- `sessions`: id, user_id, topic_id, kind (lesson|dialogue|review), started_at, ended_at
- `mistakes`: id, user_id, session_id, original, corrected, explanation_it, category, created_at
- `vocab_items`: id, user_id, en, it, campi FSRS (due, stability, difficulty, reps, lapses, state, last_review)
- `push_subscriptions`: id, user_id, endpoint, p256dh, auth, created_at

Su tutte le tabelle con `user_id` la RLS è attiva, con policy `user_id = auth.uid()`.

## Convenzioni
- TypeScript strict, niente `any`.
- Componenti funzionali; stato del server gestito con TanStack Query.
- Testo dell'interfaccia in italiano; identificatori e commenti nel codice in inglese.
- I prompt stanno in file dedicati sotto `_shared/prompts`, versionati e non sparsi nel codice.
- I segreti vanno solo in `.env` o nei secret di Supabase; `.env` va nel `.gitignore`.
- Commit piccoli, ognuno con una sola modifica logica.

## Costi
- Obiettivo: meno di ~€15 al mese.
- Limite di spesa mensile impostato nella console Anthropic.
- Ogni chiamata IA registra i token usati (tabella `ai_usage`, opzionale) per monitorare la spesa.

## Roadmap
1. **MVP:** setup del repo, login, chat testuale con correzioni in JSON, salvataggio di errori e parole.
2. Flashcard con FSRS e notifiche push (promemoria e ripassi in scadenza).
3. Voce: trascrizione per il parlato, sintesi vocale per l'ascolto.
4. Curriculum strutturato A1→B2 e test di livello iniziale.
5. Valutazione della pronuncia (es. Azure Pronunciation Assessment).

## Comandi
Da completare dopo lo scaffolding (dev, build, lint, test, `supabase start`, deploy delle functions).
