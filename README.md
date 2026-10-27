# Breathe

A calm, guided breathing-workout PWA, built as a replacement companion for the Breather Fit. Set your device dials, run a timed session (sets, reps, hold phases, rest) with a breathing ring and spoken/tone cues, rate the effort, and track your daily streak. Data stays in `localStorage`; export/import as JSON.

## Run

```sh
mise trust            # once, to allow mise.toml
npx npm@11 install    # npm 11 matches the lockfile
npm run dev           # dev server at /breathe/
npm run build && npm run preview
npm run lint
npm test              # vitest unit/component tests
npm run test:e2e      # Playwright; builds and serves vite preview on port 4783
npm run test:offline  # service worker + offline reload check
npm run screenshot    # 390x844 PNGs into $SCREENSHOT_DIR (default ./.screenshots)
```

Playwright needs a browser once: `npx playwright install chromium`.

## Dev params

Append to the URL (for dev and screenshots; `muted` does write the mute setting):

- `screen=home|setup|session|complete|gallery`
- `mode=light|dark`
- `seed=demo` loads fake workout history
- `sheet=settings` opens the settings sheet
- `t=<seconds>` starts the session clock at a time; `paused=1` freezes it
- `muted=1|0` forces the cue mute state

## Deploy

GitHub Pages via `.github/workflows`, on every push to `main`. One-time: repo Settings → Pages → Source → **GitHub Actions**. The app is served from `/breathe/` (Vite `base`, PWA `scope`/`start_url`).

See `docs/ACCEPTANCE.md` for the acceptance checklist and what still needs a real device.
