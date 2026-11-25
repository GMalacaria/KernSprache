# Kern Sprache: multilingua + i18n

> Aggiornato il 2026-11-25 su `main` a `aa4da98` (PR #39). La PR 1 (nome e icona) è fatta (#31). Il blocco "scritto + orale e navigazione" di `PLAN.md` è mergiato nei punti 1-3 (#37-#39); resta il punto 4 (orale obbligatorio nelle verifiche di capitolo). Il refactoring tocca quasi tutti i file, quindi va fatto **da solo**, senza altre sessioni che scrivono in parallelo.

## Prerequisiti prima di partire
1. Nessun'altra sessione al lavoro sul repo e `main` aggiornato (`git pull`, `gh pr list`). Al 2026-11-25 nessuna PR aperta.
2. Il blocco "scritto + orale e navigazione" di `PLAN.md` è mergiato: ✅ punti 1-3; il punto 4 (`ChapterTestPage.tsx` senza `TypedAnswer`) è piccolo e tocca un file che la PR 2 sposta nel catalogo, quindi conviene farlo **prima** della PR 2.
3. ✅ Mappatura dei punti legati all'inglese rifatta su `aa4da98` (`git grep -n "Italian.*English\|lang=\"en\"\|_it\b\|\.en\b"`): circa 65 file, vedi "Cosa è cambiato (PR #36–#39)". Se arrivano altre PR, va ripetuta.
4. Ultima migration su `main`: `20261125160000_practice_time.sql`. Le nuove devono avere timestamp successivi.
5. Dump di produzione prima della PR 3, su richiesta esplicita.
6. Si riparte dalla PR 2, un branch alla volta, sempre da `main`.

## Cosa è cambiato (PR #36–#39)
- **Obiettivo giornaliero a metà scritto e metà orale (#37)**: `add_study_time` (migration `20261125120000`), `studyStatus` in `features/study/studyMath.ts`, `GoalRing` a due archi. Resta **globale** (non per lingua), come `study_days`.
- **Tempo di ripasso e dialogo libero (#38/#39)**: `study_days.review_seconds` / `dialogue_seconds`, RPC `add_practice_time` (migration `20261125160000`), hook `usePracticeActivity`. Statistica globale; se un giorno servisse per lingua, va aggiunta la `language` alla RPC (non previsto).
- **Lezione in parte scritta e orale (#38)**:
  - migration `20261125140000_lesson_parts`: `lesson_progress.written_done_at` / `oral_done_at` / `written_stats` / `oral_stats`. Valgono per lingua tramite la lezione, nessuna colonna nuova;
  - `features/lesson/parts.ts`: `PART_LABEL` (testi da mettere nel catalogo, PR 2), `repeatSentences` costruite da `grammar.examples` con `{ en, it }` e `normalizeWords(sentence.en)`: nella PR 4 diventano `{ text, translation }`, e `normalizeWords` multilingua serve anche qui (PR 9);
  - `RepeatExercise.tsx` nuovo: `lang="en"`, `sentence.en`, `ListenButton` senza lingua;
  - `LessonPage.tsx`: `prefetchSpeech` ora usa anche `repeatSentences(...).map(d => d.en)`, `dialogue.scenario_it`, `idioms` con `meaning_it`; messaggi sul microfono in italiano (catalogo);
  - ripresa a metà in `localStorage` `kernsprache.lesson.<id>.<parte>`: l'id della lezione è già diverso per lingua, nessun cambio.
- **Barra in basso (#39)**: `features/nav/TabBar.tsx`, `scrollMemory.ts`, `features/settings/SettingsPage.tsx`, `components/BackButton.tsx`; `AppMenu.tsx` e `SideMenu.tsx` eliminati. Effetti:
  - PR 2: nel catalogo vanno le etichette della barra, la pagina Impostazioni e `BackButton` (al posto di "le voci del menu");
  - PR 9: il cambio di lingua va nel **Profilo** (che ha già "Obiettivo e scopo" e "Rifai il test di livello", da rendere per lingua) e nell'intestazione della Home.
- **Ripasso (#35/#38)**: riepilogo con "Inizia ripasso" (`review/summary.ts`); dopo la risposta si vede solo il giudizio (`fsrs.formatInterval` e `GRADES` eliminati, quindi non vanno più nel catalogo). `ReviewCards.tsx` resta il file con più punti legati all'inglese (17). Il resto come già scritto sotto.
- **Profilo (#38)**: grafico a due barre per giorno (`--written` / `--oral`), `profileStats.lastDaysMinutes` restituisce `written`/`oral`; etichette in `profileStats.ts` (catalogo, PR 2). Il grafico resta globale.
- **Porte (#39)**: PWA in sviluppo su 5273, anteprima della build su 4273 (`vite.config.ts`, `strictPort`). Le prove nel browser integrato usano queste.
- **`RepeatSentence`**: "Ho sentito: <span lang="en">" (PR 2 per il testo, PR 9 per `lang`).
- File con testi italiani nell'interfaccia: circa 30 componenti (stima con `git grep`), quindi la PR 2 va divisa come previsto.

## Cosa è cambiato prima (PR #32–#35 e regole nuove)
- **Ripasso con voto dato dall'app (#35)**:
  - `features/review/grading.ts`: `normalizeItalian` toglie gli articoli **italiani** (`ARTICLES`) e gli accenti. Dipende dalla lingua madre, quindi con il multilingua servono articoli per lingua madre, o almeno vanno legati a `native_language`;
  - prompt `review-check.v1` ("Italian learner of English", traduzione in italiano): va parametrizzato nella PR 4 come `review-check.v2`;
  - `ReviewCards.tsx`: `lang` e testi da controllare con gli altri `lang="en"`.
- **Carte di pronuncia (#35)**: categoria `pronunciation` in `mistakes` (migration `20261125100000`), salvate da `transcribe` con `save_mistakes` (`_shared/pronunciation-cards.ts`). Nella PR 3 prendono la `language` come gli altri errori.
- **Audio della lezione preparato in anticipo (#33)**: `prefetchSpeech` in `LessonPage.tsx` usa `listening.text_en` e le frasi del dettato. I nomi dei campi cambiano nella PR 4, e `speak` deve ricevere la lingua.
- **Intestazione della lezione fissa e attesa animata (#32, #34)**: `useDock.ts` e `Waiting` hanno testi italiani da mettere nel catalogo i18n (PR 2).
- **Regole decise il 2026-11-24** (in `CLAUDE.md`, da fare prima di questo piano, vedi `PLAN.md`):
  - lezione finita solo con scritto e orale, selettore Scritto | Orale, freccia indietro;
  - obiettivo raggiunto solo con almeno metà scritto e metà orale;
  - barra in basso Home | Percorso | Profilo | Impostazioni al posto del menu laterale.
  - Effetti su questo piano:
    - nella PR 9 il cambio di lingua va nel **Profilo** e nell'intestazione della Home, non più in `AppMenu.tsx`, che sarà stato tolto;
    - `lesson_progress` avrà `written_done_at`/`oral_done_at`, che valgono per lingua tramite la lezione.

## Cosa è cambiato rispetto alla prima stesura (PR #21–#30)
Queste novità sono già su `main` e cambiano il piano:

- **Voce Gemini con cache (#24)**:
  - function `speak` (`_shared/ai/tts.ts`, voce `AI_TTS_VOICE`, predefinita Kore), tabella `tts_cache` e bucket privato `tts`;
  - la chiave della cache è `sha256(voce + testo)` e non contiene la lingua: parole scritte uguali in lingue diverse (ad esempio "die" in tedesco e in inglese) finirebbero sullo stesso audio. Va aggiunta la lingua alla chiave e alla richiesta di `speak`;
  - `speechSynthesis` resta solo come ripiego (`lib/audio.ts`, ancora fisso su `en-GB`/`en-US`).
- **Pronuncia (#23, #29)**:
  - `transcribe` con `assess` ed `expected_text`;
  - prompt `pronunciation.v1/v2`: "Italian learner speaking English", con consigli su suoni inglesi (th, h, -ed);
  - componenti `PronunciationNote` e `RepeatSentence`;
  - va parametrizzato per coppia di lingue come gli altri prompt.
- **Dettato (#28)**:
  - `features/lesson/dictation.ts` ha `DictationSentence { en, it }`;
  - **`normalizeWords` tiene solo `[a-z0-9']`**: cancellerebbe lettere accentate, ñ, ü, ß e ç, rompendo il dettato in FR/ES/DE. Va riscritto con classi Unicode (`\p{L}\p{N}`) e normalizzazione NFC, gestendo anche `¿ ¡ « »` e l'apostrofo francese (l'homme, j'ai). Servono test per ogni lingua.
- **Traduzioni dopo le risposte (#22)**:
  - `SentenceFeedback` con `feedback?: { en, it }` nel quiz (`lesson/types.ts`, `quiz.ts`);
  - `chapter-test.v2` genera `sentence_en` e `translation_it`;
  - le verbali del quiz si montano come `base, past, past_participle`, una forma solo inglese.
- **Statistiche (#22)**:
  - tabella `lesson_stats` e RPC `record_lesson_stats`;
  - la lingua si ricava da `chapter_id`, quindi non serve una colonna nuova; le query del profilo però vanno filtrate per lingua (join con `chapters`).
- **Pagina Profilo (#30)**:
  - **esiste già** (`features/profile/ProfilePage.tsx`, `api.ts`, `profileStats.ts`): livello, scopo, serie, tempo di studio, grafico a 14 giorni, risposte, carte nel ripasso, avanzamento per livello;
  - la PR 9 la **estende** con una scheda per lingua, invece di crearla.
  - `study_days` e la serie restano globali, perché l'obiettivo giornaliero è unico. Il resto diventa per lingua.
- **Debito chiuso (#27)**:
  - hook `useVoiceRecorder`;
  - `elapsed_days` tolto.
  - `PLAN.md` rimanda la soluzione del "lezioni generate due volte" al lock della PR 5 di questo piano.
- **Altri `lang="en"` fissi** in `PronunciationNote`, `DictationExercise`, `SentenceFeedback`, `RepeatSentence` e `SpokenAnswer`, oltre a quelli già noti.

## Context
L'app nasce come "English Tutor" per un italiano che impara l'inglese, e questa coppia è scritta ovunque:
- nome dell'app;
- schema: `vocab_items.en/it`, `*_it`, un solo `profiles.level`;
- curriculum: `grammar_focus` di grammatica inglese nella migration `20261122155245`;
- test di livello fisso in inglese (`_shared/placement/questions.ts`);
- tutti i prompt: tutor-chat, lesson, chapter-test, placement-oral, transcribe, pronunciation;
- voce: TTS e ripiego `en-*`;
- dettato solo ASCII;
- circa 40 file con testi italiani nel codice e nessun i18n.

Obiettivi:
- nome **Kern Sprache**;
- lingue da studiare EN/FR/ES/DE, partendo dall'italiano come lingua madre e d'interfaccia; la lingua madre entra nella didattica, quindi nei prompt e nella chiave della cache;
- più lingue per utente, ognuna con il suo scopo, livello e progressi, e un cambio di lingua attiva;
- un riepilogo per lingua nel profilo;
- tutto ciò che genera l'IA salvato e riusato.

Decisioni prese:
- curriculum di FR/ES/DE generato una volta e messo in una migration;
- scopo per lingua;
- contenuti delle lezioni in una cache **condivisa** tra utenti;
- si salvano anche i messaggi della chat, le trascrizioni, le risposte orali delle verifiche e gli esiti della pronuncia.

## Regole di modello
- Enum `language_code` = `it|en|fr|es|de`. `profiles.native_language` (default `it`). Lingua studiata ≠ lingua madre.
- Lingua dell'interfaccia = lingua madre. I campi `*_it` e `*_en` diventano neutri: `*_native` / `*_target`, oppure nomi senza suffisso.
- I nomi delle lingue ai prompt li passa il backend (es. "Italian", "German"). Le regole didattiche specifiche per coppia, come gli errori tipici e i suoni difficili, le scrive l'IA a partire dalla coppia.

## PR in ordine (branch brevi da `main`)

1. ✅ **`chore(web): rename the app to Kern Sprache`** (fatta, #31):
   - `vite.config.ts` (manifest e descrizione "Il tuo tutor personale di inglese"), `index.html` (title e `apple-mobile-web-app-title`), `src/sw/sw.ts`, `HomePage.tsx`, `SideMenu.tsx`, `LoginPage.tsx`, `InstallDialog.tsx`, `lib/install.ts`, root `package.json`, `CLAUDE.md` (titolo e descrizione: "app per imparare le lingue"), `PLAN.md`;
   - `supabase/config.toml` `project_id`: se si cambia, cambiano anche i nomi dei container Docker locali (`supabase_db_english-tutor`, citato in `PLAN.md`) e il database locale riparte vuoto. Lo si cambia e si aggiornano le note;
   - **Nuova icona** (famiglia aiTool "Kern"), variante **A · Cobalto + limone** scelta dall'utente:
     - la K è presa da `../aiTool/public/icon.svg` (stessi 5 tracciati), ricolorata in cobalto (`#0B1660` → `#1A34A8` → `#2446D8` → `#8EA2FF`), scalata a 0.8 con `translate(40,40)`, su sfondo `#F3F5FB`;
     - in basso a destra c'è un badge a fumetto limone `#FFD84D` con contorno del colore di sfondo e una "S" `#101A33` dentro;
     - **la S va abbassata di poco** rispetto all'anteprima, così sta al centro del fumetto: la si centra sul centro ottico del cerchio, non sulla linea di base del testo;
     - la S è un tracciato, non testo, così l'icona non dipende dai font.
   - Il sorgente unico è `apps/web/public/favicon.svg`. Le PNG (`pwa-192x192`, `pwa-512x512`, `maskable-512x512` con margine di sicurezza, `apple-touch-icon` 180) si generano con `@vite-pwa/assets-generator`, da aggiungere come devDependency con `pwa-assets.config.ts` e lo script `pnpm --filter web icons`.
   - Si controlla l'icona a vista: favicon nel browser, icona maskable con ritaglio circolare, home iOS.
   - `theme_color` resta `#2446d8`.

2. **`feat(web): add i18n with Italian strings`**:
   - `i18next` + `react-i18next`, `src/i18n/index.ts`, `src/i18n/locales/it/*.json` (un namespace per feature);
   - tipi delle chiavi con TypeScript strict (dichiarazione `CustomTypeOptions`);
   - `lang` di `<html>` dinamico.
   - Le stringhe si spostano feature per feature, su più PR piccole se serve:
     - auth + onboarding;
     - home + path + menu + profile;
     - lesson, dettato compreso;
     - dialogue + review + pronuncia;
     - test.
   - Vanno nel catalogo anche:
     - `purposes.ts` e il giudizio dopo la risposta nel ripasso (`fsrs.formatInterval` e `GRADES` non esistono più);
     - le etichette di `profileStats.ts` e del grafico;
     - le etichette della barra in basso (`TabBar`), la pagina Impostazioni (effetti sonori compresi), `BackButton`, `PART_LABEL` e i messaggi sul microfono della lezione.
   - Messaggi di errore delle functions: restituire un `code` stabile oltre al testo, così il client li traduce.

3. **`feat(db): track languages per learner`** (migration + pgTAP + `db:types`):
   - enum `language_code`; `profiles.native_language`, `profiles.active_language`;
   - tabella `learner_languages` (user_id, language, level, purpose, goal, onboarded_at, placement_done_at, created_at; PK `(user_id, language)`; RLS propria);
   - colonna `language` su:
     - `chapters`, con UNIQUE `(language, level, sort_order)` e slug unico per lingua;
     - `sessions`, `mistakes`, `vocab_items`, `placement_results`, `chapter_test_attempts`;
   - `lesson_stats` e `lesson_progress` la ricavano dal capitolo o dalla lezione, quindi non serve una colonna;
   - `vocab_items.en/it` → `term/translation`, indice unico `(user_id, language, lower(term))`;
   - `mistakes.explanation_it` → `explanation`; `chapters.description_it` → `description`;
   - `tts_cache`: colonna `language` e chiave `sha256(lingua + voce + testo)`. Le righe esistenti restano valide se si ricalcola la chiave con `en`, oppure si svuota la cache: costa poco rigenerare;
   - **backfill**: dati esistenti → `en`; righe di `learner_languages` dai campi attuali di `profiles`;
   - `profiles.level/purpose/goal` restano finché il codice non li usa più e si tolgono nella PR 10;
   - aggiornare `handle_new_user` e i test `rls`, `curriculum`, `chapter_tests`, `approval`, `lesson_stats`, `tts_cache`.

4. **`feat(functions): parametrize prompts by language pair`**:
   - nuove versioni dei prompt in `_shared/prompts/`: `tutor-chat.v3`, `lesson.v2`, `chapter-test.v3`, `placement-oral.v2`, `transcribe.v2`, `pronunciation.v3`;
     - `{native}`/`{target}` vanno nella parte fissa, così il caching implicito di Gemini resta per coppia;
     - i consigli di pronuncia valgono per i suoni della lingua studiata, spiegati a chi parla la lingua madre;
   - schemi zod con campi neutri:
     - `term/translation`, `example`, `text`, `explanation`;
     - `sentence/translation` al posto di `sentence_en/translation_it`;
     - `tip`/`feedback` al posto di `tip_it`/`feedback_it`;
   - verbi generici `{ forms: string[], translation }` al posto di base/past/participle. Il quiz (`quiz.ts`) unisce le forme invece di montare `base, past, past_participle`;
   - `learner-context.ts`, `tutor-reply.ts`, `lesson/index.ts` (`wordsTaughtInChapter`) e `chapter-test/index.ts` leggono la lingua attiva da `learner_languages`;
   - `transcribe` e `speak` ricevono `language`;
   - aggiornare i test Deno `*_test.ts` (`transcribe_test`, `pronunciation_test`, `speak_test`, `chapter-test_test`, …) e i tipi duplicati nella PWA (`dialogue/types.ts`, `lesson/types.ts`, `placement/api.ts`).

5. **`feat(db): share lesson content cache`**:
   - tabella `lesson_content_cache` (lesson_id, native_language, purpose, prompt_version, content, created_at; PK sui primi quattro), senza accesso per gli utenti; la legge e la scrive la function `lesson` con la service role;
   - il prompt della lezione non deve contenere dati del singolo utente: va verificato in `lesson/index.ts`;
   - lock sulla generazione (insert `on conflict do nothing` di una riga "in corso", oppure advisory lock). Risolve anche il debito "lezioni generate due volte durante la preparazione anticipata" citato in `PLAN.md`;
   - opzionale, ripreso da `PLAN.md`: appena si genera una lezione si preparano in anticipo gli audio delle sue frasi con `speak`, per togliere i 3-4 secondi della prima riproduzione. Con la cache condivisa si fa una volta sola per tutti;
   - `lesson_contents` resta per un rilascio e poi si elimina.

6. **`feat(db): save tutor messages, transcripts and pronunciation`**:
   - tabella `session_messages` (id, user_id, session_id, role user|tutor, content, input voice|text, transcript, created_at; RLS propria), scritta da `tutor-chat`;
   - esiti della pronuncia salvati, come chiede la fase 5 in `PLAN.md`: tabella `pronunciation_results` (user_id, language, source dialogue|repeat|test, expected_text, transcript, score, words, created_at; RLS select propri), scritta da `transcribe` quando c'è `assess`;
   - punteggi del dettato accanto a `lesson_stats`, per esempio con colonne `dictation_*` o una tabella propria, così il profilo li mostra;
   - `chapter_test_attempts.oral_transcripts jsonb`.

7. **`feat(functions): placement test per language`**:
   - `_shared/placement/questions/{en,fr,es,de}.ts`, 16 domande ciascuno, 4 per livello. FR/ES/DE si generano una volta con l'IA e si rivedono;
   - `ORAL_PROMPTS` con testo nella lingua madre;
   - `placement-test` sceglie in base alla lingua attiva; `placement_results.language`.

8. **`feat(db): add French, Spanish and German curricula`**: una migration per lingua (24 capitoli × 4 lezioni, `grammar_focus`/`focus` in inglese come oggi, titoli in italiano), generate offline e riviste. Il test `curriculum` controlla 96 lezioni per lingua.

9. **`feat(web): choose and switch learning language`**:
   - onboarding: lingua da studiare → scopo → test di livello; `active_language` sul profilo;
   - **la pagina Profilo che esiste già** (`features/profile`) diventa:
     - in alto la parte globale: serie, tempo di studio, grafico;
     - sotto una scheda per ogni lingua: livello, scopo, avanzamento per livello, risposte da `lesson_stats` filtrate per lingua, carte nel ripasso, esiti di pronuncia e dettato;
     - si può aggiungere una lingua e cambiare quella attiva. `fetchProfileData` e `profileStats.ts` diventano per lingua;
   - cambio rapido della lingua dall'intestazione della Home (il menu laterale sarà stato tolto dalla barra in basso);
   - le query TanStack Query includono la lingua nella `queryKey`;
   - `audio.ts`:
     - `speak(text, lang)` passa la lingua alla function `speak`;
     - il ripiego `speechSynthesis` sceglie la voce per lingua (`en-GB`, `fr-FR`, `es-ES`, `de-DE`, poi la prima che inizia con il codice);
   - **dettato multilingua**: `normalizeWords` con `\p{L}\p{N}` e NFC, `DictationSentence { text, translation }`, test per FR/ES/DE (accenti, ß, ñ, apostrofo francese, `¿¡`);
   - gli attributi `lang="en"` scritti nel codice diventano la lingua attiva: ReviewCards, sections, DialoguePage, LessonDialogue, ChapterTestPage, PlacementTestPage, PronunciationNote, DictationExercise, SentenceFeedback, RepeatSentence, RepeatExercise, SpokenAnswer;
   - `send-reminders`: il promemoria usa la lingua attiva (testi ancora in italiano).

10. **`chore(db): drop single-language columns`**:
    - togliere `profiles.level/purpose/goal/onboarded_at` e `lesson_contents`;
    - aggiornare `CLAUDE.md` (modello dati, obiettivi, sezione Voce) e `PLAN.md`.

## Rischi da tenere d'occhio
- **Release:**
  - le migration con rename e backfill toccano dati di produzione: prima della PR 3 serve un dump (`supabase db dump`, su richiesta);
  - le functions vanno deployate insieme alla migration che rinomina i campi, perché il codice vecchio si romperebbe: sono 8 functions, compresa `speak`;
  - le verifiche e i contenuti già salvati con campi `*_en/*_it` vanno letti in modo compatibile, oppure rigenerati.
- **Qualità:** il curriculum e il test di livello di FR/ES/DE si generano una volta, ma la revisione umana è il collo di bottiglia.
- **Voce:**
  - la voce Gemini (Kore) parla anche FR/ES/DE, ma l'accento va provato;
  - si può scegliere una voce per lingua (`AI_TTS_VOICE_<LANG>` facoltative);
  - il ripiego `speechSynthesis` su iOS è variabile.
- **Costi:** la cache condivisa delle lezioni e degli audio li riduce. La chat resta personale e non si mette in cache.

## Verifica
- Per ogni PR: `pnpm lint && pnpm test && pnpm build`. Se cambiano le functions: `pnpm fn:check && pnpm fn:lint && pnpm fn:test`. Se cambia lo schema: `pnpm test:db && pnpm db:types`.
- Prova completa in locale (`pnpm db:reset`, `pnpm fn:serve`, `pnpm dev`, browser integrato):
  - un utente esistente (dati di seed in inglese) ritrova tutto sotto "Inglese", profilo compreso;
  - aggiunge il tedesco: onboarding → test di livello tedesco → percorso tedesco → una lezione generata, con dettato su una frase con ü o ß e "Ripeti la frase" valutata in tedesco;
  - la stessa lezione con un secondo utente con lo stesso scopo arriva dalla cache: nessuna riga nuova in `ai_usage`, né per la lezione né per gli audio;
  - dialogo vocale con la trascrizione in tedesco salvata in `session_messages` e l'esito in `pronunciation_results`;
  - il ripasso mostra solo le carte della lingua attiva;
  - il profilo mostra la parte globale, due schede di lingua e il cambio di lingua.
