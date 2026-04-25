/**
 * Definição dos laboratórios e extração de lab a partir da TAG.
 * Padrão: TAG = número + sufixo do lab (ex: 1528EMC, 1500TEL)
 */

export interface Lab {
  code: string   // sufixo na TAG (ex: EMC)
  name: string   // nome interno (ex: LABEMC)
  color: string  // cor hex para UI
  bg: string     // bg tailwind inline
  border: string
}

export const LABS: Lab[] = [
  { code: 'EMC',  name: 'LABEMC',  color: '#E8B94B', bg: 'rgba(232,185,75,0.10)',  border: 'rgba(232,185,75,0.22)' },
  { code: 'DOM',  name: 'DOM',     color: '#22D3C8', bg: 'rgba(34,211,200,0.10)',  border: 'rgba(34,211,200,0.20)' },
  { code: 'AIF',  name: 'LAIF',   color: '#4F8EF7', bg: 'rgba(79,142,247,0.10)',  border: 'rgba(79,142,247,0.20)' },
  { code: 'TEL',  name: 'CALTEL', color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.20)' },
  { code: 'LUM',  name: 'LMLUM',  color: '#F472B6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.20)' },
]

export const LAB_MAP = Object.fromEntries(LABS.map(l => [l.code, l]))

/** Extrai o sufixo de letras no final de uma TAG. Ex: "1528EMC" → "EMC" */
export function getLabCode(tag: string): string {
  const m = tag.match(/([A-Za-z]+)$/)
  return m ? m[1].toUpperCase() : ''
}

/** Retorna o Lab correspondente à TAG, ou null se não reconhecido. */
export function getLabFromTag(tag: string): Lab | null {
  return LAB_MAP[getLabCode(tag)] ?? null
}

/** Retorna nome amigável do lab dado o código. */
export function labName(code: string): string {
  return LAB_MAP[code]?.name ?? code
}
