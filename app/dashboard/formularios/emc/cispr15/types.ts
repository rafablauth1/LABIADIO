export interface Cispr15Config {
  tipo: 'lampada' | 'luminaria'
  apenasUma220: boolean
  // Cliente
  cliente: string
  clienteRua: string
  clienteCidade: string
  clienteCep: string
  // DUT
  produto: string
  fabricante: string
  modelo: string
  identificador: string
  tensaoAlim: string
  potencia: string
  frequencia: string
  // Relatório
  numRelatorio: string
  orcamento: string
  protocolo: string
  periodoInicio: string
  periodoFim: string
  dataEmissao: string
  responsavel: string
}

export function getTensoes(cfg: Cispr15Config): string[] {
  if (cfg.tipo === 'luminaria') return ['220V']
  return cfg.apenasUma220 ? ['220V'] : ['127V', '220V']
}

export const today = () => new Date().toISOString().split('T')[0]

export const DEFAULTS: Cispr15Config = {
  tipo: 'lampada', apenasUma220: false,
  cliente: '', clienteRua: '', clienteCidade: '', clienteCep: '',
  produto: '', fabricante: '', modelo: '', identificador: '',
  tensaoAlim: '', potencia: '', frequencia: '50/60Hz',
  numRelatorio: '', orcamento: '', protocolo: '',
  periodoInicio: today(), periodoFim: today(), dataEmissao: today(),
  responsavel: '',
}

// localStorage keys
export const CFG_KEY       = 'cispr15_cfg_v3'
export const PHOTOS_KEY    = 'cispr15_photos_v3'
export const DOCX_HTML_KEY = 'cispr15_docx_html_v3'
export const DOCX_NAME_KEY = 'cispr15_docx_name_v3'
