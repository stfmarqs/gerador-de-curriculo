import { Button, Modal, NativeSelect } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { blankResume, templates, validateExport, type Resume, type Template } from '../curriculo/model'
import { browserStorage, clearDraft, readDraft, writeDraft, type Draft } from '../curriculo/storage'
import { useResumePdf } from '../pdf/useResumePdf'
import { Field, ItemList } from './Fields'
import styles from './editor.module.css'

const PdfPreview = lazy(() => import('../pdf/PdfPreview').catch(() => ({
  default: () => <p role="status">Não foi possível abrir a prévia. Você ainda pode baixar o PDF.</p>,
})))
const initialDraft: Draft = { resume: blankResume(), template: 'classico' }
const storageMessages = {
  empty: 'O rascunho fica neste navegador e pode ser apagado ao limpar seus dados.',
  saved: 'Rascunho salvo neste navegador. Ele pode ser apagado ao limpar os dados do navegador.',
  unavailable: 'O navegador não conseguiu salvar o rascunho. Baixe o PDF antes de fechar.',
  invalid: 'Não foi possível recuperar o rascunho anterior.',
  unsupported: 'Este rascunho foi salvo em outra versão. Limpe o rascunho para salvar novamente.',
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className={styles.section} aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    {children}
  </section>
}

export default function Editor() {
  const [saved] = useState(() => readDraft(browserStorage))
  const initial = saved.status === 'saved' ? saved.draft : initialDraft
  const methods = useForm<Resume>({ defaultValues: initial.resume })
  const { control, getValues, reset, setError, clearErrors, setFocus } = methods
  const edited = useWatch({ control }) as Resume
  const [template, setTemplate] = useState(initial.template)
  const [storage, setStorage] = useState(saved.status)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const compact = useMediaQuery('(max-width: 760px)', window.innerWidth <= 760, { getInitialValueInEffect: false })
  const [confirm, setConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')
  const lastStored = useRef(JSON.stringify(initial))
  const { document: pdf, request, clear, error } = useResumePdf()

  useEffect(() => {
    const next = { resume: edited, template }
    const serialized = JSON.stringify(next)
    if (lastStored.current === serialized) return
    lastStored.current = serialized
    if (writeDraft(browserStorage, next)) setStorage('saved')
    else setStorage((status) => status === 'unsupported' ? status : 'unavailable')
  }, [edited, template])

  const hasContent = JSON.stringify(edited) !== JSON.stringify(initialDraft.resume)
  useEffect(() => {
    if (!hasContent) {
      clear()
      return
    }
    const timer = window.setTimeout(() => { void request(edited, template).catch(() => undefined) }, 300)
    return () => window.clearTimeout(timer)
  }, [edited, template, hasContent, request, clear])

  async function download() {
    clearErrors()
    setNotice('')
    const resume = structuredClone(getValues())
    const errors = Object.entries(validateExport(resume))
    if (errors.length) {
      for (const [name, message] of errors) setError(name as FieldPath<Resume>, { message })
      setMobileView('edit')
      setNotice('Revise os campos indicados para baixar o PDF.')
      requestAnimationFrame(() => setFocus(errors[0][0] as FieldPath<Resume>))
      return
    }

    setExporting(true)
    try {
      const file = await request(resume, template)
      if (JSON.stringify(resume) !== JSON.stringify(getValues())) {
        setNotice('O currículo foi alterado. Selecione Baixar PDF novamente.')
        return
      }
      const link = window.document.createElement('a')
      const name = resume.personal.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 70)
      link.href = file.url
      link.download = 'curriculo-' + name + '.pdf'
      window.document.body.append(link)
      link.click()
      link.remove()
    } catch {
      setNotice('Não foi possível baixar o PDF. Selecione Baixar PDF para tentar novamente.')
    } finally {
      setExporting(false)
    }
  }

  function restart() {
    lastStored.current = JSON.stringify(initialDraft)
    clear()
    reset(blankResume())
    setTemplate(initialDraft.template)
    setStorage(clearDraft(browserStorage) ? 'empty' : 'unavailable')
    setNotice('')
    setMobileView('edit')
    setConfirm(false)
  }

  return <div className={styles.shell}>
    <a className="skip-link" href="#editor-main">Ir para o editor</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">C</span><span>Currículo em Dia</span>
        </a>
        <Button variant="outline" color="verde" type="button" onClick={() => setConfirm(true)} disabled={exporting}>Limpar dados</Button>
      </div>
    </header>
    <main id="editor-main" className={styles.main} tabIndex={-1}>
      <div className={styles.intro}>
        <div><h1>Monte seu currículo</h1><p className={styles.storage} role="status">{storageMessages[storage]}</p></div>
        <Button size="md" type="button" loading={exporting} onClick={() => void download()}>Baixar PDF</Button>
      </div>
      {notice && <p className={styles.notice} role="alert">{notice}</p>}
      <div className={styles.mobileSwitch} role="group" aria-label="Visualização do editor">
        <button aria-pressed={mobileView === 'edit'} type="button" onClick={() => setMobileView('edit')}>Editar</button>
        <button aria-pressed={mobileView === 'preview'} type="button" onClick={() => setMobileView('preview')}>Prévia</button>
      </div>
      <div className={styles.grid}>
        <FormProvider {...methods}>
          <form className={styles.form} data-mobile-hidden={mobileView !== 'edit'} noValidate
            onSubmit={(event) => { event.preventDefault() }}>
            <Section id="pessoal" title="Dados pessoais e contato">
              <p className={styles.hint}>Informe seu nome. Os demais campos são opcionais.</p>
              <div className={styles.fields}>
                <div className={styles.full}><Field name="personal.name" label="Nome completo" autoComplete="name" /></div>
                <Field name="personal.email" label="E-mail" type="email" autoComplete="email" />
                <Field name="personal.phone" label="Telefone" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" />
                <Field name="personal.city" label="Cidade e estado" placeholder="Ex.: Cuiabá, MT" />
                <Field name="personal.link" label="LinkedIn ou portfólio" type="url" placeholder="https://…" />
              </div>
            </Section>
            <Section id="resumo" title="Objetivo ou resumo profissional">
              <Field name="summary" label="Objetivo ou resumo profissional" multiline placeholder="Conte que tipo de vaga procura ou resuma sua experiência." />
            </Section>
            <Section id="experiencia" title="Experiência profissional"><ItemList name="experiences" /></Section>
            <Section id="formacao" title="Formação acadêmica"><ItemList name="education" /></Section>
            <Section id="cursos" title="Cursos e certificações"><ItemList name="certificates" /></Section>
            <Section id="habilidades" title="Competências e habilidades"><ItemList name="skills" /></Section>
            <Section id="idiomas" title="Idiomas"><ItemList name="languages" /></Section>
            <Section id="adicionais" title="Informações adicionais">
              <Field name="additional" label="Informações adicionais" multiline placeholder="Ex.: disponibilidade para trabalhar à tarde." />
            </Section>
          </form>
        </FormProvider>
        <section className={styles.preview} aria-labelledby="preview-heading" data-mobile-hidden={mobileView !== 'preview'}>
          <div className={styles.previewTop}>
            <h2 id="preview-heading">Prévia do currículo</h2>
            <NativeSelect label="Modelo" value={template} disabled={exporting}
              data={Object.entries(templates).map(([value, label]) => ({ value, label }))}
              onChange={(event) => setTemplate(event.currentTarget.value as Template)} />
          </div>
          <div className={styles.previewBody} data-testid="pdf-preview" data-pdf-url={pdf?.url}>
            {compact && mobileView === 'edit' ? null
              : error ? <p role="status">Não foi possível gerar a prévia. Edite um campo ou tente baixar o PDF.</p>
              : pdf ? <Suspense fallback={<p role="status">Carregando prévia…</p>}><PdfPreview url={pdf.url} /></Suspense>
              : <div className={styles.empty}>
                <span aria-hidden="true" className="brand-mark">C</span>
                <p>{hasContent ? 'Preparando prévia…' : 'Preencha seus dados para ver o currículo.'}</p>
              </div>}
          </div>
        </section>
      </div>
    </main>
    <Modal opened={confirm} onClose={() => setConfirm(false)} title="Limpar o rascunho?" centered
      closeButtonProps={{ 'aria-label': 'Fechar' }}>
      <p>Os dados preenchidos neste navegador serão apagados.</p>
      <div className={styles.modalActions}>
        <Button variant="default" onClick={() => setConfirm(false)} data-autofocus>Cancelar</Button>
        <Button color="red" onClick={restart}>Limpar e começar outro</Button>
      </div>
    </Modal>
  </div>
}
