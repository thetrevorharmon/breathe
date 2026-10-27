/**
 * npm run screenshot [screens...] [--no-build] [--query "t=40&seed=1"] [--name suffix] [--modes light,dark]
 * Builds, serves `vite preview` on a free port, and saves <screen>[-name]-<mode>.png
 * (390x844 @2x) into $SCREENSHOT_DIR (default ./.screenshots).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright'

const ALL = ['home', 'setup', 'session', 'complete']

function parseArgs(argv: string[]) {
  const o = { screens: [] as string[], build: true, query: '', name: '', modes: ['light', 'dark'] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--no-build') o.build = false
    else if (a === '--query') o.query = (argv[++i] ?? '').replace(/^\?/, '')
    else if (a === '--name') o.name = argv[++i] ?? ''
    else if (a === '--modes') o.modes = (argv[++i] ?? '').split(',')
    else if (!a.startsWith('--')) o.screens.push(a)
  }
  if (o.screens.length === 0) o.screens = ALL
  return o
}

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
  const opts = parseArgs(process.argv.slice(2))
  const outDir = path.resolve(process.env.SCREENSHOT_DIR ?? '.screenshots')
  mkdirSync(outDir, { recursive: true })

  if (opts.build) {
    const r = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
  }

  const port = await freePort()
  const server: ChildProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    {
      stdio: 'ignore',
    },
  )
  const base = `http://127.0.0.1:${port}/breathe/`
  try {
    await waitFor(base)
    const browser = await chromium.launch()
    for (const mode of opts.modes) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: mode === 'dark' ? 'dark' : 'light',
      })
      for (const screen of opts.screens) {
        const page = await ctx.newPage()
        const q = new URLSearchParams(opts.query)
        q.set('screen', screen)
        q.set('mode', mode)
        await page.goto(`${base}?${q}`, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(150)
        const file = path.join(outDir, `${screen}${opts.name ? '-' + opts.name : ''}-${mode}.png`)
        await page.screenshot({ path: file })
        console.log(file)
        await page.close()
      }
      await ctx.close()
    }
    await browser.close()
  } finally {
    server.kill()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
