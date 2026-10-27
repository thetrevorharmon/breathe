# Acceptance (T9)

Status: **Pass** = verified by an automated test or by inspecting screenshots; **Needs device** = only verifiable on a real phone; **Dropped** = removed by decision.
E2E = `npm run test:e2e` (`e2e/flow.spec.ts`, Playwright on `vite preview`, 390x844). Screenshots were reviewed against `docs/handoff/screens/`.

## SPEC §7

| # | Item | Status | How checked |
|---|------|--------|-------------|
| 1 | Home → Setup → Session → Complete → Home; today filled afterwards | Pass | E2E "full flow" (real time, no `t` param; checks Done for today, streak 1, today's calendar cell labelled "workout done, today") |
| 2 | Default total 5:33, cycle 7.0 s | Pass | Unit tests "defaults: 333 s total and C = 7.0 s"; E2E asserts Setup shows 5:33 on a clean profile |
| 3 | Inner ring clockwise sweep and countdown, rest colour, breath scale switchable | Pass | `session.test.ts` (sweep, `ringBreathes` off); session screenshots (rest ring uses blue, fills clockwise) |
| 4 | Outer ring arcs, rep ticks, indicator crossing gaps in rest | Pass | `session.test.ts` (arc geometry, lead-in/rest crossover); screenshots `session-session-rest-*`. Note: spec says "three arcs" for the default 3 sets; N arcs for N sets (sets = 1 gives one arc), per T2 brief |
| 5 | "Set X of N" visible, no horizontal progress bar | Pass | Screenshots; E2E asserts "Set 1 of 1" / "Set 1 of 3" |
| 6 | Pause, Resume, Skip (countdowns only), Restart, × | Pass | `session.test.ts` (pause/resume/skip/restart); E2E "x on the session confirms…" (cancel keeps session, confirm returns Home, nothing logged). Restart dialog: manual reasoning from `SessionScreen.tsx` (shared `ask`/`accept`), no e2e |
| 7 | Complete uses the same dial tiles, changed dials show "was N" | Pass | `Complete.test.tsx`; E2E increases exhale dial and sees "was N" |
| 8 | Saved dials become next Setup defaults | Pass | E2E reloads, taps Again and sees the changed exhale dial; `Complete.test.tsx` |
| 9 | Streak, best, bands correct across month boundaries; local dates | Pass | `streak.test.ts` (month/year/leap/DST), `calendar.test.ts`, `dates.test.ts` |
| 10 | Light, dark and system themes work | Pass | E2E mode toggle persists across reload (`data-mode=dark`); screenshots in both modes; `ThemeProvider` tests for system |
| 11 | Text contrast ≥ 4.5:1 | Dropped by decision | PLAN §4 ("use the spec colours exactly") |
| 12 | Installable as PWA and works offline | Pass (offline, manifest) / Needs device (install) | E2E "works offline"; `npm run test:offline` (manifest fields, SW controls page, offline reload renders Home). Add to Home Screen on iOS/Android needs a device |

## PLAN §4 decisions

| Decision | Status | How checked |
|----------|--------|-------------|
| Wake lock: on for the session, re-acquired on visible, released on exit/done | Pass (logic) / Needs device | `useWakeLock` unit tests with a fake `navigator.wakeLock`; real screen-stay-awake needs a device |
| Spoken cues Inhale/Hold/Exhale/Hold | Pass (logic) / Needs device | `cues.test.tsx` (each cue exactly once, incl. skip/restart/pause/background); audible output and voice need a device |
| Tone cues: one beep at set → rest; 3-2-1 before every set incl. lead-in | Pass (logic) / Needs device | `cues.test.tsx`, `session.test.ts` events; sound needs a device |
| One mute toggle silences both; unlock audio on Setup Start | Pass (logic) / Needs device | `cues.test.tsx` "mute silences everything"; `Setup.test.tsx` "Start unlocks audio"; mute button in header screenshots. iOS autoplay unlock needs a device |
| No vibration | Pass | No `navigator.vibrate` anywhere in `src` |
| Background: hidden while breathing/lead-in pauses | Pass (logic) / Needs device | `session.test.ts` background tests with a fake clock; real lock-screen/tab-switch behaviour needs a device |
| Hidden during rest keeps counting on wall-clock time; back early keeps counting | Pass (logic) / Needs device | `session.test.ts` |
| Rest elapses while hidden: hold at 3 s before set, paused; resume plays 3-2-1 | Pass (logic) / Needs device | `session.test.ts` (incl. exact-boundary case), `cues.test.tsx` "background hold resume replays ticks" |
| Restart and × ask for confirmation; × logs nothing | Pass | E2E (×); `ConfirmDialog` used for both in `SessionScreen.tsx` |
| Effort required; `effort: number` | Pass | E2E (Save disabled until Effort 7); `Complete.test.tsx` |
| Import merges by id, skips duplicates, settings ignored | Pass | `exportImport` tests; E2E export → clear → import, second import adds 0, invalid file shows an alert |
| Logged duration = active time, same number on Complete | Pass | `session.test.ts` (active time excludes pauses, skips); Complete summary uses `durationSec`. Not asserted in E2E |
| Hosting `/breathe/`, PWA scope, deploy workflow | Pass (build) / Needs repo setting | Offline test checks manifest `start_url`/`scope`; the workflow runs only after push and Pages must be enabled (Settings → Pages → GitHub Actions) |

## Integration gaps found
None. All five E2E tests passed against the combined build with no code changes.

## Visual comparison with `docs/handoff/screens/`
- Session header has a mute/unmute speaker icon (T7; not in the reference images). Intentional.
- Light-mode rest screenshot at `t=120` shows a different moment from the reference (13 vs 49 s remaining, and a Play button because it is frozen with `paused=1`); ring geometry, colours and layout match.
- Home, Setup, Complete and Settings sheet match the references in layout, spacing and colour in both modes. No differences needing a fix were seen.
- Home "Done for today" and the settings sheet have no reference image, so were checked only for internal consistency.
