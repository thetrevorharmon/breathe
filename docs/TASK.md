# Breathe: tasks

This file breaks [`PLAN.md`](PLAN.md) into high-level tasks. Each task is done by one agent and lands as **one git commit** on `main`.

Where documents disagree, the order of precedence is: `PLAN.md` §4 Decisions, then `handoff/SPEC.md`, then the screenshots in `handoff/screens/`.

## Order

```
T1 ──┬─▶ T2 Session engine ───▶ T7 Cues + wake lock ──┐
     ├─▶ T3 Setup ──────────┐                          │
     ├─▶ T4 Home + calendar ┴─▶ T5 Complete + save ────┼─▶ T9 Integration
     ├─▶ T6 Settings + export/import ──────────────────┤
     └─▶ T8 PWA + deploy ──────────────────────────────┘
```

## Rules for every task

- Read `PLAN.md`, `handoff/SPEC.md` and the screenshots relevant to your screen before starting. The prototype logic lives in `handoff/prototype/*.dc.html`.
- Stay inside your task's scope. If you must touch shared files (the flow reducer, `App.tsx`, tokens), keep the change minimal.
- Before committing:
  - `npm run lint`, `npm test` and `npm run build` must pass.
  - Capture screenshots with `npm run screenshot` (added in T1). Compare them against `handoff/screens/` and fix any visible differences.
- Make exactly **one commit** with the message `T<n>: <title>`. Don't push.
- If the plan doesn't cover something, make the simplest choice and note it in your report, plus a line under "Open questions" in `PLAN.md`.

---

## T1. Foundation

**What:** everything the other tasks build on.
- Scaffold Vite + React + TypeScript (strict), with ESLint, Prettier, Vitest and Testing Library.
- Tailwind v4.
- The theme system: a `Tokens` type, a theme registry with Heat in light and dark, and a `ThemeProvider` that writes CSS variables and resolves `colorMode`. Tailwind utilities map to the variables.
- Manrope, self-hosted with `@fontsource`.
- `domain/types.ts` and `defaults.ts` (`themeId`, `colorMode`, cue settings, `effort: number`).
- The `storage.ts` module, with versioning and `useSettings`/`useLogs` hooks.
- `lib/dates.ts` and `lib/format.ts`.
- Shared components: `Stepper`, `DialTile`, `PrimaryButton`, `IconButton`.
- App shell: gradient background and a centred phone column.
- A flow reducer with placeholder screens for Home, Setup, Session and Complete.
- **Dev affordances:**
  - a URL query, `?screen=home|setup|session|complete&mode=light|dark`, that jumps straight to a screen with that mode
  - `npm run screenshot [screen...]`: a Playwright script that builds, serves on a free port, and saves 390×844 PNGs of each screen in light and dark to `$SCREENSHOT_DIR` (default `./.screenshots`, gitignored)

**Acceptance criteria**
- `npm run dev` shows the shell with the Heat gradient in both modes, following the system setting and overridable by `?mode=`.
- A test checks that every registered theme defines every token.
- Storage round-trips Settings and logs, and falls back to defaults on corrupt JSON.
- `dates.ts` produces local, zero-padded `YYYY-MM-DD` keys, tested around a DST change.
- `npm run screenshot` writes 8 PNGs.

**Validate:** lint, test, build, then `npm run screenshot` and look at the images.

## T2. Session engine and Session screen

**What:**
- `session/timeline.ts`, `session/frame.ts` (a pure port of `renderVals()` from `session-screen.dc.html`) and `useSessionClock`, including the background behaviour in PLAN §4.
- Ring components and the full Session screen layout.
- Pause, Resume, Skip and Restart. Restart and × both go through a confirm dialog.
- Continue at the end produces a `SessionResult` (config, `startedAt`, active duration) and moves the flow to Complete.

**Acceptance criteria**
- Unit tests:
  - Defaults give a total of 333 s and C = 7.0 s.
  - Phase boundaries, set/rest crossovers, the done state, sets = 1 and holds = 0 all behave correctly.
  - Background rules, using a fake clock: hidden while breathing pauses; hidden mid-rest keeps counting; a rest that elapses while hidden holds at 3 s before the set, paused.
- The ring matches `handoff/screens/*-03-session-*.png`.
  - Outer ring: N arcs with 10° gaps, rep ticks, and an indicator that crosses the gaps during rest.
  - Inner ring: sweeps clockwise; the countdown uses the rest colour; it scales between 0.8 and 1.0 when "ring breathes" is on.
- "Set X of N" is always visible, and there's no horizontal progress bar.

**Validate:** tests, plus screenshots of the session at a breathing moment and a rest moment in both modes. Add a dev-only `&t=<seconds>` query param to start the clock at a set time.

## T3. Setup screen

**What:** the Setup screen as in spec §2.2, built from the shared `Stepper` and `DialTile`.
- Live total time in the footer.
- Values persist to Settings and become the next defaults.
- Start moves to Session with the current config, and unlocks audio from that tap for T7. A `unlockAudio()` stub in `session/cues/` is fine.

**Acceptance criteria**
- All ranges and steps match spec §2.2, and buttons are disabled at their bounds.
- Defaults show "Total time 5:33".
- Changed values survive a reload.
- The screen matches `handoff/screens/*-02-setup.png`.

**Validate:** component tests for bounds and the total, plus screenshots.

## T4. Home and streak calendar

**What:**
- `lib/streak.ts`: current streak, best streak, and the streak including today.
- `lib/calendar.ts`: the month grid and band flags.
- A `CalendarGrid` component in month and week modes.
- The Home screen: Start card versus the "Done for today" card, the streak row, month navigation (no future months), the footer count, and a gear icon button that opens a settings slot T6 will fill.

**Acceptance criteria**
- Unit tests cover streaks across month and year boundaries, several logs on one day, and today not yet logged (the streak counts from yesterday).
- Bands only join days in the same week row. Today's ring and the done-and-today ring render correctly.
- The screen matches `handoff/screens/*-01-home.png` when seeded with similar data. Add a dev-only `&seed=demo` param that loads fake logs.

**Validate:** tests, plus screenshots with `seed=demo` and with no logs.

## T5. Complete screen and Save

**Depends on:** T3, T4.

**What:**
- The Complete screen: badge, summary using the active duration, a week strip using `CalendarGrid` in week mode with today shown as done, the effort grid with zones and legend, and end-dial tiles showing "was N".
- Save: disabled until an effort is picked. It appends a `WorkoutLog`, writes the end dials to Settings, and returns Home with today filled in.

**Acceptance criteria**
- Save is disabled with no effort selected.
- A changed dial shows a breath-coloured border and "was N".
- After Save, the log is stored with every field from spec §4, Setup's dial defaults equal the end dials, and Home shows "Done for today".
- The screen matches `handoff/screens/*-04-complete.png`.

**Validate:** a component test of the Save flow against storage, plus screenshots.

## T6. Settings sheet and export/import

**What:**
- A Radix Dialog bottom sheet opened from Home's gear. It contains: mode (System/Light/Dark); a theme picker that is hidden while only one theme exists; the "Ring breathes" toggle; the cues toggle; Export; and Import.
- Export writes `breathe-logs-YYYY-MM-DD.json` containing the schema version, logs and settings.
- Import validates the file and merges logs by `id`.

**Acceptance criteria**
- Changing the mode applies immediately and survives a reload.
- Export → clear storage → Import restores the logs, and importing the same file twice adds nothing.
- An invalid file shows an error and changes nothing.
- The sheet is keyboard accessible and closes on Escape.

**Validate:** unit tests for import validation and merge, plus screenshots of the open sheet in both modes. Add a dev-only `&sheet=settings` param to open it.

## T7. Cues and wake lock

**Depends on:** T2.

**What:**
- `useCues` driven by clock events:
  - spoken "Inhale / Hold / Exhale / Hold" at each phase change
  - one beep when a set ends and rest begins
  - 3‑2‑1 countdown beeps before every set, including after the lead-in
- A mute toggle in the session header, persisted in Settings.
- Wake Lock: acquired on start, re-acquired when the page becomes visible, released on exit or done.

**Acceptance criteria**
- Unit tests with a fake clock check that each cue fires exactly once at the right `t`, including after Skip, Restart, Pause/Resume and resuming from a background hold.
- Mute silences every cue.
- With no Wake Lock or `speechSynthesis` support, everything degrades without errors.

**Validate:** tests, plus a screenshot of the session header with the mute toggle in both states.

## T8. PWA and GitHub Pages deploy

**What:**
- vite-plugin-pwa: manifest, icons (192, 512, maskable, apple-touch) and a service worker precaching the shell and fonts.
- iOS meta tags.
- Vite `base: '/breathe/'`.
- A GitHub Actions workflow that builds and deploys to Pages on push to `main`.

**Acceptance criteria**
- `npm run build && npm run preview` serves under `/breathe/`, the manifest is valid, and the service worker registers.
- With the network offline (Playwright `context.setOffline(true)`), a reload still renders Home.
- The workflow file is valid. It won't run until pushed, so note in your report that Pages needs enabling in the repo settings.

**Validate:** a Playwright check that the app loads offline, plus a screenshot of the offline reload.

## T9. Integration and acceptance

**Depends on:** all the others.

**What:**
- A Playwright end-to-end test of Home → Setup → Session (at accelerated time or via the `t` param) → Complete → Save → Home, with today filled in.
- Fix any integration gaps.
- Go through the spec §7 checklist (minus the contrast item, per PLAN §4) and record pass or fail for each item in `docs/ACCEPTANCE.md`.

**Acceptance criteria**
- The end-to-end test passes.
- `ACCEPTANCE.md` lists every checklist item with its status and how it was checked.
- There is a full screenshot set for every screen in both modes.

**Validate:** `npm run test:e2e` plus the full `npm run screenshot` run.
