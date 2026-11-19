import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import styles from './preview.module.css'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState<{ url: string; pdf: PDFDocumentProxy }>()
  const [failed, setFailed] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => {
    const task = getDocument({ url, useSystemFonts: false })
    let active = true
    void task.promise.then((pdf) => {
      if (active) setLoaded({ url, pdf })
    }, () => { if (active) setFailed(url) })
    return () => {
      active = false
      void task.destroy().catch(() => undefined)
    }
  }, [url])

  if (failed === url) return <p role="status">Não foi possível mostrar a prévia. Você ainda pode baixar o PDF.</p>
  if (!loaded || loaded.url !== url) return <p className={styles.loading} role="status">Atualizando prévia…</p>
  const currentPage = Math.min(page, loaded.pdf.numPages)
  return <>
    {loaded.pdf.numPages > 1 && <nav className={styles.pagination} aria-label="Páginas do currículo">
      <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Anterior</button>
      <span aria-live="polite">{currentPage} de {loaded.pdf.numPages}</span>
      <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= loaded.pdf.numPages}>Próxima</button>
    </nav>}
    <PdfPage key={url + currentPage} pdf={loaded.pdf} page={currentPage} />
  </>
}

function PdfPage({ pdf, page }: { pdf: PDFDocumentProxy; page: number }) {
  const frame = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [text, setText] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = frame.current!
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!width) return
    let active = true
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    void (async () => {
      const documentPage = await pdf.getPage(page)
      if (!active) return
      const element = canvas.current!
      const pixelRatio = Math.min(devicePixelRatio, 2)
      const scale = width / documentPage.getViewport({ scale: 1 }).width
      const viewport = documentPage.getViewport({ scale: scale * pixelRatio })
      element.width = Math.ceil(viewport.width)
      element.height = Math.ceil(viewport.height)
      task = documentPage.render({ canvas: element, viewport })
      const [content] = await Promise.all([documentPage.getTextContent(), task.promise])
      if (active) {
        setText(content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''))
      }
    })().catch(() => { if (active) setFailed(true) })
    return () => { active = false; task?.cancel() }
  }, [pdf, page, width])

  return <div ref={frame} className={styles.paper}>
    <canvas ref={canvas} aria-hidden="true" />
    {failed
      ? <p role="status">Não foi possível mostrar esta página.</p>
      : <div className={styles.reader} role="group" aria-label={'Texto da página ' + page}>{text}</div>}
  </div>
}
