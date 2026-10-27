import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
  ', workout done, today'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('full flow: Home -> Setup -> Session -> Complete -> Save -> Home', async ({ page }) => {
  await expect(page.getByText('Start workout')).toBeVisible()
  await expect(page.getByText('0 workouts in')).toBeVisible()

  await page.getByRole('button', { name: /Start workout/ }).click()
  await expect(page.getByTestId('total-time')).toHaveText('5:33')
  for (const [name, n] of [
    ['Decrease Sets', 5],
    ['Decrease Reps per set', 30],
    ['Decrease Inhale', 30],
    ['Decrease Exhale', 30],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const b = page.getByRole('button', { name, exact: true })
      if (await b.isDisabled()) break
      await b.click()
    }
  }
  // Holds (both) to 0; there are two "Hold" steppers.
  for (const which of [0, 1]) {
    const dec = page.getByRole('button', { name: 'Decrease Hold', exact: true }).nth(which)
    while (await dec.isEnabled()) await dec.click()
  }
  // 3 s lead-in + 1 rep of 0.5 + 0.5
  await expect(page.getByTestId('total-time')).toHaveText('0:04')

  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByText('Set 1 of 1')).toBeVisible()
  await expect(page.getByText('GET READY')).toBeVisible()

  // Runs to done on real time, no `t` param.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Complete', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.getByRole('button', { name: 'Effort 7' }).click()
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
  await expect(page.getByTestId('effort-zone')).toHaveText(/zone/i)

  const exhaleBefore = Number((await page.getByLabel(/^Exhale dial \d/).textContent())?.trim())
  await page.getByRole('button', { name: 'Increase Exhale dial' }).click()
  await expect(page.getByText(`was ${exhaleBefore}`)).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Done for today')).toBeVisible()
  await expect(page.getByText('day streak')).toBeVisible()
  await expect(page.getByText('1 workout in')).toBeVisible()
  await expect(page.getByRole('gridcell', { name: todayLabel() })).toBeVisible()
  const streak = await page.locator('span', { hasText: /^\d+$/ }).first().textContent()
  expect(streak).toBe('1')

  // Persistence: log stored, Setup defaults to the changed dial.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('breathe:v1:logs')!))
  expect(JSON.stringify(stored)).toContain('"effort":7')
  await page.reload()
  await page.getByRole('button', { name: 'Again' }).click()
  await expect(page.getByLabel(`Exhale dial ${exhaleBefore + 1}`)).toBeVisible()
})

test('x on the session confirms, returns Home and logs nothing', async ({ page }) => {
  await page.getByRole('button', { name: /Start workout/ }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'End workout' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  // Cancel keeps the session.
  await dialog.getByRole('button', { name: /cancel|keep|continue/i }).click()
  await expect(page.getByText('Set 1 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'End workout' }).click()
  await expect(page.getByText('Start workout')).toBeVisible()
  const logs = await page.evaluate(() => localStorage.getItem('breathe:v1:logs'))
  expect(logs === null || !/"id"/.test(logs)).toBe(true)
})

test('settings: mode toggle persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
})

test('export -> clear -> import round trip, importing twice adds nothing', async ({ page }) => {
  await page.goto('./?seed=demo')
  await page.waitForSelector('text=day streak')
  // Drop the seed param so reloads keep stored data.
  const before = await page.evaluate(() => localStorage.getItem('breathe:v1:logs'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^breathe-logs-\d{4}-\d{2}-\d{2}\.json$/)
  const file = test.info().outputPath('export.json')
  await download.saveAs(file)
  const exported = JSON.parse(readFileSync(file, 'utf8'))
  expect(Array.isArray(exported.logs)).toBe(true)
  const n = exported.logs.length
  expect(n).toBeGreaterThan(0)
  expect(before).not.toBeNull()

  await page.evaluate(() => localStorage.removeItem('breathe:v1:logs'))
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('import-input').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText(`Imported ${n} workout`)
  await page.getByTestId('import-input').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText('Imported 0 workouts')
  await page.keyboard.press('Escape')
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('breathe:v1:logs')!))
  expect((after.logs ?? after).length).toBe(n)

  // Invalid file shows an error and changes nothing.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByTestId('import-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nope":true}'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
})

test('works offline after the service worker installs', async ({ page, context }) => {
  await page.goto('./', { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'load' })
  await expect(page.getByText('Start workout')).toBeVisible()
  await context.setOffline(false)
})
