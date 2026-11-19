import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const guides = [
  ['Primeiro emprego', '/curriculo-primeiro-emprego/'],
  ['Jovem aprendiz', '/curriculo-jovem-aprendiz/'],
  ['Estágio', '/curriculo-estagio/'],
  ['Currículo simples', '/curriculo-simples/'],
] as const

test.describe('guias estáticos em tela pequena', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 320, height: 780 } })

  for (const [name, path] of guides) {
    test(name + ' pode ser aberto pela landing', async ({ page }) => {
      await page.goto('/')
      const link = page.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', path)
      await link.click()
      await expect(page).toHaveURL(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Criar meu currículo' })).toHaveAttribute('href', '/editor/')
      await expect(page.getByRole('region', { name: 'Exemplo preenchido' })).toBeVisible()
      expect(await page.locator('body').boundingBox()).toHaveProperty('width', 320)
      expect(await page.locator('html').getAttribute('lang')).toBe('pt-BR')
      expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(50)
    })
  }
})

test('guia permite acessar o editor e passa na auditoria básica', async ({ page }) => {
  await page.goto('/curriculo-primeiro-emprego/')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
  await page.getByRole('link', { name: 'Criar meu currículo' }).click()
  await expect(page.getByRole('heading', { name: 'Monte seu currículo' })).toBeVisible()
})

test('sitemap e canônicas incluem os guias quando SITE_URL está configurado', async ({ page, request }) => {
  const value = process.env.SITE_URL
  test.skip(!value, 'O build precisa de SITE_URL para gerar sitemap e canônicas.')
  const { origin } = new URL(value!)
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  const xml = await sitemap.text()
  for (const [, path] of guides) {
    await page.goto(path)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', origin + path)
    expect(xml).toContain('<loc>' + origin + path + '</loc>')
  }
  expect(xml).not.toContain('/editor/')
})
