import { Button, Group, NativeSelect, Textarea, TextInput } from '@mantine/core'
import { useId } from 'react'
import { useFieldArray, useFormContext, type FieldPath } from 'react-hook-form'
import type { Resume } from '../curriculo/model'
import styles from './editor.module.css'

type FieldProps = {
  name: FieldPath<Resume>
  label: string
  type?: 'email' | 'tel' | 'url' | 'month'
  inputMode?: 'numeric'
  autoComplete?: string
  placeholder?: string
  multiline?: boolean
  options?: string[]
}

export function Field({ name, label, multiline, options, ...props }: FieldProps) {
  const { register, getFieldState, formState, clearErrors } = useFormContext<Resume>()
  const error = getFieldState(name, formState).error
  const input = {
    ...props,
    ...register(name, { onChange: () => { if (error) clearErrors(name) } }),
    label,
    withAsterisk: name === 'personal.name',
    error: error?.message,
  }
  if (multiline) return <Textarea {...input} autosize minRows={3} maxRows={10} />
  if (options) return <NativeSelect {...input} data={[{ label: 'Selecione (opcional)', value: '' }, ...options]} />
  return <TextInput {...input} />
}

type ListName = 'experiences' | 'education' | 'certificates' | 'skills' | 'languages'
type ListField = Omit<FieldProps, 'name'> & { key: string }
type ListConfig = { label: string; fields: ListField[] }

const dates: ListField[] = [
  { key: 'start', label: 'Início', type: 'month' },
  { key: 'end', label: 'Término', type: 'month' },
]

const lists: Record<ListName, ListConfig> = {
  experiences: {
    label: 'experiência',
    fields: [{ key: 'role', label: 'Cargo' }, { key: 'company', label: 'Empresa' }, ...dates,
      { key: 'description', label: 'Descrição das atividades', multiline: true }],
  },
  education: {
    label: 'formação',
    fields: [{ key: 'course', label: 'Curso ou nível de ensino' }, { key: 'school', label: 'Instituição de ensino' },
      ...dates, { key: 'description', label: 'Detalhes da formação', multiline: true }],
  },
  certificates: {
    label: 'curso ou certificação',
    fields: [{ key: 'name', label: 'Nome do curso ou certificado' },
      { key: 'institution', label: 'Instituição emissora' }, { key: 'year', label: 'Ano', inputMode: 'numeric' }],
  },
  skills: { label: 'competência', fields: [{ key: 'name', label: 'Competência', placeholder: 'Ex.: Excel' }] },
  languages: {
    label: 'idioma',
    fields: [{ key: 'name', label: 'Idioma' },
      { key: 'level', label: 'Nível', options: ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'] }],
  },
}

export function ItemList({ name }: { name: ListName }) {
  const { control, setFocus, clearErrors } = useFormContext<Resume>()
  const { fields, append, move, remove } = useFieldArray({ control, name })
  const config = lists[name]
  const id = useId()

  function focusItem(index: number) {
    if (index < 0) document.getElementById(id)?.focus()
    else requestAnimationFrame(() => setFocus((name + '.' + index + '.' + config.fields[0].key) as FieldPath<Resume>))
  }

  return <div className={styles.list}>
    {fields.map((field, index) => (
      <fieldset className={styles.item} key={field.id}>
        <legend>{config.label.charAt(0).toUpperCase() + config.label.slice(1)} {index + 1}</legend>
        <div className={styles.fields}>
          {config.fields.map(({ key, ...props }) => (
            <div key={key} className={props.multiline ? styles.full : undefined}>
              <Field {...props} name={(name + '.' + index + '.' + key) as FieldPath<Resume>} />
            </div>
          ))}
        </div>
        <Group gap={6} mt="sm">
          <Button type="button" size="compact-sm" variant="subtle" disabled={index === 0}
            aria-label={'Subir ' + config.label + ' ' + (index + 1)}
            onClick={() => { move(index, index - 1); clearErrors(name); focusItem(index - 1) }}>Subir</Button>
          <Button type="button" size="compact-sm" variant="subtle" disabled={index === fields.length - 1}
            aria-label={'Descer ' + config.label + ' ' + (index + 1)}
            onClick={() => { move(index, index + 1); clearErrors(name); focusItem(index + 1) }}>Descer</Button>
          <Button type="button" size="compact-sm" variant="subtle" color="red"
            aria-label={'Remover ' + config.label + ' ' + (index + 1)}
            onClick={() => { remove(index); clearErrors(name); focusItem(Math.min(index, fields.length - 2)) }}>Remover</Button>
        </Group>
      </fieldset>
    ))}
    <Button id={id} type="button" variant="light" size="sm" onClick={() => {
      const blank = Object.fromEntries(config.fields.map(({ key }) => [key, '']))
      append({ ...blank, id: crypto.randomUUID() } as Resume[ListName][number])
    }}>Adicionar {config.label}</Button>
  </div>
}
