/**
 * npm run test:offline
 * Builds, serves `vite preview` on a free port and checks the manifest. Then, in Chromium and in
 * WebKit (Safari's engine), loads /breathe/ once online so the service worker installs, shuts the
 * server down, and opens the app fresh, like launching the home-screen app with no network. Offline
 * it asserts Home renders with its font, every voice clip is cached, and a workout starts: the
 * lead-in counts 4, 3, 2, 1, the clips decode and play (tick, tick, tick, go, inhale) and the
 * audio session is "playback" so cues play with the silent switch on.
 * Saves screenshots to $SCREENSHOT_DIR/offline-<browser>-*.png (default ./.screenshots).
 * Pass --no-build to reuse dist/, --browser=webkit or --browser=chromium to run one.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, webkit, type BrowserType } from 'playwright'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number }
      srv.close(() => resolve(port))
    })
  })
}

async function waitFor(url: string, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`Preview server did not start at ${url}`)
}

async function isDown(url: string) {
  try {
    await fetch(url)
    return false
  } catch {
    return true
  }
}

function startServer(port: number): ChildProcess {
  return spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore', detached: true },
  )
}

function stopServer(server: ChildProcess) {
  try {
    // detached: kill the whole group (npx -> vite)
    process.kill(-server.pid!, 'SIGTERM')
  } catch {
    /* already gone */
  }
}

/** Records every Web Audio clip that starts, and the audio session type at that moment. */
function audioProbe() {
  const w = window as unknown as {
    __played: { dur: number; at: number; session: string | null }[]
  }
  w.__played = []
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    w.__played.push({
      dur: this.buffer?.duration ?? 0,
      at: performance.now(),
      session: nav.audioSession?.type ?? null,
    })
    return start.apply(this, args)
  }
}

async function checkBrowser(name: string, type: BrowserType, outDir: string) {
  const port = await freePort()
  const base = `http://127.0.0.1:${port}/breathe/`
  let server: ChildProcess | null = startServer(port)
  const browser = await type.launch()
  try {
    await waitFor(base)
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    })
    await ctx.addInitScript(audioProbe)

    // 1. First launch, online: the worker installs and precaches everything.
    const first = await ctx.newPage()
    await first.goto(base, { waitUntil: 'networkidle' })
    await first.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await first.reload({ waitUntil: 'networkidle' })
    await first.waitForFunction(() => navigator.serviceWorker.controller !== null)
    console.log(`ok  [${name}] service worker installed and controls the page`)

    const clips = readdirSync('dist/assets').filter((f) => f.endsWith('.mp3'))
    const cached = await first.evaluate(async () => {
      const urls: string[] = []
      for (const key of await caches.keys()) {
        const c = await caches.open(key)
        for (const req of await c.keys()) urls.push(new URL(req.url).pathname)
      }
      return urls
    })
    for (const clip of clips) {
      assert.ok(
        cached.some((u) => u.endsWith(clip)),
        `${clip} is precached`,
      )
    }
    assert.ok(
      cached.some((u) => u.endsWith('/index.html')),
      'index.html is precached',
    )
    assert.ok(
      cached.some((u) => u.endsWith('.woff2')),
      'font is precached',
    )
    console.log(`ok  [${name}] precache holds the app, font and all ${clips.length} voice clips`)
    await first.close()

    // 2. No network at all: the server is gone, and the browser is offline.
    stopServer(server)
    server = null
    for (let i = 0; i < 50 && !(await isDown(base)); i++)
      await new Promise((r) => setTimeout(r, 100))
    assert.ok(await isDown(base), 'server is down')
    await ctx.setOffline(true)

    // 3. Cold launch, like tapping the home-screen icon.
    const page = await ctx.newPage()
    await page.goto(base, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button', { name: /Start workout/ }).waitFor({ timeout: 5000 })
    const fontOk = await page.evaluate(() => document.fonts.check("16px 'Manrope Variable'"))
    assert.ok(fontOk, 'Manrope font available offline')
    await page.screenshot({ path: path.join(outDir, `offline-${name}-home.png`) })
    console.log(`ok  [${name}] app opens from scratch with the server down and no network`)

    // 4. Start a workout offline; watch the countdown and the clips.
    await page.getByRole('button', { name: /Start workout/ }).click()
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await page.getByText('GET READY').waitFor({ timeout: 5000 })
    const seen: string[] = []
    const deadline = Date.now() + 5500
    let shot = false
    while (Date.now() < deadline) {
      const n = await page.evaluate(() => {
        const el = [...document.querySelectorAll('div')].find((d) =>
          /^\d$/.test(d.textContent?.trim() ?? ''),
        )
        return el?.textContent?.trim() ?? null
      })
      if (n && seen[seen.length - 1] !== n) seen.push(n)
      if (n === '4' && !shot) {
        await page.screenshot({ path: path.join(outDir, `offline-${name}-countdown-4.png`) })
        shot = true
      }
      await page.waitForTimeout(100)
    }
    assert.deepEqual(seen.slice(0, 4), ['4', '3', '2', '1'], `countdown digits ${seen}`)
    console.log(`ok  [${name}] lead-in shows ${seen.slice(0, 4).join(' ')}`)

    const played = await page.evaluate(
      () => (window as unknown as { __played: { dur: number; session: string | null }[] }).__played,
    )
    // Drop the one-sample unlock buffer; what's left are real clips.
    const clipsPlayed = played.filter((p) => p.dur > 0.01)
    const durs = clipsPlayed.map((p) => p.dur.toFixed(2))
    assert.ok(clipsPlayed.length >= 5, `expected tick x3, go, inhale; got ${durs}`)
    const [t1, t2, t3, go, inhale] = clipsPlayed.map((p) => p.dur)
    assert.ok(t1 === t2 && t2 === t3, 'the 4, 3 and 2 beeps are the same tone')
    assert.notEqual(go, t1, 'the 1 beep is a different tone')
    assert.ok(inhale > go, 'then the spoken "Inhale" clip')
    console.log(
      `ok  [${name}] offline audio played: tick ${t1.toFixed(2)}s x3, go ${go.toFixed(2)}s, inhale ${inhale.toFixed(2)}s`,
    )
    const sessions = [...new Set(clipsPlayed.map((p) => p.session))]
    if (sessions[0] === null) {
      console.log(`--  [${name}] no navigator.audioSession in this engine (Safari on iOS has it)`)
    } else {
      assert.deepEqual(sessions, ['playback'], 'audio session while cues play')
      console.log(`ok  [${name}] navigator.audioSession.type = "playback" while cues play`)
    }
    await page.screenshot({ path: path.join(outDir, `offline-${name}-session.png`) })
  } finally {
    await browser.close()
    if (server) stopServer(server)
  }
}

async function main() {
  const outDir = path.resolve(process.env.SCREENSHOT_DIR ?? '.screenshots')
  mkdirSync(outDir, { recursive: true })

  if (!process.argv.includes('--no-build')) {
    const r = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
  }

  // Manifest check against a short-lived server.
  const port = await freePort()
  const server = startServer(port)
  const base = `http://127.0.0.1:${port}/breathe/`
  try {
    await waitFor(base)
    const manifest = (await (await fetch(`${base}manifest.webmanifest`)).json()) as {
      name: string
      display: string
      start_url: string
      scope: string
      icons: { src: string; sizes: string; purpose?: string }[]
    }
    assert.equal(manifest.name, 'Breathe')
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.start_url, '/breathe/')
    assert.equal(manifest.scope, '/breathe/')
    for (const size of ['192x192', '512x512']) {
      assert.ok(
        manifest.icons.some((i) => i.sizes === size),
        `manifest icon ${size}`,
      )
    }
    assert.ok(
      manifest.icons.some((i) => i.purpose === 'maskable'),
      'maskable icon',
    )
    console.log('ok  manifest is valid')
  } finally {
    stopServer(server)
  }

  const only = process.argv.find((a) => a.startsWith('--browser='))?.split('=')[1]
  const browsers: [string, BrowserType][] = [
    ['chromium', chromium],
    ['webkit', webkit],
  ]
  for (const [name, type] of browsers) {
    if (only && only !== name) continue
    await checkBrowser(name, type, outDir)
  }
  console.log(outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
