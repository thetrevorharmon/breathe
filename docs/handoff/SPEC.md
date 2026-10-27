# Breath Training — build spec

A personal web app that guides breathing sets on a **Breather Pro** (a respiratory muscle trainer with separate inhale and exhale resistance dials). It replaces the vendor's iOS app. There's one user, no accounts and no backend.

Design source: the "Heat — full flow" section of the design canvas (https://claude.ai/artifact/EQZGHdytZEpLPdVyByWg2M).
The two working prototypes are in `prototype/` (see "Using the prototype files" at the bottom).

---

## 1. Stack and platform

- **Vite + React + TypeScript**, client-side only.
- Persist everything in **localStorage** behind a small storage module, so it can be swapped later.
- Mobile-first. Designed at 390×844 and must work from 360 px wide up; on desktop, centre a phone-width column.
- Installable **PWA**: web manifest, icons, `display: standalone`, offline via a service worker (vite-plugin-pwa is fine).
- **Light and dark mode**: follow `prefers-color-scheme` by default, with a manual override (System / Light / Dark) saved in localStorage.
- Font: **Manrope** (Google Fonts, weights 400–800). Use `font-variant-numeric: tabular-nums` everywhere numbers change.
- No Apple Health integration (decided against it).

## 2. Screens and flow

```
Home ──Start workout──▶ Setup ──Start──▶ Session ──Continue──▶ Complete ──Save──▶ Home
  ▲                       │back            │× (end early)
  └───────────────────────┴────────────────┘
```

There are no tabs and no schedule or plan, and no tutorial screen.

### 2.1 Home
- Eyebrow `BREATH TRAINING` (breath colour, 12 px, 800, letter-spacing .16em) above today's date: "Tuesday, Oct 27" (28 px, 800).
- **Start workout card**: a full-width `<button>`, radius 24, filled with the breath colour, text in onBreath.
  - Top row: `STRENGTH PROTOCOL` on the left, "≈ N min" on the right.
  - Bottom row: "Start workout" (30 px, 800) with "3 sets × 10 reps" under it, and a round play badge on the right.
  - **Don't show dial settings on this card.**
  - Opens Setup.
- If a workout is already logged today, the card becomes a **"Done for today"** surface card: check badge, "Done for today", "3 sets × 10 reps", and an "Again" button that opens Setup.
- **Streak**:
  - Flame icon, the current streak number (44 px, 800) and "day streak", with "Best N" on the right.
  - Below it, a **month calendar** card:
    - Month name with ‹ › buttons. You can't go past the current month.
    - S M T W T F S header; weeks start on Sunday.
    - Completed days are filled circles in the breath colour.
    - **Back-to-back completed days in the same week row are joined by a band** in the breath colour at about 20% opacity, behind the circles.
    - Today, if not yet done, gets a 2 px ring in the breath colour. Future days are faint and past missed days are muted.
    - Footer: "N workouts in October".

### 2.2 Setup
- Header: back chevron, then "Workout setup" centred.
- The middle area scrolls; the footer is fixed.
- **SET YOUR DIALS** (breath colour eyebrow), with the hint "Match the dials on your device before you start."
  - Two tiles side by side: "Inhale dial" (range 1–6) and "Exhale dial" (range 1–5).
  - Each tile shows the label, a big value (44 px, 800) and two full-width 44 px − / + buttons.
- **WORKOUT** list. Each row is the label (with an optional hint under it) and − value + controls:
  - Sets 1–6
  - Reps per set 1–30
  - Inhale 0.5–10 s, step 0.5 ("Breathe in hard")
  - Hold 0–10 s, step 0.5 ("At the top")
  - Exhale 0.5–10 s, step 0.5 ("Breathe out hard")
  - Hold 0–10 s, step 0.5 ("At the bottom")
  - Rest between sets 15–180 s, step 15
- Footer: "Total time m:ss", then a full-width **Start** button, 60 px tall, pill shaped, in the breath colour.
- Values persist as the defaults for the next workout.

### 2.3 Session (the core screen; see section 3)
- Header: × (end workout, back to Home without logging), "Strength Protocol", and elapsed / total time on the right ("1:12 / 5:33").
- The ring visual (section 3), then two lines under it:
  - Line 1, 18 px 800: **"Set X of N"**. Always shown.
  - Line 2, 14 px muted: "Rep n of N" while breathing; "Up next" during the lead-in and rest countdowns; "Complete" when done.
- Bottom controls: Restart (text button), Pause/Resume (68 px round button, breath colour), and Skip (text, rest colour). Skip only shows during countdowns.
- When the session finishes, the controls are replaced by a full-width **Continue** button that goes to Complete.
- **No horizontal progress bar.**

### 2.4 Complete
- A check badge (56 px, breath colour), "Workout complete", and the summary "3 sets × 10 reps · 5:33".
- **Week streak strip**: "N-day streak" with a flame, plus this week (Sun–Sat) drawn with the same calendar cells and bands. Today is shown as done.
- **HOW HARD WAS IT?** A 5×2 grid of buttons 1–10, with the zone label shown at the top right of the section.
  - Zones: 1–6 "Easy" (rest colour), 7–8 "In the zone" (breath colour), 9–10 "Too much" (progress colour).
  - Unselected buttons have zone-coloured numbers on the surface colour; the selected one is filled with its zone colour.
  - Below the grid, a legend with three coloured dots.
- **DIALS YOU FINISHED ON**, with the hint "Adjust if you changed them mid-workout."
  - Uses **exactly the same dial tiles as Setup**, prefilled with the values the session started with.
  - If you change a value, that tile gets a breath-colour border and a "was N" note next to its label.
  - **There's no Yes/No question.**
- **Save** (full width, 60 px): logs the workout, saves the final dial values as the new Setup defaults, then returns Home with today filled in.

## 3. Session engine and ring visual (exact spec)

### 3.1 Timeline
Build a list of segments from the config:

```
lead (3 s) → set 1 (reps × cycle) → rest (rest s) → set 2 → rest → … → set N   (no rest after the last set)
cycle C = inhale + holdTop + exhale + holdBottom   (default 2.5 + 1 + 2.5 + 1 = 7.0 s)
```

- Drive it with `requestAnimationFrame` and a single elapsed-time value.
- Clamp the per-frame step to 0.1 s so that returning from a background tab doesn't skip ahead. Better still, pause automatically when `document.visibilityState` is hidden.
- Pause freezes the elapsed time. Skip jumps to the end of the current countdown segment. Restart sets the time back to 0.
- Phases inside a cycle:
  - **INHALE** from 0 to `inhale`.
  - **HOLD** until `inhale + holdTop`.
  - **EXHALE** until `inhale + holdTop + exhale`.
  - **HOLD** until C.
- The rep count goes up at the start of each inhale.

### 3.2 Geometry (330×330 ring area, centred)
**Outer ring: whole-session progress**
- Circle at r = 160, stroke 4, round caps, rotated −90° so 0° is at 12 o'clock.
- Split into N arcs, one per set. Each arc spans `360/N − 10°`, with a **10° gap** centred on each set boundary. The first gap straddles 12 o'clock.
- Track colour: text colour at 12–14% alpha. The filled part is the **progress colour**.
- Rep ticks: 2×8 px marks at radius 150, placed at each rep boundary inside an arc. They turn the progress colour (90% alpha) once passed; otherwise they're text colour at 22% alpha.
- Indicator: a 16 px dot in the progress colour with a soft glow, moving continuously:
  - Breathing in set k: from `k·A + 5°` to `(k+1)·A − 5°` over the set (A = 360/N).
  - Lead-in or rest before set k: crosses the gap, from `k·A − 5°` to `k·A + 5°`.

**Inner ring: breath clock, and the countdown when not breathing**
- A 250×250 box, circle at r = 121, stroke 8, round caps, rotated −90°.
- **Breathing**:
  - Track is the breath colour at 16%. The fill is the breath colour, sweeping **clockwise** from 0° to 360° at a constant rate over each cycle, then resetting.
  - Four 10 px phase dots sit at the phase boundaries (0°, inhale/C, (inhale+holdTop)/C, (inhale+holdTop+exhale)/C × 360°). Each turns text colour when passed; otherwise it's the breath colour at 45%.
- **Countdown** (lead-in and rest):
  - The same ring, but the track is the **rest colour** at 16% and the fill is the rest colour.
  - It fills **clockwise** from 0° to 360° over the countdown.
  - No phase dots.
- **Done**: full ring, scale 1.
- **Breathing scale**: the whole inner box scales between 0.80 (exhaled) and 1.00 (inhaled).
  - It goes up linearly over the inhale, holds, goes down linearly over the exhale, and holds.
  - During countdowns it sits at 0.80.
  - This can be turned off in settings.

**Centre text**
- Breathing: phase label (30 px, 800, letter-spacing .16em). It fades in over 0.2 s at each phase change.
- Countdown: "GET READY" or "REST" (13 px, 800, .18em, rest colour) above the seconds remaining (56 px, 700, rounded up).
- Done: "Done" (34 px, 800) with "3 sets · 30 reps".

## 4. Data model (localStorage)

```ts
type Settings = {
  dialIn: number;        // 1–6, default 4
  dialOut: number;       // 1–5, default 3
  sets: number;          // default 3
  reps: number;          // default 10
  inhale: number;        // s, default 2.5
  holdTop: number;       // s, default 1.0
  exhale: number;        // s, default 2.5
  holdBottom: number;    // s, default 1.0
  restSeconds: number;   // default 60
  ringBreathes: boolean; // default true
  theme: 'system' | 'light' | 'dark';
};

type WorkoutLog = {
  id: string;
  date: string;            // local YYYY-MM-DD (use the local date, not UTC)
  startedAt: string;       // ISO
  durationSec: number;
  sets: number; reps: number;
  inhale: number; holdTop: number; exhale: number; holdBottom: number; restSeconds: number;
  dialInStart: number; dialOutStart: number;
  dialInEnd: number;   dialOutEnd: number;
  effort: number | null;   // 1–10
};
```

- **Streak**: count back day by day from today if today is logged, otherwise from yesterday, while each day has at least one log.
- **Best streak**: the longest run of consecutive logged days.
- Several workouts on one day count as one calendar day.
- Add **Export / Import JSON** for the logs (a small link on Home or in a settings sheet), so the data isn't trapped in one browser.

## 5. Theme tokens: "Heat"

| Token | Dark | Light |
|---|---|---|
| bg (vertical gradient) | #200E0B → #0A0505 | #FCF6F3 → #F3E7E1 |
| text | #FFF6F2 | #1E0E0C |
| muted | #B39B94 | #6A5651 |
| faint | #6E5A55 | #A8958F |
| breath (primary) | #FF5533 | #E8401C |
| onBreath (text on breath) | #1E0E0C | #FFFFFF |
| rest | #6B97FF | #3567E8 |
| progress / "too much" | #FFB627 | #B86E00 |
| onZone (text on a filled zone colour) | #1E0E0C | #FFFFFF |
| surface | rgba(255,246,242,.05) | #FFFFFF |
| border | rgba(255,246,242,.10) | rgba(30,14,12,.09) |
| subtle button bg | rgba(255,246,242,.08) | rgba(30,14,12,.06) |
| streak band | rgba(255,85,51,.24) | rgba(232,64,28,.18) |

Radii are 24 for cards, 18–20 for tiles and the calendar, and 12 for small buttons; primary buttons are pill shaped. Touch targets are at least 44 px.

## 6. Not in the prototype: confirm with Trevor before building
- **Keep the screen awake** during a session (Screen Wake Lock API). Strongly recommended.
- **Audio cues** at phase changes. The original app plays a short voice cue at each phase change. Options: Web Audio tones or `speechSynthesis` ("Inhale", "Hold", "Exhale"), with a mute toggle in the session header.
- **Vibration** on phase changes (Android only; iOS Safari doesn't support it).
- Where the light/dark override and Export/Import live: probably a small settings sheet opened from Home.

## 7. Acceptance checklist
- [ ] Home → Setup → Session → Complete → Home works end to end, and today shows as filled on the calendar afterwards.
- [ ] With default settings, the total time is 5:33 and each cycle takes 7.0 s (within one frame).
- [ ] Inner ring: breath sweep and countdown fill both go clockwise; the countdown uses the rest colour; the breath scale can be switched off.
- [ ] Outer ring: three arcs, rep ticks, and the indicator moves continuously and crosses the gaps during rests.
- [ ] "Set X of N" is always visible under the ring; there's no horizontal progress bar.
- [ ] Pause, Resume, Skip (countdowns only), Restart and × all behave as described in 2.3 and 3.1.
- [ ] Complete uses the same dial tiles as Setup, and changed dials show "was N".
- [ ] Saved dial values become the next Setup defaults.
- [ ] The streak, best streak and calendar bands are correct across month boundaries, and dates use local time.
- [ ] Light, dark and system themes all work, and text contrast is at least 4.5:1.
- [ ] Installable as a PWA and works offline.

## Using the prototype files
`prototype/session-screen.dc.html` (the session screen) and `prototype/app-flow.dc.html` (the whole flow) were made in a design-canvas format: HTML with `{{holes}}`, `<sc-if>`/`<sc-for>`, and a `class Component extends DCLogic` whose `renderVals()` holds all the logic.

They **won't run as they are**. Treat them as the source of truth for maths, geometry, colours and copy, and port the logic in `renderVals()` into React components and hooks. The session timeline and ring maths are in `session-screen.dc.html`; the calendar, streak and Setup/Complete logic are in `app-flow.dc.html`.
