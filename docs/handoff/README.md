# Breather handoff

- `SPEC.md`: the full build spec, covering screens, the session engine, ring geometry, data model, theme tokens and an acceptance checklist.
- `prototype/`: the working design prototypes, used as a logic and visual reference. They won't run as they are; see the end of SPEC.md.

## Kickoff prompt for Claude Code

Put this folder in a new, empty repo as `docs/handoff/`, then paste:

> Read `docs/handoff/SPEC.md` and the two prototype files in `docs/handoff/prototype/`. Build the app it describes: Vite + React + TypeScript, client-side only, localStorage, installable PWA, light/dark with the Heat tokens.
>
> Work in this order:
> 1. Scaffold the app and theme tokens.
> 2. Build the session engine and ring screen, matching section 3 exactly. Port the maths from `session-screen.dc.html`.
> 3. Build Setup.
> 4. Build Complete.
> 5. Build Home with the streak calendar.
> 6. Add persistence and JSON export/import.
> 7. Set up the PWA.
>
> Before starting, ask me about anything in section 6 ("Not in the prototype"). When you're done, go through the acceptance checklist in section 7 and tell me which items pass.
