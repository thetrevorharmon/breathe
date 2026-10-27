/**
 * npm run test:offline
 * Builds, serves `vite preview` on a free port, loads /breathe/, waits for the service worker to
 * control the page, goes offline, reloads and asserts Home still renders. Also checks the manifest.
 * Saves the offline reload to $SCREENSHOT_DIR/offline-reload.png (default ./.screenshots).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

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

async function main() {
  const outDir = path.resolve(process.env.SCREENSHOT_DIR ?? '.screenshots')
  mkdirSync(outDir, { recursive: true })

  if (!process.argv.includes('--no-build')) {
    const r = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
  }

  const port = await freePort()
  const server: ChildProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore' },
  )
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

    const browser = await chromium.launch()
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    })
    const page = await ctx.newPage()
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    // First load is not controlled; reload once online so the worker takes over and caches are warm.
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    console.log('ok  service worker controls the page')

    await ctx.setOffline(true)
    await page.reload({ waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.getByRole('button').first().waitFor({ state: 'visible', timeout: 5000 })
    const text = await page.locator('#root').innerText()
    assert.match(text, /breath/i, 'Home content rendered offline')
    const fontOk = await page.evaluate(() => document.fonts.check("16px 'Manrope Variable'"))
    assert.ok(fontOk, 'Manrope font available offline')
    const file = path.join(outDir, 'offline-reload.png')
    await page.screenshot({ path: file })
    console.log('ok  Home renders after offline reload')
    console.log(file)
    await browser.close()
  } finally {
    server.kill()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
