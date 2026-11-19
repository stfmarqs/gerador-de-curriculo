import { z } from 'zod'
import { resumeSchema, templateSchema, type Resume, type Template } from './model'

export const draftKey = 'gerador-curriculo:draft'
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type Draft = { resume: Resume; template: Template }

const current = z.object({ version: z.literal(1), resume: resumeSchema, template: templateSchema })
const version = z.object({ version: z.number() })

export function readDraft(storage: Pick<StorageAccess, 'getItem'>):
  { status: 'saved'; draft: Draft } | { status: 'empty' | 'unavailable' | 'invalid' | 'unsupported' } {
  let raw
  try { raw = storage.getItem(draftKey) } catch { return { status: 'unavailable' } }
  if (raw === null) return { status: 'empty' }
  try {
    const data: unknown = JSON.parse(raw)
    const recorded = version.safeParse(data)
    if (recorded.success && recorded.data.version !== 1) return { status: 'unsupported' }
    const result = current.safeParse(data)
    if (!result.success) return { status: 'invalid' }
    const { resume, template } = result.data
    return { status: 'saved', draft: { resume, template } }
  } catch {
    return { status: 'invalid' }
  }
}

export function writeDraft(storage: Pick<StorageAccess, 'getItem' | 'setItem'>, draft: Draft) {
  if (readDraft(storage).status === 'unsupported') return false
  try {
    storage.setItem(draftKey, JSON.stringify({ version: 1, ...draft }))
    return true
  } catch { return false }
}

export function clearDraft(storage: Pick<StorageAccess, 'removeItem'>) {
  try {
    storage.removeItem(draftKey)
    return true
  } catch { return false }
}

export const browserStorage: StorageAccess = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
}
