import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('prepara o PDF e usa um novo toque para abrir o compartilhamento', async ({ page }) => {
  await page.addInitScript(() => {
    const files: File[] = []
    Object.defineProperty(window, 'sharedPdfs', { value: files })
    Object.defineProperty(navigator, 'canShare', { value: ({ files }: ShareData) => !!files?.length })
    Object.defineProperty(navigator, 'share', {
      value: ({ files: incoming }: ShareData) => {
        if (!navigator.userActivation.isActive) throw new Error('Compartilhamento sem gesto ativo')
        files.push(...(incoming ?? []))
        return Promise.resolve()
      },
    })
  })
  let release = () => {}
  const wait = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/assets/render-*.js', async (route) => { await wait; await route.continue() })
  await page.goto('/editor/')
  await page.getByLabel('Nome completo').fill('Marina Almeida')
  const share = page.getByRole('button', { name: 'Salvar ou compartilhar PDF' })
  await share.click()
  await expect(share).toBeDisabled()
  release()
  await expect(page.getByRole('status').filter({ hasText: 'PDF pronto.' })).toBeVisible()
  const sharedCount = () => page.evaluate(() => (window as Window & { sharedPdfs?: File[] }).sharedPdfs?.length)
  expect(await sharedCount()).toBe(0)

  await share.click()
  await expect.poll(sharedCount).toBe(1)
  const document = await page.evaluate(async () => {
    const file = (window as Window & { sharedPdfs?: File[] }).sharedPdfs![0]
    return { name: file.name, type: file.type, header: await file.slice(0, 5).text() }
  })
  expect(document).toEqual({ name: 'curriculo-Marina-Almeida.pdf', type: 'application/pdf', header: '%PDF-' })
})
