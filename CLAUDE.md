# Kern Sprache – CLAUDE.md

Kern Sprache (famiglia di app "Kern", come aiTool) è un'app personale (PWA) per imparare le lingue partendo dalle basi. Oggi insegna l'inglese a chi parla italiano; il passaggio a più lingue è descritto in [PLAN-multilingua.md](PLAN-multilingua.md). Copre grammatica, ascolto e dialogo, con un tutor IA che corregge e incentiva, e notifiche push sul telefono.

> **Stato e prossimi passi:** vedi [PLAN.md](PLAN.md). Aggiornalo quando chiudi un passo.

Per ora l'unico utente è lo sviluppatore. Priorità: costi bassi, codice semplice e manutenibile, nessuna dipendenza da abbonamenti (si usano API a consumo).

## Obiettivi del prodotto
- Percorso a capitoli di difficoltà crescente (6 per livello, da A1 a B2), ognuno con 4 lezioni e una verifica finale. La struttura è fissa (migration); i capitoli sotto il livello del test sono superati, il capitolo in corso è il primo non superato, le lezioni si sbloccano in ordine.
- Lezione: 6-8 minuti con inizio e fine (nel tempo giornaliero ne stanno una o più). Parti: grammatica, 5 parole nuove, 3 espressioni, 1 modo di dire, 3 verbi, ascolto e comprensione, dettato (3 frasi brevi da ascoltare e scrivere: le parole sbagliate si sottolineano e si riprova finché è giusto; ogni tentativo sbagliato e la lettura del testo tolgono punti alla frase e contano come errori nelle statistiche), lettura e comprensione, dialogo di 3 turni con il tutor. Parole ed espressioni finiscono nel ripasso.
- Il contenuto di ogni lezione è generato dall'IA per livello e scopo dell'utente e salvato in `lesson_contents` (rigenerato se cambia lo scopo); le lezioni del capitolo in corso vengono preparate in anticipo, e aprendo l'ultima lezione di un capitolo si prepara il successivo.
- Correzione di ogni errore: frase originale, correzione, spiegazione breve **in italiano**.
- Negli esercizi a scelta, dopo la risposta compare in basso la frase inglese con il pulsante per ascoltarla (`speak`) e la traduzione italiana (componente `SentenceFeedback`): nei quiz della lezione dalle traduzioni già nel contenuto, nella verifica di capitolo nella revisione finale (le risposte si vedono solo alla fine), con `sentence_en` e `translation_it` generati dall'IA (prompt `chapter-test.v2`; i test salvati prima non li hanno). Il test di livello non li mostra.
- Statistiche degli esercizi: per ogni lezione completata si salvano risposte, giuste e serie massima di risposte giuste di fila (`lesson_stats`); a fine lezione si vedono quelle della lezione, all'ultima lezione del capitolo e nel risultato della verifica i totali del capitolo (errori, serie massima, percentuale di successo). Serviranno per una futura pagina di profilo.
- Dialoghi in inglese semplice, scritti e vocali.
- Ripasso con spaced repetition degli errori e delle parole nuove.
- Notifiche: al massimo una al giorno all'ora scelta dall'utente (ora locale del suo fuso): serie a rischio (almeno 2 giorni di fila), altrimenti ripassi in scadenza, altrimenti l'obiettivo del giorno; nessuna se l'obiettivo è già raggiunto. Si attivano dalla home, solo dopo un clic.
- Tono del tutor: incoraggiante ma onesto, niente piaggeria né complimenti generici.
- Accesso con email e password. Chi non ha un account si registra e resta **in attesa** finché il proprietario non lo approva da dashboard Supabase (Table Editor > `profiles` > `approved` = true): finché non è approvato vede solo la schermata "Account in attesa" e le Edge Functions che usano l'IA rifiutano le sue richieste. Il primo account di un database vuoto è approvato da solo (il proprietario; in locale il primo che si registra). Password dimenticata e cambio password dall'app. Su Supabase: registrazioni aperte, **"Confirm email" disattivato** (niente email alla registrazione), Site URL e Redirect URLs con l'indirizzo della PWA (servono per il link di reset).
- Al primo accesso si sceglie lo scopo dello studio (svago, viaggi, lavoro, amore: uno solo, modificabile), che orienta situazioni dei dialoghi, lessico ed esempi; poi c'è il test di livello (saltabile, si parte da A1), ripetibile dalla home.
- Verifica di fine capitolo: disponibile quando le 4 lezioni sono complete, oppure come **verifica di salto** su un capitolo bloccato (pulsante "Salta qui con una verifica" nel Percorso): superarla segna come superati i capitoli precedenti e alza `profiles.level` almeno al livello di quel capitolo. È sempre metà scritta (8 domande a scelta multipla, corrette sul server) e metà orale (2 consegne valutate dall'IA, scritte se il microfono manca). Punteggio = media dei due, si passa con 70/100; dopo un tentativo la verifica successiva è nuova. Superare l'ultimo capitolo di un livello alza `profiles.level`.
- Test di livello: metà scritto (16 domande fisse a scelta multipla, 4 per livello A1–B2, corrette sul server: un livello è superato con 3/4 e solo se lo sono anche quelli sotto) e metà orale (4 risposte a voce valutate dall'IA). Livello finale = media dei due arrotondata per difetto.
- Profilo (dal menu laterale): livello e scopo, giorni di fila con obiettivo raggiunto (stessa regola dei promemoria) e record, giorni di studio e tempo totale, grafico dei minuti negli ultimi 14 giorni, risposte (lezioni, percentuale giuste, errori, record di fila da `lesson_stats`), carte nel ripasso e avanzamento per livello.
- Obiettivo giornaliero in minuti scelto dall'utente (`profiles.daily_goal_minutes`). Il timer conta solo il tempo attivo nel dialogo e nel ripasso: app in primo piano, finestra attiva e un'interazione negli ultimi 2 minuti.
- La giornata è divisa a metà: prima lo scritto (dialogo scritto e ripasso), poi l'orale (dialogo a voce). A metà si invita a passare all'orale; raggiunto l'obiettivo compare un banner di successo e l'esercizio si ferma finché l'utente non chiede di continuare.

## Stack
- **Frontend:** React + TypeScript + Vite, `vite-plugin-pwa` (manifest e service worker).
- **Backend:** Supabase (Auth, Postgres, Edge Functions in Deno, `pg_cron`).
- **IA:** API di Google Gemini (credito di Google AI Studio) come provider predefinito, Anthropic come alternativa; si sceglie con `AI_PROVIDER`. Il provider viene chiamato **solo dalle Edge Functions**: la chiave API non deve mai arrivare al client.
- **Voce:** da voce a testo con Gemini (function `transcribe`, audio registrato con `MediaRecorder`: webm su Android/desktop, mp4 su iOS); da testo a voce con una voce Gemini (function `speak`, modello `AI_MODEL_TTS`): ogni frase si genera una volta sola e il WAV resta in un bucket privato (`tts_cache`), le riprese servono dalla cache senza richiamare il modello. Se la function non risponde entro 8 secondi si ripiega su `speechSynthesis` del browser (`lib/audio.ts`).
- **Effetti sonori:** suoni brevi per risposta giusta e sbagliata nei quiz delle lezioni, sintetizzati con Web Audio (`lib/sounds.ts`, nessun file); si disattivano dal menu (`localStorage` `kernsprache.sounds`).
- **Spaced repetition:** `ts-fsrs`, calcolato nel client (`src/lib/fsrs.ts`): la PWA aggiorna i campi FSRS delle proprie righe tramite RLS. Le carte sono le parole (`vocab_items`) e gli errori (`mistakes`).
- **Push:** Web Push con chiavi VAPID (`jsr:@negrel/webpush`, Web Crypto nativa in Deno), inviato da `send-reminders` richiamata ogni ora da `pg_cron`. Chiavi: `pnpm push:keys` (`VAPID_KEYS` e `CRON_SECRET` nei secret delle functions, `VITE_VAPID_PUBLIC_KEY` nella PWA). Il job legge `project_url` e `reminders_secret` da Vault: finché non esistono non fa nulla.
- **Hosting frontend:** Cloudflare Workers (piano gratuito): Workers Builds pubblica da `main` a ogni merge, config in `wrangler.jsonc`, indirizzo `aitool-kernsprache.geom-malacaria.workers.dev`.

## Vincoli di piattaforma
- iOS: le notifiche push funzionano solo se la PWA è installata da **Safari → Condividi → Aggiungi a Home**. L'app propone l'installazione **dopo l'accesso** (mai nella pagina di login), solo su schermi touch e mai se gira già in modalità standalone (`display-mode: standalone`): una volta per dispositivo, circa 4 secondi dopo che la home è pronta (`localStorage` `kernsprache.installOffered`), più la voce manuale "Installa l'app" nella home. Su Android/Chromium il pulsante "Installa" usa l'evento `beforeinstallprompt` conservato (`src/lib/install.ts`); su iOS non esiste un'API, quindi il dialogo (`InstallDialog`) mostra i passi Condividi → Aggiungi alla schermata Home e avvisa che al primo avvio dall'icona va rifatto l'accesso (lo storage della PWA su iOS è separato). Il permesso per le notifiche si chiede solo dopo un'azione dell'utente.
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
    lesson             contenuto delle lezioni: generazione, salvataggio e preparazione anticipata di un capitolo
    speak              voce Gemini con cache: restituisce il percorso firmato del WAV di una frase (generata una sola volta, `tts_cache` + bucket `tts`)
    transcribe         trascrizione letterale del parlato (Gemini), errori inclusi; con `assess: true` valuta anche la pronuncia (punteggio 0-100, fino a 3 parole da migliorare con consiglio in italiano) nella stessa chiamata; con `expected_text` la giudica rispetto a una frase nota (ripetizione negli esercizi), mantenendo letterale la trascrizione
    chapter-test       verifica di fine capitolo: domande generate dall'IA, correzione dello scritto e valutazione dell'orale sul server
    placement-test     test di livello iniziale (domande e correzione dello scritto, valutazione dell'orale)
    send-reminders     promemoria giornaliero via Web Push (chiamata ogni ora da pg_cron con x-cron-secret, senza JWT utente)
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
- `profiles`: id (= auth.uid), approved (solo il proprietario/service role può cambiarlo: trigger `protect_profile_approval`), level (A1–B2), purpose (`leisure|travel|work|love`, uno solo), goal (dettagli in parole dell'utente), onboarded_at, reminder_time, timezone, daily_goal_minutes
- `chapters`: id, level, sort_order, slug, title, description_it, grammar_focus (sola lettura)
- `lessons`: id, chapter_id, sort_order, slug, title, focus (sola lettura)
- `lesson_progress`: user_id, lesson_id, score, completed_at
- `lesson_stats`: user_id, lesson_id, chapter_id (preso dalla lezione), answers, correct, best_streak, completed_at; una riga per lezione (ripetendola si sovrascrive). Si scrive solo con la RPC `record_lesson_stats`, che rifiuta numeri impossibili (giuste > risposte, serie incompatibile con gli errori, più di 100 risposte): il quiz è corretto nel browser, quindi i numeri non sono dimostrabili.
- `lesson_contents`: user_id, lesson_id, purpose, content (JSON), prompt_version; scritta solo dalla function `lesson`
- `chapter_tests`: id, user_id, chapter_id, questions (con le risposte giuste e, da `chapter-test.v2`, `sentence_en` e `translation_it`), oral_tasks, prompt_version; nessun accesso per gli utenti, solo la function `chapter-test` (service role)
- `chapter_test_attempts`: id, user_id, chapter_id, test_id, written_score, oral_score, score, passed, feedback; select dei propri record, scritta solo dalla function `chapter-test`
- `sessions`: id, user_id, chapter_id, lesson_id, kind (lesson|dialogue|review), started_at, ended_at
- `mistakes`: id, user_id, session_id, original, corrected, explanation_it, category, created_at, campi FSRS (gli errori sono anche carte di ripasso)
- `vocab_items`: id, user_id, en, it, campi FSRS (due, stability, difficulty, reps, lapses, state, last_review)
- `study_days`: user_id, day (giorno locale), goal_minutes, written_seconds, oral_seconds, completed_at. Si scrive solo con la RPC `add_study_time` (incremento atomico, max 120 s per chiamata).
- `placement_results`: risposte e livelli (scritto, orale, finale) di ogni test di livello; scritta solo dalla function `placement-test`.
- `push_subscriptions`: id, user_id, endpoint, p256dh, auth, created_at; si registra con la RPC `register_push_subscription` (un endpoint passa a chi ha fatto l'accesso sul dispositivo)
- `reminder_log`: user_id, day (giorno locale), kind; una riga al giorno per utente, scritta solo da `send-reminders`
- `tts_cache`: key (sha256 di voce + frase), text, voice, path del WAV nel bucket privato `tts`; RLS attiva senza policy, solo la function `speak` (service role) la usa.
- `ai_usage`: user_id, function_name, model, token in/out/cache (scritta solo dalle Edge Functions con la service role)

Su tutte le tabelle con `user_id` la RLS è attiva, con policy `user_id = auth.uid()`. Il profilo viene creato da un trigger su `auth.users`. `chapters` e `lessons` sono in sola lettura per gli utenti; `ai_usage` è in sola lettura (propri record). I test RLS (pgTAP) sono in `supabase/tests`.

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
- Permessi in `.claude/settings.json`: comandi di dev/test consentiti; vietati la lettura dei file con segreti veri (`.env`, `.env.local`, `.env.*.local`, `.env.keys`, in qualsiasi cartella) e il force push. I comandi di release (`supabase link`, `supabase db push`, `supabase functions deploy`, `supabase secrets set`, `wrangler deploy`) sono in modalità **chiedi conferma**: partono solo se l'utente li approva uno per uno. I template `.env.example` contengono solo segnaposto e si possono leggere e modificare.
- Le credenziali di release (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) stanno solo nelle variabili d'ambiente del terminale dell'utente: non vanno scritte in file del repo né in chat.
- Prima di committare: `pnpm lint`, `pnpm test`, `pnpm build`; se cambiano le functions `pnpm fn:check`, `pnpm fn:lint`, `pnpm fn:test`; se cambia lo schema `pnpm test:db` e `pnpm db:types`.
- Non aprire PR, non fare push su `main` e non fare deploy senza richiesta esplicita.
- **Release** (solo su richiesta esplicita, in quest'ordine): 1) PR mergiate su `main` con la CI verde; 2) `pnpm lint && pnpm test && pnpm build && pnpm test:db && pnpm fn:check && pnpm fn:lint && pnpm fn:test`; 3) `pnpm exec supabase migration list` per vedere cosa manca in produzione, poi `pnpm exec supabase db push` mostrando prima l'elenco; 4) `pnpm exec supabase functions deploy <nome>` per le functions cambiate (`send-reminders` con `verify_jwt = false`, già in `config.toml`); 5) secret nuovi con `supabase secrets set` solo se servono; 6) il frontend si pubblica da Cloudflare dopo il merge su `main` (non fare `wrangler deploy` da locale: il build locale incorpora `apps/web/.env.local`). Le migration vanno applicate in ordine di timestamp: se una PR con una migration più vecchia arriva dopo, mergiarla prima.

## Costi
- Obiettivo: meno di ~€15 al mese.
- Limite di spesa / budget impostato nella console del provider (Google AI Studio o Anthropic).
- Ogni chiamata IA registra i token usati (tabella `ai_usage`, opzionale) per monitorare la spesa.

## Roadmap
1. **MVP:** setup del repo, login, chat testuale con correzioni in JSON, salvataggio di errori e parole.
2. Flashcard con FSRS e notifiche push (promemoria e ripassi in scadenza).
3. Voce: trascrizione per il parlato, sintesi vocale per l'ascolto.
4. Curriculum strutturato A1→B2 e test di livello iniziale.
5. Valutazione della pronuncia: fatta con Gemini nel dialogo a voce (`transcribe` con `assess`, `PronunciationNote`) e nella ripetizione delle frasi dopo gli esercizi (`RepeatSentence`, con `expected_text`); da estendere alle verifiche orali e da salvare per il profilo.

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

Variabili delle functions: `AI_PROVIDER` (`gemini` o `anthropic`), `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_SMART`, `AI_MODEL_TRANSCRIBE` e `AI_MODEL_TTS` (sempre modelli Gemini, servono anche con `AI_PROVIDER=anthropic`; `AI_TTS_VOICE` facoltativa, predefinita Kore) (vedi `supabase/functions/.env.example`). `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` le fornisce Supabase.

### Git e qualità
| Comando | Cosa fa |
|---|---|
| `pnpm exec commitlint --edit` | verifica l'ultimo messaggio di commit (lo fa già l'hook) |
| `echo "feat(web): ..." \| pnpm exec commitlint` | verifica un titolo di PR prima di aprirla |

Prima di una PR: `pnpm lint && pnpm test && pnpm build && pnpm test:db && pnpm fn:check && pnpm fn:lint && pnpm fn:test`.
