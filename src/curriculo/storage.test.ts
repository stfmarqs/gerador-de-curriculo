import { describe, expect, it, vi } from 'vitest'
import { blankResume } from './model'
import { clearDraft, draftKey, readDraft, writeDraft } from './storage'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  }
}

describe('rascunho local', () => {
  it('restaura dados incompletos, modelo e ordem e permite limpar', () => {
    const storage = memory()
    const resume = blankResume()
    resume.personal.email = 'ainda digitando'
    resume.skills = [{ id: '2', name: 'Excel' }, { id: '1', name: 'SQL' }]
    expect(writeDraft(storage, { resume, template: 'executivo' })).toBe(true)
    expect(readDraft(storage)).toEqual({ status: 'saved', draft: { resume, template: 'executivo' } })
    expect(clearDraft(storage)).toBe(true)
    expect(readDraft(storage).status).toBe('empty')
  })

  it('distingue corrupção e falha de acesso e preserva versão futura', () => {
    const storage = memory()
    storage.setItem(draftKey, '{')
    expect(readDraft(storage).status).toBe('invalid')
    storage.setItem(draftKey, '{"version":2}')
    expect(readDraft(storage).status).toBe('unsupported')
    expect(writeDraft(storage, { resume: blankResume(), template: 'classico' })).toBe(false)
    expect(storage.getItem(draftKey)).toBe('{"version":2}')
    const fail = vi.fn(() => { throw new Error('Storage disabled') })
    expect(readDraft({ ...storage, getItem: fail }).status).toBe('unavailable')
    expect(writeDraft({ ...storage, setItem: fail }, { resume: blankResume(), template: 'classico' })).toBe(false)
    expect(clearDraft({ ...storage, removeItem: fail })).toBe(false)
  })
})
