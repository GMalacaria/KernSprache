## Cosa
<!-- Cosa cambia, in una o due frasi. -->

## Perché
<!-- Il motivo o il passo della roadmap a cui si riferisce. -->

## Come è stato testato
<!-- Comandi lanciati, prove manuali (es. login, notifiche su iPhone). -->

## Checklist
- [ ] Titolo della PR in formato Conventional Commits (es. `feat(web): ...`)
- [ ] `pnpm lint` e `pnpm build` passano
- [ ] Se cambia lo schema: nuova migration, `pnpm test:db` passa e `pnpm db:types` rigenerato
- [ ] Nessun segreto nel codice (chiavi solo in `.env` o nei secret di Supabase)
- [ ] Prompt modificati solo sotto `supabase/functions/_shared/prompts`
