// ════════════════════════════════════════════════════
//  LABIADIO — Tipos centrais
//  Refletem exatamente as tabelas do Supabase
// ════════════════════════════════════════════════════

export type EquipStatus = 'ativo' | 'calibrar' | 'fora'

export interface Equipamento {
  id: string
  lab_id: string
  tag: string
  descricao: string
  tipo: string
  fabricante?: string
  serie?: string
  patrimonio?: string
  local?: string
  status: EquipStatus
  status_obs?: string
  normas: string[]
  cal_data?: string   // YYYY-MM-DD
  cal_val?: string    // YYYY-MM-DD
  cal_per: number     // meses
  chk_per: number     // meses
  lab_cal?: string
  ncert?: string
  obs?: string
  photo_url?: string
  created_at: string
  updated_at: string
}

export interface Certificado {
  id: string
  equip_id: string
  equip_tag?: string  // join
  numero: string
  laboratorio?: string
  emissao?: string
  acreditacao?: string
  obs?: string
  pdf_path?: string
  pdf_url?: string    // signed URL temporária
  analise_ia?: Record<string, unknown>  // campos extraídos pela IA
  created_at: string
}

export interface Checagem {
  id: string
  equip_id: string
  equip_tag?: string  // join
  norma: string
  data: string
  tecnico?: string
  temperatura?: number
  umidade?: number
  resultado: 'Conforme' | 'Não conforme' | 'Parcialmente conforme'
  medidos?: Record<string, string>  // chave: valor medido
  obs?: string
  created_at: string
}

export interface Documento {
  id: string
  lab_id: string
  tipo: 'norma' | 'manual' | 'it' | 'proc' | 'cert' | 'outro'
  nome: string
  codigo?: string
  versao?: string
  pdf_path?: string
  pdf_url?: string
  metadados?: Record<string, unknown>
  created_at: string
}

export interface AmbienteDiario {
  id: string
  lab_id: string
  data: string         // YYYY-MM-DD
  temp_max: number
  temp_min?: number
  umidade: number
  pressao?: number
  local?: string
  tecnico?: string
  obs?: string
  created_at: string
}

export interface AumentoPeriodico {
  id: string
  equip_id: string
  equip_tag?: string
  per_atual: number
  per_proposto: number
  justificativa: string
  norma_base?: string
  status: 'Em análise' | 'Aprovado' | 'Reprovado' | 'Pendente'
  pdf_path?: string
  created_at: string
}

// ── Auth / usuário ────────────────────────────────────
export type UserRole = 'admin' | 'tecnico' | 'viewer'

export interface LabUser {
  id: string
  email: string
  nome?: string
  role: UserRole
  lab_id: string
  avatar_url?: string
}

// ── Helpers ───────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
