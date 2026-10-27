/** npm run icons — rasterises public/icon*.svg into the PNG icons with Playwright. */
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const jobs: [string, string, number][] = [
  ['public/icon.svg', 'public/icon-192.png', 192],
  ['public/icon.svg', 'public/icon-512.png', 512],
  ['public/icon-maskable.svg', 'public/icon-maskable-512.png', 512],
  // iOS applies its own rounding, so use the full-bleed art.
  ['public/icon-maskable.svg', 'public/apple-touch-icon.png', 180],
]

const browser = await chromium.launch()
for (const [src, out, size] of jobs) {
  const svg = readFileSync(src, 'utf8')
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
  )
  writeFileSync(out, await page.screenshot({ omitBackground: true }))
  await page.close()
}
await browser.close()
