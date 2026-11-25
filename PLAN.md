# Piano di lavoro

Punto di ripartenza per una nuova sessione. Le regole del progetto (stack, convenzioni, comandi) sono in [CLAUDE.md](./CLAUDE.md): questo file dice **dove siamo e cosa fare dopo**.

Ultimo aggiornamento: 2026-11-24. `main` a `b6d75fe` (PR #22), **tutto mergiato e in produzione** (frontend da Cloudflare; migration `lesson_stats` e function `chapter-test` v2 rilasciate a mano). Resta sul remoto solo `docs/next-steps-plan` (un vecchio commit di piano mai mergiato: si può cancellare).

## Stato attuale (tutto su `main` e in produzione)

| Area | Cosa c'è | Dove |
|---|---|---|
| Base | monorepo pnpm, PWA React/Vite, Supabase locale, RLS + test pgTAP, CI, commitlint | `apps/web`, `supabase`, `.github` |
| IA | `AiProvider` con Gemini (predefinito) e Anthropic, JSON validato con zod, uso token in `ai_usage` | `supabase/functions/_shared/ai` |
| Dialogo | chat con correzioni in italiano, scritta e **a voce** (trascrizione Gemini, risposta letta con `speechSynthesis`) | `tutor-chat`, `transcribe`, `features/dialogue` |
| Ripasso | flashcard FSRS di parole, errori e pronuncia, con voto dato dall'app (traduzione, frase corretta scritta o detta, parola ripetuta a voce; `review-check` per sinonimi e correzioni diverse) | `features/review`, `src/lib/fsrs.ts`, `functions/review-check` |
| Tempo di studio | obiettivo in minuti, timer solo sul tempo attivo, metà scritto/metà orale, banner di successo | `study_days` + RPC `add_study_time`, `features/study` |
| Primo accesso | scopo (svago/viaggi/lavoro/amore, uno solo) → test di livello (scritto fisso + orale valutato dall'IA) | `placement-test`, `features/onboarding`, `features/placement` |
| Accesso | email + password, registrazione con **approvazione del proprietario** (`profiles.approved`, da dashboard Supabase), reset e cambio password | `features/auth`, `requireApprovedUser` nelle functions |
| Notifiche push | promemoria giornaliero all'ora scelta (serie / ripassi / obiettivo), una al giorno, Web Push + VAPID, `pg_cron` orario | `send-reminders`, `features/notifications` |
| Installazione PWA | invito dopo l'accesso, una volta per dispositivo (Android: dialogo di sistema, iOS: passi Condividi → Home) + voce manuale in home | `src/lib/install.ts`, `InstallDialog` |
| Verifica di capitolo | 8 domande scritte (corrette sul server) + 2 consegne orali (valutate dall'IA, solo a voce: senza microfono la verifica non parte), 70/100 per passare, test nuovo dopo ogni tentativo, livello alzato a fine livello | `chapter-test`, `chapter_tests`, `features/chapter-test` |
| Percorso | 24 capitoli A1–B2 × 4 lezioni (struttura fissa in migration); lezioni generate per livello e scopo, salvate e preparate in anticipo; schermata Percorso (traccia di nodi, capitoli superati ripiegati) e "Continua il percorso" | `lesson`, `features/path`, `features/lesson` |
| Verifica di salto | sui capitoli bloccati un lucchetto aperto accanto al badge apre la verifica di quel capitolo; superarla segna superati i capitoli precedenti e alza `profiles.level` almeno a quello del capitolo (`levelAfterPass`, `buildPath`). La function non chiede più le lezioni completate | `chapter-test`, `features/path/progress.ts` |
| Esercizi e statistiche | dopo ogni risposta del quiz compare la traduzione italiana della frase con un pulsante per ascoltarla (`speechSynthesis`); le domande della verifica hanno `sentence`/`translation_it` (prompt `chapter-test.v2`, compatibile con le verifiche già salvate senza); a fine capitolo si vedono errori, serie massima di risposte giuste e percentuale. I dati si salvano in `lesson_stats` con la RPC `record_lesson_stats` (base per una futura pagina di profilo) | `features/lesson`, `components/SentenceFeedback.tsx`, `lesson_stats` |
| Grafica | palette maiolica (cobalto, limone), Fredoka per titoli e Nunito per il testo (self-hosted con `@fontsource-variable`), emoji Fluent come SVG (`components/Emoji.tsx`, `assets/emoji`), anello dell'obiettivo in home, animazioni solo alle azioni e con movimento ridotto rispettato, View Transitions tra schermate | `src/index.css`, `features/study/GoalRing.tsx` |
| Navigazione | barra in basso Home, Percorso, Profilo, Impostazioni sulle schermate principali (scroll ricordato per schermata); obiettivo, scopo e test di livello dal Profilo; promemoria, suoni, installazione, password ed Esci in Impostazioni. Le attività (lezione, dialogo, ripasso, verifiche) hanno la freccia indietro | `features/nav`, `features/settings` |

**Manca:** valutazione della pronuncia (fase 5) e il debito tecnico (sessione a parte). Le prove in produzione e su telefono sono state fatte dal proprietario.

## Ripartire

1. In locale: comandi di "Primo avvio" in CLAUDE.md. In `supabase/functions/.env` serve `GEMINI_API_KEY` (credito di Google AI Studio); i modelli sono già in `.env.example` (`gemini-3.8-flash`, `gemini-3.5-flash-lite`).
2. Prima di cambiare codice: `pnpm lint && pnpm test && pnpm build && pnpm test:db && pnpm fn:check && pnpm fn:lint && pnpm fn:test` devono passare.
3. Lavorare su un branch parlante creato da `main` (es. `feat/<slug>`), commit con l'autore dell'utente (config git locale), PR piccole, squash merge solo con CI verde e su richiesta dell'utente.

## Fatto: verifica di fine capitolo (PR #9)

Provata in locale con Gemini reale e nel browser (percorso fallito, riprova con test nuovo, superato, capitolo successivo sbloccato). Scelte prese rispetto alla proposta:

- Senza microfono l'orale diventa 2 risposte scritte valutate allo stesso modo (`TypedAnswer`), come proposto.
- `MultipleChoice` della lezione non è stato riusato: mostra subito giusto/sbagliato e qui le risposte restano sul server; le giuste si vedono a fine verifica.
- Un test non ancora tentato viene riusato; dopo un tentativo ne viene generato uno nuovo. Un capitolo superato non può essere rifatto (409).
- Se l'orale è lasciato vuoto, il punteggio orale è 0 senza chiamare l'IA.

## Fatto: notifiche push (PR #10)

- Libreria: `jsr:@negrel/webpush` (la `web-push` di npm forza https e dipende da moduli Node). Provata in Deno: cifratura `aes128gcm` decifrata da un finto servizio push, firma VAPID, TTL.
- Provato in locale: un solo invio al giorno, scelta del messaggio (serie / ripassi / obiettivo), silenzio a obiettivo raggiunto o fuori ora, iscrizione scaduta (410) rimossa, secret sbagliato 401.
- **Non provato:** il permesso e l'iscrizione in un browser vero (il pannello del browser integrato blocca le notifiche e non registra il service worker) e la consegna da un vero servizio push (FCM/Apple). Da provare a mano su telefono con l'app installata (ora il deploy c'è).
- In produzione è già attivato (chiavi, secret, Vault, deploy). `VAPID_SUBJECT` deve avere il prefisso `mailto:` (o essere un URL https).

## Fatto: login con password e approvazione (PR #11)

- Registrazione aperta, "Confirm email" **disattivato** su Supabase (altrimenti ogni registrazione manda un'email e si finisce nel limite d'invio della posta integrata). Il primo account di un database vuoto è approvato da solo; gli altri aspettano `approved = true` (trigger `protect_profile_approval`: un utente non può approvarsi).
- Le functions con l'IA usano `requireApprovedUser` (403 se non approvato). `send-reminders` no: è chiamata dal cron con `x-cron-secret`.
- L'utente creato prima delle migration non aveva un profilo: serve `insert into public.profiles (id, approved) select id, true from auth.users where id not in (select id from public.profiles);` (già eseguita in produzione).
- Provato in locale nel browser (registrazione, attesa, approvazione, password sbagliata, reset). Il modulo "Cambia password" dalla home non è stato provato a parte.

## Fatto: invito all'installazione (PR #14)

Modellato su aiTool (`src/install.ts`). Provato in emulazione mobile (evento `beforeinstallprompt` sintetico e user agent iPhone); **non** su un telefono vero. Dopo il merge il frontend si pubblica da solo: controllare che il sito serva il dialogo "Installa Kern Sprache sul telefono" (e non più la vecchia barra in alto).

## Produzione (2026-11-23)

- **Sito:** https://aitool-kernsprache.geom-malacaria.workers.dev (Cloudflare Workers, build da `main` con `pnpm run build` + `npx wrangler deploy`, config in `wrangler.jsonc`; i build leggono le variabili `VITE_*` **di build** del Worker). Attenzione: `aitool-kernsprache.kernsprache.workers.dev` è una vecchia copia di un altro account, non si aggiorna dal repo. Il frontend si pubblica da solo a ogni merge su `main` (circa 3-4 minuti); migration, functions e secret **no**.
- **Rilascio del 2026-11-25:** applicate le migration `20261125100000_pronunciation_mistakes`, `20261125120000_goal_half_split`, `20261125140000_lesson_parts` (PR #35, #37, #38) e pubblicate `review-check` (nuova), `transcribe` e `tutor-chat` (rimaste indietro dalla #35). Verificato: nessuna migration in sospeso, functions online (401 senza accesso). Da provare sul telefono: lezione divisa in scritto e orale e ripasso con voto automatico.
- **Supabase:** progetto `KernSprache` (produzione), repo collegato con `supabase link`; 17 migration applicate, 8 functions pubblicate, secret impostati (`GEMINI_API_KEY`, `AI_*`, `VAPID_KEYS`, `VAPID_SUBJECT`, `CRON_SECRET`), Vault con `project_url` e `reminders_secret`. Auth: Site URL e Redirect URLs sull'indirizzo `geom-malacaria`, "Confirm email" disattivato.
- **Provato in produzione:** accesso, dialogo con l'IA, reset password.
- **Provato (2026-11-24, dal proprietario):** verifica di capitolo, promemoria su telefono, invito all'installazione, nuova grafica su telefono vero. Per riprovare i promemoria: in SQL Editor `select public.call_send_reminders();` poi `select status_code, content from net._http_response order by created desc limit 1;` (`200` ok, `401` secret diversi).
- **Fatto:** limite di spesa su Google AI Studio.
- **Da fare:** scadenza/revoca dei token di release (`SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN` di sola lettura).
- **Come si rilascia:** vedi "Release" in `CLAUDE.md`. Le credenziali stanno in `~/.config/kernsprache/release.env` (caricato da `~/.zshenv`, non leggerlo). Con questo CLI servono `--remote` e, in modalità agente, `--yes` per `db push`, `functions deploy`, `secrets set`; `supabase migration list` senza `--remote` guarda il database locale. Mai `secrets set --env-file` con il `.env` locale (sovrascriverebbe i secret di produzione).
- **Attenzione a `apps/web/.env.local`:** il proprietario l'ha puntato alla produzione e la riga `VITE_SUPABASE_URL` è doppia/malformata. Per lavorare in locale sovrascrivere dalla riga di comando: `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=<anon locale> pnpm --filter web dev`. Un build locale con quel file incorpora la produzione: non pubblicare mai da locale.

## Poi

- Roadmap fase 5: valutazione della pronuncia.
- Schermata admin per approvare i nuovi utenti (oggi si fa da dashboard Supabase): solo se gli utenti diventano più d'uno.
- Testi delle email di Supabase in italiano (Authentication → Emails): oggi il reset arriva in inglese.

## Debito tecnico e cose da verificare

- `pnpm fn:serve` ora è provato in locale e funziona (dopo `pnpm db:start`).
- Se `pnpm` o `deno` cercano pacchetti su `npm.pepita.io` (registry aziendale, senza VPN non risolve): usare `npm_config_manage_package_manager_versions=false` per pnpm e `NPM_CONFIG_REGISTRY=https://registry.npmjs.org` per Deno.
- Se la prima lezione si apre mentre il prefetch dello stesso capitolo è in corso, la lezione può essere generata due volte (costo minimo). Lo risolve il lock della cache condivisa in `PLAN-multilingua.md` (PR 5).
- I tipi delle risposte delle functions sono duplicati nella PWA (`features/dialogue/types.ts`, `features/lesson/types.ts`, `features/placement/api.ts`): tenerli allineati agli schemi zod. Scelta del proprietario: si lasciano così (il piano multilingua riscrive comunque quegli schemi).
- `profiles.goal` contiene i dettagli dello scopo in parole dell'utente (il nome è storico; col multilingua passa a `learner_languages`).
- Chiuso il 2026-11-24: hook `useVoiceRecorder` condiviso da `VoiceComposer` e `SpokenAnswer`; prompt `tutor-chat.v2` verificato con Gemini reale (le risposte cambiano con lo scopo, correzioni identiche); i test pgTAP passano anche su un database con dati (le conte sono filtrate dalla RLS e il test di approvazione cancella gli utenti dentro la transazione); colonna `elapsed_days` tolta da `vocab_items` e `mistakes`.

## Come provare (note pratiche)

- **Login in locale:** registrarsi dalla PWA con email e password (il primo account è approvato da solo; gli altri: `update profiles set approved = true` dal container Postgres). Per link di reset o magici: Mailpit (`http://127.0.0.1:54324/api/v1/messages`, poi `/api/v1/message/<ID>` e il primo `href`). Il browser integrato oscura i token nelle URL: impostare la sessione con `localStorage` (`sb-127-auth-token`) via JavaScript.
- **Utente con password per curl:** `POST /auth/v1/signup` e `POST /auth/v1/token?grant_type=password` con l'header `apikey` (chiave anon locale di `supabase status`).
- **Microfono finto in Playwright:** Chromium con `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<file.wav>` e il permesso `microphone`.
- **Audio di prova in inglese con errori:** generarlo con il modello TTS di Gemini (`gemini-3.1-flash-tts-preview`, `responseModalities: ["AUDIO"]`, PCM 24 kHz da avvolgere in WAV), poi `ffmpeg` per webm/mp4.
- **Tempo di studio vicino alle soglie:** precaricare `study_days` (obiettivo 5 minuti) invece di aspettare. `psql` non è installato: usare `docker exec supabase_db_kern-sprache psql -U postgres -Atc "..."`.
- **Prove di push in locale:** finto servizio push in Deno che decifra l'`aes128gcm` (RFC 8291) e `send-reminders` avviata con `deno run -A` e `DENO_SERVE_ADDRESS`.

## UX: stato e cosa resta

Fatto: restyling completo, menu laterale su home e percorso, emoji Fluent, font Fredoka/Nunito, verifica di salto.
Provato dal proprietario su telefono: tutto fino alla #21. Da provare: traduzione/ascolto dopo le risposte e statistiche di fine capitolo (#22). Resta (non bloccante): riguardare con calma dialogo (bolle e correzioni), ripasso con carte di errori, test di livello orale e schermata di risultato delle verifiche sul telefono; valutare se mettere il menu anche nelle schermate di attività (rischio: perdere il progresso a metà lezione).

## Prossimi passi

1. **Fase 5: pronuncia.** Fatto: nel dialogo a voce (`transcribe` con `assess`, nota "Pronuncia") e dopo ogni esercizio con una frase (`RepeatSentence` in `SentenceFeedback`: "Ripeti la frase", giudizio rispetto alla frase giusta con `expected_text`, trascrizione letterale). Da fare: pronuncia nelle risposte orali di verifiche e test di livello, salvataggio dell'esito accanto a `lesson_stats`.
2. **Voce Gemini con cache** (branch `feat/gemini-voice`): function `speak`, tabella `tts_cache`, bucket privato `tts`, `AI_MODEL_TTS`. Per rilasciarla: `supabase db push`, `supabase functions deploy speak`, `supabase secrets set AI_MODEL_TTS=gemini-3.1-flash-tts-preview` (con conferma). Possibile miglioria: generare in anticipo le frasi di una lezione appena creata, per togliere i 3-4 secondi della prima riproduzione.
3. **Dettato (esercizio di ascolto)**: fatto (PR `feat/dictation`): parte "Dettato" della lezione dopo l'ascolto, 3 frasi brevi da espressioni ed esempi; confronto parola per parola con le parole sbagliate sottolineate, si ripete finché è giusto, il testo si può leggere; −20 punti per ogni tentativo sbagliato e −30 per il testo mostrato (punteggio della frase 0-100); ogni tentativo sbagliato e la lettura del testo contano come errori in `lesson_stats`.
4. **Pagina di profilo**: fatta (`features/profile`, voce "Profilo" nel menu): serie e record di giorni con obiettivo, giorni e tempo di studio, grafico degli ultimi 14 giorni, risposte da `lesson_stats`, carte nel ripasso, avanzamento per livello. Da aggiungere quando ci sono i dati: esiti di pronuncia e punteggi del dettato salvati.
5. **Debito tecnico residuo** (sezione sopra): niente di urgente; lock sulla generazione delle lezioni nel piano multilingua.

## Prossimo blocco: scritto + orale e navigazione (deciso il 2026-11-24)

Regole scritte in `CLAUDE.md` (Obiettivi del prodotto). Vanno fatte **prima** del piano multilingua (`PLAN-multilingua.md`), perché sono più piccole e toccano gli stessi file: lezione, home e menu. Una PR per punto, da `main`.

1. ✅ **`feat(db): reach the daily goal only with half written and half oral`** (fatta: migration `20261125120000_goal_half_split`, anello a due colori)
   - Migration nuova che ridefinisce `add_study_time`: `completed_at` si imposta solo quando `written_seconds >= goal_minutes * 30` **e** `oral_seconds >= goal_minutes * 30`, non più sulla somma.
   - I giorni già chiusi restano come sono.
   - Test pgTAP: 18 + 2 minuti non chiude il giorno, 10 + 10 sì.
   - PWA: anello e banner (`features/study`, `GoalRing`, `StudyPrompts`) mostrano il totale e le due metà. "Obiettivo raggiunto" compare solo con le due metà; con il totale già pieno ma una metà mancante, il messaggio dice cosa manca ("ancora 4 minuti di orale").
   - Da ricontrollare: la serie in `profileStats.ts` e la scelta del promemoria in `_shared/reminders.ts` usano `completed_at`, quindi seguono da sole. Va verificato.
2. ✅ **`feat(web): split lessons into written and oral parts`** (fatta: migration `20261125140000_lesson_parts`; la ripresa a metà parte sta sul dispositivo, non nel DB)
   - Il selettore Scritto | Orale in cima alla lezione si può cambiare in qualsiasi momento.
     - **Scritto:** grammatica, parole, quiz, dettato, lettura, dialogo scritto.
     - **Orale:** ascolto, "Ripeti la frase" sulle frasi della lezione, dialogo a voce.
   - Ogni parte ha il suo segno di completata.
   - DB: `lesson_progress` con `written_done_at` e `oral_done_at`. `completed_at` si imposta quando ci sono tutte e due. Le righe esistenti restano completate.
   - Percorso, sblocco della lezione successiva e verifica di capitolo usano `completed_at` come oggi.
   - Lezione già completata: si riapre e si può rifare l'una o l'altra parte. Il punteggio e `lesson_stats` restano quelli dell'ultima volta.
   - **Freccia indietro** al posto di "Esci". Il punto raggiunto in ciascuna parte si salva, così riaprendo si riprende da lì.
   - Senza microfono **non si va avanti**, come deciso dal proprietario: non c'è un ripiego scritto per l'orale.
     - La lezione resta non conclusa e la successiva bloccata.
     - La parte scritta si può fare e segnare come fatta.
     - Nella parte orale un messaggio spiega che serve il microfono e come attivarlo: permesso del browser, oppure l'app installata sul telefono. Va distinto il "permesso negato" da "nessun microfono" (`canRecord()` e l'errore di `getUserMedia`).
   - Si rifà la mappatura del flusso attuale (`LessonPage.tsx`: sezioni in fila, poi dialogo in un solo modo), dopo le PR #33-#35.
3. ✅ **`feat(web): replace the side menu with a bottom tab bar`** (fatta, con la porta della PWA spostata su 5273 e lo scroll ricordato per schermata)
   - Barra in basso con Home | Percorso | Profilo | Impostazioni, solo nelle schermate principali; dentro le attività c'è la freccia indietro.
   - Profilo: le statistiche di oggi, poi "Obiettivo e scopo" e "Rifai il test di livello", spostati dal menu.
   - Nuova pagina Impostazioni: promemoria (`NotificationSettings`), effetti sonori, installa l'app, cambio password (`ChangePassword`), esci.
   - Si tolgono `AppMenu.tsx` e `SideMenu.tsx`.
   - Barra rispettosa della safe area di iOS (`env(safe-area-inset-bottom)`). Si prova in emulazione mobile e su telefono.
4. ✅ **`feat(web): require the oral part of chapter tests`** (fatta: `NoMicrophone` condiviso con la lezione, la verifica non viene nemmeno generata senza microfono)
   - Come per le lezioni, senza microfono non si va avanti.
   - Si toglie il ripiego `TypedAnswer` in `ChapterTestPage.tsx` (oggi lo usa quando `canRecord()` è falso). Senza microfono la verifica, compresa quella di salto, non parte e mostra lo stesso messaggio della lezione: dare il permesso, oppure aprire l'app sul telefono.
   - La function `chapter-test` riceve le trascrizioni come testo, quindi non può distinguere una risposta scritta da una detta. Il controllo è nella PWA. Se servisse una garanzia sul server, la function dovrebbe ricevere l'audio e trascriverlo lei: costa di più, per ora non serve.
   - Il test di livello resta com'è, per scelta del proprietario: senza microfono salta l'orale (`PlacementTestPage.tsx`). Serve solo a scegliere il punto di partenza e non deve bloccare il primo accesso.
