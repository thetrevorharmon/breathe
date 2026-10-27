# Breathe: implementation plan

Source of truth: [`docs/handoff/SPEC.md`](handoff/SPEC.md) and the prototypes in [`docs/handoff/prototype/`](handoff/prototype/).
This file is the work breakdown. Each workstream is sized for one agent. The spec wins on details; this plan wins on structure and decisions.

---

## 1. Tech decisions

| Area | Choice | Why |
|---|---|---|
| Build | Vite + React 19 + TypeScript (strict) | Per spec |
| Styling | **Tailwind CSS v4**, theme tokens as CSS variables | The design is fully custom (SVG rings, gradient bg, bespoke tiles). A component kit like MUI or Mantine would fight it; Tailwind just maps our tokens. |
| Theming | **Themes are data.** A typed `Theme = { id, name, light: Tokens, dark: Tokens }` registry in `src/theme/themes/`. The active theme's tokens are written as CSS variables on `<html>`, and Tailwind utilities (`bg-breath`, `text-muted`, …) point at those variables | Adding a theme means adding one file and nothing else. Theme (palette) and mode (system/light/dark) are separate settings. Ship Heat; the prototype's Current, Volt and Graphite palettes are ready-made candidates for later |
| Primitives | **Radix UI** (Dialog for the settings sheet, ToggleGroup for theme picker), only where accessibility is hard to hand-roll | Unstyled, so it takes our tokens |
| State | No global store library. Storage module + `useSyncExternalStore` hooks; screen flow in a top-level `useReducer` | App is tiny: 4 screens, 2 persisted records |
| Routing | None. Screen state machine (`home → setup → session → complete`) | No deep links needed. Revisit if Android back button behaviour bothers you. |
| Icons | lucide-react | Flame, check, play, chevrons, ×, gear |
| PWA | vite-plugin-pwa (Workbox, `generateSW`) | Per spec |
| Tests | Vitest for pure logic; Testing Library for a few components; one Playwright smoke test of the full flow | Engine and streak maths are where bugs hide |
| Tooling | npm, ESLint, Prettier | |

## 2. Code layout

```
src/
  app/            App.tsx, flow reducer, PhoneColumn shell, ThemeProvider
  theme/          tokens.css (Heat light/dark + [data-theme] override), Manrope import
  domain/         types.ts (Settings, WorkoutLog), defaults.ts
  storage/        storage.ts (versioned localStorage, swappable), useSettings, useLogs, exportImport.ts
  lib/            dates.ts (local YYYY-MM-DD, offsets), format.ts (m:ss), streak.ts, calendar.ts
  session/        timeline.ts, frame.ts (pure port of renderVals), useSessionClock.ts, cues/ (wake lock, audio, vibration)
  components/     Stepper, DialTile, PrimaryButton, IconButton, CalendarGrid, StreakBand, Ring/*
  screens/        Home, Setup, Session, Complete, SettingsSheet
```

Two rules for every agent:
- **Logic is pure and tested; components are thin.** `frame.ts` takes `(config, t)` and returns everything the ring needs. `streak.ts` and `calendar.ts` take `(logs, today)`. No `Date.now()` inside them.
- **Colours only come from tokens.** No hex in components.

## 3. Workstreams

```
        ┌─▶ A. Session engine + ring ──▶ F. Session extras (cues) ─┐
0. Base ┼─▶ B. Setup + Complete ─────────────────────────────────── ┼─▶ G. Integration + acceptance
        ├─▶ C. Home + streak/calendar ──(week strip into Complete)─ ┤
        ├─▶ D. Settings sheet + export/import ───────────────────── ┤
        └─▶ E. PWA ─────────────────────────────────────────────────┘
```

**0 must land first.** A–E can then run in parallel (separate worktrees/branches). F waits on A and on your answers below. G is last.

### 0. Foundation (one agent, blocking)
- Scaffold Vite/React/TS, ESLint, Prettier, Vitest, Tailwind v4.
- Theme system:
  - Define a `Tokens` type covering every token in spec §5, including the derived alphas such as the ring tracks, ticks and glow, so components never compute colours themselves.
  - `themes/heat.ts` holds the light and dark values.
  - A `ThemeProvider` resolves theme + mode (following `prefers-color-scheme` when the mode is "system") and writes the CSS variables.
  - The Tailwind `@theme` block maps the utilities to those variables.
  - Add a test that checks every registered theme defines every token.
- Manrope 400–800 and a global `tabular-nums` utility.
- App shell: gradient background, centred phone column (390 design width, works from 360).
- `domain/types.ts` + defaults as in spec §4, with two changes to Settings:
  - Split `theme` into `themeId` (default `'heat'`) and `colorMode: 'system' | 'light' | 'dark'`.
  - Add the cue settings. `storage.ts` with a schema version key, safe JSON parse, and defaults on failure.
- `lib/dates.ts` (local-date keys, zero-padded `YYYY-MM-DD`; the prototype's unpadded key is a bug not to copy), `lib/format.ts`.
- Shared components: `Stepper` (− value +, min/max/step, disabled at bounds at 35% opacity), `DialTile`, `PrimaryButton` (60 px pill), `IconButton` (≥44 px target).
- Flow reducer with placeholder screens so others can drop in.
- **Done when:** `npm run dev` shows the shell in both themes, `npm test` passes, and the shared components render in a scratch page.

### A. Session engine + ring screen (largest piece)
- `timeline.ts`: segments `lead(3) → set → rest → … → set`, total. Unit tests: defaults give 333 s (5:33) and C = 7.0 s.
- `frame.ts`: port `renderVals()` from `session-screen.dc.html` (outer arcs, ticks, indicator angle, inner sweep/countdown, phase dots, scale, labels, status lines, countdown number). Test key moments: phase boundaries, set/rest crossovers, the done state, sets = 1, holds = 0.
- `useSessionClock`: rAF loop, dt clamped to 0.1 s, pause, resume, skip (countdowns only), restart (both × and Restart go through a confirm dialog), and the background behaviour in section 4. Unit-test the background rules with a fake clock: hidden while breathing, hidden mid-rest and back early, and hidden past the end of rest. Exposes `t`, `paused` and `elapsedActive` (for logging duration).
- Ring components in SVG at 330×330, Session screen layout (spec §2.3), Continue button at the end that hands off a `SessionResult` (config used, startedAt, duration).
- **Done when:** checklist items 2–6 pass by eye at 1× and by test.

### B. Setup + Complete screens
- Setup: dials, workout rows with hints, fixed footer with live total and Start. Reads/writes Settings, so values persist as defaults.
- Complete: badge and summary, effort grid with zones and legend, "dials you finished on" using the same `DialTile` with the changed-state border and "was N", Save button (disabled until an effort is picked).
- Save: append a `WorkoutLog`, write end dials back to Settings, go Home.
- Week strip: leave a slot; drop in C's `CalendarGrid` row once it lands.
- **Done when:** checklist items 7 and 8 pass.

### C. Home + streak/calendar
- `streak.ts` (current, best, "streak after today") and `calendar.ts` (month grid, Sunday start, band left/right flags, cell states). Tests across month and year boundaries, DST change days and several logs on one day.
- `CalendarGrid` (month and single-week modes, bands behind circles, today ring, done+today ring).
- Home: header, Start card vs "Done for today" card, streak row, month calendar with ‹ › (no future months), footer count. Gear icon slot for D.
- **Done when:** checklist item 9 passes with seeded test data.

### D. Settings sheet + export/import
- Radix Dialog bottom sheet from Home: mode (System/Light/Dark), plus a theme picker that only appears once more than one theme is registered, and the "Ring breathes" toggle.
- Export downloads `breathe-logs-YYYY-MM-DD.json` (logs + settings + schema version). Import validates the shape, then merges logs by `id`, skipping duplicates.
- **Done when:** export, clear storage, import restores the logs, and importing the same file twice adds nothing.

### E. PWA
- Manifest (name, `standalone`, theme colours per mode, icons 192/512/maskable plus an apple-touch-icon), service worker precaching the app shell and font. Self-host Manrope (e.g. `@fontsource/manrope`) so it works offline instead of relying on the Google Fonts CDN.
- iOS meta tags (`apple-mobile-web-app-capable`, status bar style).
- **Done when:** Lighthouse marks it installable and the app loads offline in airplane mode.

### F. Session extras (after A)
- Wake Lock as described in section 4.
- `useCues` subscribes to events from the clock: phase changes (spoken), set → rest (one beep), and the 3/2/1 seconds before each set (countdown beeps). Events must fire exactly once each, including after Skip, Restart or returning from the background.
- Mute toggle in the session header.
- **Done when:** a full default session on an iPhone PWA plays every cue at the right moment with the screen staying on.

### G. Integration + acceptance
- Wire everything end to end, run the Playwright smoke test, test on a real iPhone as an installed PWA, and report against the spec §7 checklist.

## 4. Decisions

These override the spec where they differ.

- **Wake lock:** on for the whole session. Re-acquire it when the page becomes visible again, and release it on exit or finish.
- **Spoken cues:** recordings of Trevor saying "Inhale", "Hold", "Exhale", "Hold" (one clip per phase, in `src/session/cues/sounds/`), played through Web Audio at each phase change. They replaced `speechSynthesis`.
- **Tone cues** (Web Audio):
  - one beep at the transition from a set into rest
  - countdown beeps at 3, 2 and 1 seconds before every set starts, including the 3 s lead-in before set 1
- **Cue controls:** one mute toggle in the session header silences both. Unlock audio on the Setup "Start" tap, since iOS needs a user gesture.
- **Sharing audio with music** (setting "When music is playing", iOS Audio Session API, Safari only):
  - **Lower** (default): `transient`. Cues play over music and lower it while each cue plays.
  - **Mix:** `ambient`. Cues play over music at full volume, but the silent switch mutes them.
  - **Pause:** `playback`. Cues always play, and other audio stops during the workout.

  The goal is cues that play without switching the phone off silent. This still needs checking on a real iPhone.
- **No vibration.**
- **Background behaviour** (replaces spec §3.1's "pause when hidden"):
  - **Hidden while breathing (or in the lead-in):** pause immediately.
  - **Hidden during rest:** keep the rest running on wall-clock time. rAF stops in the background, so on return compute the hidden duration from `performance.now()` instead of using the 0.1 s clamp.
  - **Rest runs out while hidden:** never auto-start a set. Hold the clock at **3 s before the set starts**, paused. On return you see "REST 3" with Resume, and resuming plays the 3‑2‑1 countdown into the set.
  - **Back before the rest is over:** it just keeps counting.
  - The 0.1 s per-frame clamp still applies while the page is visible.
- **Restart and × both ask for confirmation** before acting. × logs nothing.
- **Effort is required:** Save stays disabled until a rating of 1–10 is picked. `WorkoutLog.effort` becomes `number`, not `number | null`.
- **Import merges by `id`** and skips duplicates. Settings in the file are ignored on import, or offered as a separate "also restore settings" option.
- **Logged duration:** actual active time (pauses excluded, skips shorten it). The Complete summary shows the same number.
- **Contrast:** use the spec colours exactly as given. Drop the 4.5:1 checklist item.
- **Theming:** multiple themes are supported from day one, as described in section 1.
- **Hosting:** GitHub Pages, deployed by a GitHub Action on push to `main`. Set Vite `base` and the PWA `scope`/`start_url` to `/breathe/`.
- **Visuals:** the screenshots in [`docs/handoff/screens/`](handoff/screens/README.md) show every screen in dark and light at 390×844. Agents building a screen should compare it against these.

## 5. Open questions

None right now. Agents should add new questions here rather than guess.

- (T1) jsdom is pinned to v26 (v30 crashes under Node 20.19.5 via undici). `npm install` under Node 20's bundled npm 10 failed with an arborist error; npm 11 (`npx npm@11 install`) worked.
- (T1) Dev gallery of shared components: `?screen=gallery`.
