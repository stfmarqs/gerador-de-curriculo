import { z } from 'zod'

export const templates = {
  classico: 'Clássico',
  moderno: 'Moderno',
  executivo: 'Executivo',
}
export const templateSchema = z.enum(['classico', 'moderno', 'executivo'])
export type Template = z.infer<typeof templateSchema>

const text = z.string()
const item = z.object({ id: z.string().min(1) })
const datedItem = item.extend({ start: text, end: text, description: text })

export const resumeSchema = z.object({
  personal: z.object({ name: text, email: text, phone: text, city: text, link: text }),
  summary: text,
  experiences: z.array(datedItem.extend({ role: text, company: text })),
  education: z.array(datedItem.extend({ course: text, school: text })),
  certificates: z.array(item.extend({ name: text, institution: text, year: text })),
  skills: z.array(item.extend({ name: text })),
  languages: z.array(item.extend({ name: text, level: text })),
  additional: text,
})
export type Resume = z.infer<typeof resumeSchema>

export function blankResume(): Resume {
  return {
    personal: { name: '', email: '', phone: '', city: '', link: '' },
    summary: '', experiences: [], education: [], certificates: [], skills: [], languages: [], additional: '',
  }
}

export const exportSchema = resumeSchema.superRefine((resume, context) => {
  const add = (path: (string | number)[], message: string) => context.addIssue({ code: 'custom', path, message })
  const { name, email, phone, link } = resume.personal
  if (!name.trim()) add(['personal', 'name'], 'Informe seu nome completo.')
  if (email.trim() && !z.email().safeParse(email.trim()).success) add(['personal', 'email'], 'Informe um e-mail válido.')
  if (phone.trim() && (!/^\+?[\d\s().-]+$/.test(phone.trim()) || !/^\d{8,15}$/.test(phone.replace(/\D/g, '')))) {
    add(['personal', 'phone'], 'Informe um telefone com 8 a 15 dígitos.')
  }
  if (link.trim() && !z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).safeParse(link.trim()).success) {
    add(['personal', 'link'], 'Informe o endereço completo, começando com https://.')
  }
  for (const section of ['experiences', 'education'] as const) {
    resume[section].forEach(({ start, end }, index) => {
      const month = /^\d{4}-(0[1-9]|1[0-2])$/
      if (start && !month.test(start)) add([section, index, 'start'], 'Informe um mês válido.')
      if (end && !month.test(end)) add([section, index, 'end'], 'Informe um mês válido.')
      else if (start && end && end < start) add([section, index, 'end'], 'A data final deve ser igual ou posterior à inicial.')
    })
  }
  resume.certificates.forEach(({ year }, index) => {
    if (year.trim() && !/^\d{4}$/.test(year.trim())) add(['certificates', index, 'year'], 'Informe um ano com quatro dígitos.')
  })
})

export function validateExport(resume: Resume): Record<string, string> {
  const result = exportSchema.safeParse(resume)
  return result.success ? {} : Object.fromEntries(result.error.issues.map(
    ({ path, message }) => [path.join('.'), message],
  ))
}

export type Entry = { title?: string; detail?: string; body?: string }
export type Section = { title: string; entries: Entry[]; compact?: boolean }
export type ResumeDocument = {
  personal: Partial<Resume['personal']>
  sections: Section[]
}

function clean(value: string) {
  return value.replace(/\r\n?/g, '\n').trim()
}

function join(parts: string[], separator = ' · ') {
  return parts.map(clean).filter(Boolean).join(separator)
}

function period(start: string, end: string) {
  const format = (date: string) => date.replace(/^(\d{4})-(\d\d)$/, '$2/$1')
  return join([format(start), format(end)], ' – ')
}

function section(title: string, entries: Entry[], compact = false): Section {
  const cleaned = entries.map((entry) => Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [key, clean(value)]).filter(([, value]) => value),
  ))
  return { title, entries: cleaned.filter((entry) => Object.keys(entry).length), ...(compact && { compact }) }
}

export function normalizeResume(resume: Resume): ResumeDocument {
  const personal = Object.fromEntries(Object.entries(resume.personal)
    .map(([key, value]) => [key, clean(value)]).filter(([, value]) => value))
  const sections = [
    section('Objetivo ou resumo profissional', [{ body: resume.summary }]),
    section('Experiência profissional', resume.experiences.map((item) => ({
      title: clean(item.role) || item.company, detail: join([clean(item.role) ? item.company : '', period(item.start, item.end)]),
      body: item.description,
    }))),
    section('Formação acadêmica', resume.education.map((item) => ({
      title: clean(item.course) || item.school, detail: join([clean(item.course) ? item.school : '', period(item.start, item.end)]),
      body: item.description,
    }))),
    section('Cursos e certificações', resume.certificates.map((item) => ({
      title: item.name, detail: join([item.institution, item.year]),
    }))),
    section('Competências', resume.skills.map(({ name }) => ({ title: name })), true),
    section('Idiomas', resume.languages.map(({ name, level }) => ({ title: join([name, name.trim() ? level : '']) })), true),
    section('Informações adicionais', [{ body: resume.additional }]),
  ].filter(({ entries }) => entries.length)
  return { personal, sections }
}
