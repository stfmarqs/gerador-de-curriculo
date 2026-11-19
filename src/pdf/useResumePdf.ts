import { useCallback, useEffect, useRef, useState } from 'react'
import type { Resume, Template } from '../curriculo/model'

type DocumentState = { key: string; url: string; blob: Blob }
type RequestState = { key: string; task: Promise<DocumentState> }

export function useResumePdf() {
  const [document, setDocument] = useState<DocumentState>()
  const [error, setError] = useState(false)
  const active = useRef(true)
  const displayed = useRef<DocumentState>(undefined)
  const pending = useRef<RequestState>(undefined)
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      if (displayed.current) URL.revokeObjectURL(displayed.current.url)
      displayed.current = undefined
      pending.current = undefined
    }
  }, [])

  const request = useCallback((resume: Resume, template: Template) => {
    const key = JSON.stringify([template, resume])
    if (pending.current?.key === key) return pending.current.task
    if (!pending.current && displayed.current?.key === key) return Promise.resolve(displayed.current)
    const previous = queue.current
    let task: Promise<DocumentState>
    task = previous.then(async () => {
      const stale = () => !active.current || pending.current?.task !== task
      if (stale()) throw new DOMException('Prévia substituída', 'AbortError')
      const { generatePdf } = await import('./render')
      const blob = await generatePdf(resume, template)
      if (stale()) throw new DOMException('Prévia substituída', 'AbortError')

      const old = displayed.current
      const next = { key, url: URL.createObjectURL(blob), blob }
      displayed.current = next
      setDocument(next)
      if (old) URL.revokeObjectURL(old.url)
      return next
    }).catch((failure: unknown) => {
      if (active.current && pending.current?.task === task) setError(true)
      throw failure
    }).finally(() => {
      if (pending.current?.task === task) pending.current = undefined
    })
    queue.current = task.then(() => undefined, () => undefined)
    pending.current = { key, task }
    setError(false)
    return task
  }, [])

  const clear = useCallback(() => {
    pending.current = undefined
    if (displayed.current) URL.revokeObjectURL(displayed.current.url)
    displayed.current = undefined
    setDocument(undefined)
    setError(false)
  }, [])

  return { document, error, request, clear }
}
