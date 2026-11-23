# English Tutor – CLAUDE.md

App personale (PWA) per imparare l'inglese partendo dalle basi: grammatica, ascolto, dialogo, con un tutor IA che corregge e incentiva, e notifiche push sul telefono.
Per ora l'unico utente è lo sviluppatore. Priorità: costi bassi, codice semplice e manutenibile, nessuna dipendenza da abbonamenti (si usano API a consumo).

## Obiettivi del prodotto
- Lezioni brevi e strutturate (un argomento di grammatica alla volta), con un percorso da A1 a B2.
- Correzione di ogni errore: frase originale, correzione, spiegazione breve **in italiano**.
- Dialoghi in inglese semplice, scritti e vocali.
- Ripasso con spaced repetition degli errori e delle parole nuove.
- Notifiche: promemoria giornaliero, ripassi in scadenza, streak a rischio.
- Tono del tutor: incoraggiante ma onesto, niente piaggeria né complimenti generici.
- Al primo accesso si sceglie lo scopo dello studio (svago, viaggi, lavoro, amore: uno solo, modificabile), che orienta situazioni dei dialoghi, lessico ed esempi; poi c'è il test di livello (saltabile, si parte da A1), ripetibile dalla home.
- Test di livello: metà scritto (16 domande fisse a scelta multipla, 4 per livello A1–B2, corrette sul server: un livello è superato con 3/4 e solo se lo sono anche quelli sotto) e metà orale (4 risposte a voce valutate dall'IA). Livello finale = media dei due arrotondata per difetto.
- Obiettivo giornaliero in minuti scelto dall'utente (`profiles.daily_goal_minutes`). Il timer conta solo il tempo attivo nel dialogo e nel ripasso: app in primo piano, finestra attiva e un'interazione negli ultimi 2 minuti.
- La giornata è divisa a metà: prima lo scritto (dialogo scritto e ripasso), poi l'orale (dialogo a voce). A metà si invita a passare all'orale; raggiunto l'obiettivo compare un banner di successo e l'esercizio si ferma finché l'utente non chiede di continuare.

## Stack
- **Frontend:** React + TypeScript + Vite, `vite-plugin-pwa` (manifest e service worker).
- **Backend:** Supabase (Auth, Postgres, Edge Functions in Deno, `pg_cron`).
- **IA:** API di Google Gemini (credito di Google AI Studio) come provider predefinito, Anthropic come alternativa; si sceglie con `AI_PROVIDER`. Il provider viene chiamato **solo dalle Edge Functions**: la chiave API non deve mai arrivare al client.
- **Voce:** da voce a testo con Gemini (function `transcribe`, audio registrato con `MediaRecorder`: webm su Android/desktop, mp4 su iOS); da testo a voce con `speechSynthesis` del browser, con un'API TTS come possibile alternativa.
- **Spaced repetition:** `ts-fsrs`, calcolato nel client (`src/lib/fsrs.ts`): la PWA aggiorna i campi FSRS delle proprie righe tramite RLS. Le carte sono le parole (`vocab_items`) e gli errori (`mistakes`).
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
    transcribe         trascrizione letterale del parlato (Gemini), errori inclusi
    placement-test     test di livello iniziale (domande e correzione dello scritto, valutazione dell'orale)
    send-reminders     invio delle push (chiamata dal cron)
  /functions/_shared   client IA, prompt, schemi di validazione (zod)
```

### Livello IA (`_shared/ai`)
- Un'interfaccia `AiProvider` con due implementazioni, Gemini (`ai/gemini.ts`, SDK `@google/genai`) e Anthropic (`ai/anthropic.ts`). `AI_PROVIDER=gemini|anthropic` sceglie quale usare.
- Selezione del modello per tipo di attività: un modello economico (`AI_MODEL_FAST`) per esercizi e correzioni, uno più capace (`AI_MODEL_SMART`) per dialoghi e spiegazioni. I nomi dei modelli vanno nelle variabili d'ambiente, non nel codice.
- Il contesto lo costruisce il backend a ogni chiamata: livello e scopo dell'utente, argomento corrente, ultimi errori ricorrenti, parole in ripasso. Non si fa affidamento sulla memoria del modello.
- Caching del system prompt: con Anthropic tramite `cache_control`; con Gemini il caching implicito riusa il prefisso stabile, quindi il prompt fisso va sempre prima del contesto variabile.
- Le risposte strutturate (JSON con schema generato da zod) vengono validate con zod; se il JSON non è valido, si riprova una volta e poi si mostra un errore controllato.

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
- `profiles`: id (= auth.uid), level (A1–B2), purpose (`leisure|travel|work|love`, uno solo), goal (dettagli in parole dell'utente), onboarded_at, reminder_time, timezone, daily_goal_minutes
- `curriculum_topics`: id, level, sort_order, slug, title
- `sessions`: id, user_id, topic_id, kind (lesson|dialogue|review), started_at, ended_at
- `mistakes`: id, user_id, session_id, original, corrected, explanation_it, category, created_at, campi FSRS (gli errori sono anche carte di ripasso)
- `vocab_items`: id, user_id, en, it, campi FSRS (due, stability, difficulty, reps, lapses, state, last_review)
- `study_days`: user_id, day (giorno locale), goal_minutes, written_seconds, oral_seconds, completed_at. Si scrive solo con la RPC `add_study_time` (incremento atomico, max 120 s per chiamata).
- `placement_results`: risposte e livelli (scritto, orale, finale) di ogni test di livello; scritta solo dalla function `placement-test`.
- `push_subscriptions`: id, user_id, endpoint, p256dh, auth, created_at
- `ai_usage`: user_id, function_name, model, token in/out/cache (scritta solo dalle Edge Functions con la service role)

Su tutte le tabelle con `user_id` la RLS è attiva, con policy `user_id = auth.uid()`. Il profilo viene creato da un trigger su `auth.users`. `curriculum_topics` è in sola lettura per gli utenti; `ai_usage` è in sola lettura (propri record). I test RLS (pgTAP) sono in `supabase/tests`.

## Convenzioni
- TypeScript strict, niente `any`.
- Componenti funzionali; stato del server gestito con TanStack Query.
- Testo dell'interfaccia in italiano; identificatori e commenti nel codice in inglese.
- I prompt stanno in file dedicati sotto `_shared/prompts`, versionati e non sparsi nel codice.
- I segreti vanno solo in `.env` o nei secret di Supabase; `.env` va nel `.gitignore`.
- Commit piccoli, ognuno con una sola modifica logica.

## Git: commit, branch e PR
- **Conventional Commits**, controllati da commitlint (hook `commit-msg` installato da `pnpm install`; in CI si controlla il titolo della PR): `tipo(scope): descrizione`, in inglese, all'imperativo.
  - Tipi: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`, `style`, `revert`.
  - Scope ammessi: `web`, `db`, `functions`, `ai`, `push`, `ci`, `deps`, `docs` (facoltativo).
  - Esempi: `feat(ai): add tutor-chat edge function`, `fix(db): restrict ai_usage to own rows`.
- **Branch:** `main` è sempre deployabile. Si lavora su branch brevi con nomi parlanti, creati da `main`: `feat/<slug>`, `fix/<slug>`, `chore/<slug>` (es. `feat/oral-dialogue`). Niente nomi generati automaticamente.
- **Autore dei commit:** l'utente (nome e email nella config git locale del repo). Nessun trailer `Co-Authored-By` con indirizzi di Anthropic.
- **PR:** piccole (un passo della roadmap o meno), titolo in formato Conventional Commits, template in `.github/pull_request_template.md`. Si fa merge solo con la CI verde, in **squash merge**: il titolo della PR diventa il commit su `main`.
- **CI** (`.github/workflows/ci.yml`): commitlint sul titolo della PR, lint + test + typecheck + build della PWA, check + lint + test delle functions, migration + test RLS + controllo che `database.types.ts` sia aggiornato.
- Schema: ogni modifica passa da una nuova migration (mai modificare quelle già su `main`), con test RLS se tocca tabelle utente.

## Regole per l'assistente IA (Claude Code)
- Permessi in `.claude/settings.json`: comandi di dev/test consentiti; vietati la lettura dei file con segreti veri (`.env`, `.env.local`, `.env.*.local`, `.env.keys`, in qualsiasi cartella), `supabase db push`, `supabase secrets set`, deploy delle functions e force push. I template `.env.example` contengono solo segnaposto e si possono leggere e modificare.
- Prima di committare: `pnpm lint`, `pnpm test`, `pnpm build`; se cambiano le functions `pnpm fn:check`, `pnpm fn:lint`, `pnpm fn:test`; se cambia lo schema `pnpm test:db` e `pnpm db:types`.
- Non aprire PR, non fare push su `main` e non fare deploy senza richiesta esplicita.

## Costi
- Obiettivo: meno di ~€15 al mese.
- Limite di spesa / budget impostato nella console del provider (Google AI Studio o Anthropic).
- Ogni chiamata IA registra i token usati (tabella `ai_usage`, opzionale) per monitorare la spesa.

## Roadmap
1. **MVP:** setup del repo, login, chat testuale con correzioni in JSON, salvataggio di errori e parole.
2. Flashcard con FSRS e notifiche push (promemoria e ripassi in scadenza).
3. Voce: trascrizione per il parlato, sintesi vocale per l'ascolto.
4. Curriculum strutturato A1→B2 e test di livello iniziale.
5. Valutazione della pronuncia (es. Azure Pronunciation Assessment).

## Comandi
Requisiti: Node 22, pnpm 10, Docker (per Supabase locale). Tutti i comandi si lanciano dalla root del repo.

### Primo avvio
```bash
pnpm install                                   # dipendenze + hook git (commitlint)
pnpm db:start                                  # avvia Supabase locale, stampa URL e chiavi
cp apps/web/.env.example apps/web/.env.local   # incolla la PUBLISHABLE_KEY stampata da db:start
cp supabase/functions/.env.example supabase/functions/.env   # inserisci GEMINI_API_KEY
pnpm fn:serve                                  # Edge Functions su http://127.0.0.1:54321/functions/v1/
pnpm dev                                       # PWA su http://localhost:5173
```

### Sviluppo quotidiano
| Comando | Cosa fa |
|---|---|
| `pnpm dev` | PWA in sviluppo su http://localhost:5173 (service worker attivo anche in dev) |
| `pnpm build` | typecheck + build di produzione in `apps/web/dist` |
| `pnpm --filter web preview` | serve la build su http://localhost:4173 |
| `pnpm lint` | ESLint sulla PWA |
| `pnpm typecheck` | solo controllo dei tipi |
| `pnpm test` | test unitari della PWA (Vitest, `*.test.ts`) |

### Database (Supabase locale)
| Comando | Cosa fa |
|---|---|
| `pnpm db:start` / `pnpm db:stop` | avvia / ferma lo stack locale |
| `pnpm exec supabase status` | mostra URL e chiavi locali |
| `pnpm exec supabase migration new <nome>` | crea una nuova migration in `supabase/migrations` |
| `pnpm db:reset` | ricrea il DB applicando migration e `seed.sql` |
| `pnpm test:db` | test RLS (pgTAP) in `supabase/tests` |
| `pnpm db:types` | rigenera i tipi del DB per la PWA e per le functions (da fare dopo ogni migration) |

URL locali: API http://127.0.0.1:54321, Studio http://127.0.0.1:54323, Mailpit (email/magic link) http://127.0.0.1:54324, Postgres `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

### Edge Functions (Deno)
Deno è una dipendenza di sviluppo del progetto: non serve installarlo a parte.

| Comando | Cosa fa |
|---|---|
| `pnpm fn:serve` | serve tutte le functions in locale, con le variabili di `supabase/functions/.env` |
| `pnpm fn:check` | typecheck di ogni function |
| `pnpm fn:lint` | `deno lint` + controllo formattazione (`pnpm exec deno fmt` in `supabase/functions` per formattare) |
| `pnpm fn:test` | test unitari Deno (`*_test.ts`) |
| `pnpm exec supabase secrets set --env-file supabase/functions/.env` | carica i secret sul progetto remoto (solo su richiesta esplicita) |
| `pnpm exec supabase functions deploy <nome>` | deploy di una function (solo su richiesta esplicita) |

Variabili delle functions: `AI_PROVIDER` (`gemini` o `anthropic`), `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`, `AI_MODEL_TRANSCRIBE` (sempre un modello Gemini, serve anche con `AI_PROVIDER=anthropic`) (vedi `supabase/functions/.env.example`). `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` le fornisce Supabase.

### Git e qualità
| Comando | Cosa fa |
|---|---|
| `pnpm exec commitlint --edit` | verifica l'ultimo messaggio di commit (lo fa già l'hook) |
| `echo "feat(web): ..." \| pnpm exec commitlint` | verifica un titolo di PR prima di aprirla |

Prima di una PR: `pnpm lint && pnpm test && pnpm build && pnpm test:db && pnpm fn:check && pnpm fn:lint && pnpm fn:test`.
