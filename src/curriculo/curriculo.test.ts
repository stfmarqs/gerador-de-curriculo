import { describe, expect, it } from 'vitest'
import { blankResume, normalizeResume, validateExport } from './model'

describe('currículo', () => {
  it('remove itens e campos vazios sem alterar a ordem', () => {
    const resume = blankResume()
    resume.personal.name = '  João da Conceição  '
    resume.skills = [{ id: 'a', name: ' Excel ' }, { id: 'b', name: ' ' }, { id: 'c', name: 'SQL' }]
    expect(normalizeResume(resume)).toEqual({ personal: { name: 'João da Conceição' }, sections: [
      { title: 'Competências', entries: [{ title: 'Excel' }, { title: 'SQL' }], compact: true },
    ] })
  })

  it('aceita perfil sem experiência e valida campos preenchidos', () => {
    const resume = blankResume()
    expect(validateExport(resume)).toHaveProperty('personal.name')
    resume.personal.name = 'João'
    expect(validateExport(resume)).toEqual({})
    resume.personal.email = 'incompleto'
    resume.experiences = [{ id: 'x', role: '', company: '', start: '2025-03', end: '2025-02', description: '' }]
    expect(validateExport(resume)).toMatchObject({
      'personal.email': expect.any(String), 'experiences.0.end': expect.any(String),
    })
  })

  it('normaliza descrições, períodos e informações sem inventar títulos', () => {
    const resume = blankResume()
    resume.experiences = [{ id: 'a', role: '', company: 'Loja', start: '2024-02', end: '', description: ' Linha 1\r\nLinha 2 ' }]
    resume.additional = ' Disponibilidade à tarde '
    expect(normalizeResume(resume).sections.map(({ entries }) => entries)).toEqual([
      [{ title: 'Loja', detail: '02/2024', body: 'Linha 1\nLinha 2' }],
      [{ body: 'Disponibilidade à tarde' }],
    ])
  })
})
