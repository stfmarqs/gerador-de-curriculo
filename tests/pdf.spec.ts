import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

for (const model of ['Clássico', 'Moderno', 'Executivo']) {
  test(model + ' exporta o PDF mostrado na prévia', async ({ page }) => {
    const response = await page.goto('/editor/')
    expect(response?.ok()).toBe(true)
    await page.getByLabel('Nome completo').fill('João da Conceição')
    await page.getByLabel('Modelo', { exact: true }).selectOption({ label: model })
    await page.getByRole('textbox', { name: 'Objetivo ou resumo profissional', exact: true }).fill('Profissional com experiência em operações e organização.')
    await page.getByRole('button', { name: 'Adicionar experiência' }).click()
    await page.getByLabel('Cargo').fill('Analista de operações')
    await page.getByLabel('LinkedIn ou portfólio').fill('https://exemplo.com/' + 'portfolio'.repeat(30))
    const description = page.getByLabel('Descrição das atividades')
    const downloadButton = page.getByRole('button', { name: 'Baixar PDF' })

    async function downloadPdf() {
      const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()])
      const bytes = await readFile((await download.path())!)
      const preview = await page.getByTestId('pdf-preview').getAttribute('data-pdf-url')
      expect(preview).toBeTruthy()
      const shown = await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url!)).arrayBuffer())), preview)
      expect(Buffer.from(shown).equals(bytes)).toBe(true)
      return getDocument({ data: Uint8Array.from(bytes), useSystemFonts: false }).promise
    }

    const short = await downloadPdf()
    try {
      expect(short.numPages).toBe(1)
      const pdfPage = await short.getPage(1)
      const text = (await pdfPage.getTextContent()).items.map((item) => 'str' in item ? item.str : '').join(' ')
      expect(text).toContain('João da Conceição')
      expect(text).toContain('Analista de operações')
      expect(text).not.toContain('Idiomas')
      expect((await pdfPage.getAnnotations()).some((annotation) => annotation.url?.startsWith('https://exemplo.com/'))).toBe(true)
    } finally {
      await short.destroy()
    }

    await description.fill(Array.from({ length: 95 }, (_, index) =>
      'Atividade ' + (index + 1) + ': organização de processos, atendimento e análise de informações.'
    ).join('\n') + '\nMarcador final de revisão.')
    const long = await downloadPdf()
    try {
      expect(long.numPages).toBeGreaterThan(1)
      let all = ''
      for (let index = 1; index <= long.numPages; index++) {
        const pdfPage = await long.getPage(index)
        const viewport = pdfPage.getViewport({ scale: 1 })
        expect(viewport.width).toBeCloseTo(595.28, 1)
        expect(viewport.height).toBeCloseTo(841.89, 1)
        const items = (await pdfPage.getTextContent()).items
        for (const item of items) {
          if (!('str' in item) || !item.str.trim()) continue
          const [, , , , x, y] = item.transform
          expect(x).toBeGreaterThan(15)
          expect(x + item.width).toBeLessThan(viewport.width - 15)
          expect(y).toBeGreaterThan(15)
          expect(y + item.height).toBeLessThan(viewport.height - 15)
          all += item.str + ' '
        }
      }
      expect(all).toContain('Marcador final de revisão.')
      for (let index = 1; index <= 95; index++) {
        expect(all).toContain('Atividade ' + index + ':')
      }
      expect(all.indexOf('João da Conceição')).toBeLessThan(all.indexOf('Atividade 1:'))
      await page.getByRole('button', { name: 'Próxima', exact: true }).click()
      await expect(page.getByRole('group', { name: 'Texto da página 2' })).toContainText('Atividade')
    } finally {
      await long.destroy()
    }
  })
}
