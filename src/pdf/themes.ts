import type { Template } from '../curriculo/model'

export const themes = {
  classico: { heading: 'Baskerville', ink: '#222a31', accent: '#343f48', rule: '#aeb7bd', pad: 52, name: 26, centered: true, band: false, compact: false },
  moderno: { heading: 'Source Sans', ink: '#17343a', accent: '#086962', rule: '#8abdb5', pad: 44, name: 32, centered: false, band: false, compact: false },
  executivo: { heading: 'Baskerville', ink: '#242d40', accent: '#243b60', rule: '#b4c2d4', pad: 49, name: 27, centered: false, band: true, compact: true },
} satisfies Record<Template, {
  heading: string; ink: string; accent: string; rule: string; pad: number; name: number
  centered: boolean; band: boolean; compact: boolean
}>
