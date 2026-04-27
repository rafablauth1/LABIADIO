// ════════════════════════════════════════════════════════════════
//  LABIADIO — Planilhas de Checagem por Norma
//  Migrado do TAG_SHEETS do HTML legado para TypeScript tipado
// ════════════════════════════════════════════════════════════════

export interface CheckItem {
  p: string        // descrição do parâmetro
  unit?: string    // unidade de medida
  nom?: number     // valor nominal
  li?: number      // limite inferior
  ls?: number      // limite superior
  q?: boolean      // é linha de referência (não editável)
  ref?: string     // valor de referência textual
}

export interface CheckGroup {
  n: string        // nome do grupo
  its: CheckItem[] // itens do grupo
}

export interface CheckSheet {
  norma:  string       // ex: "IEC 61000-4-2"
  ref?:   string       // referência normativa textual
  grupos: CheckGroup[] // grupos de verificação
}

// ─── Normas disponíveis ─────────────────────────────────────────
export type NormaKey =
  | 'IEC_61000_4_2'
  | 'IEC_61000_4_3'
  | 'IEC_61000_4_4'
  | 'IEC_61000_4_5'
  | 'IEC_61000_4_6'
  | 'IEC_61000_4_8'
  | 'IEC_61000_4_11'
  | 'IEC_61000_4_34'
  | 'CISPR_16_1_1'
  | 'CISPR_16_4_2'

// ─── Mapeamento TAG → Norma ──────────────────────────────────────
// Cada TAG de equipamento é associada a uma ou mais normas
export const TAG_NORMA: Record<string, NormaKey[]> = {
  // Geradores ESD (IEC 61000-4-2)
  '1528EMC': ['IEC_61000_4_2'],
  '3055EMC': ['IEC_61000_4_2'],
  // Geradores EFT/Burst (IEC 61000-4-4)
  '1196EMC': ['IEC_61000_4_4'],
  '1429EMC': ['IEC_61000_4_4'],
  // Geradores Surge (IEC 61000-4-5)
  '1907EMC': ['IEC_61000_4_5'],
  // CDN / Conduzido (IEC 61000-4-6)
  '3018EMC': ['IEC_61000_4_6'],
  '3019EMC': ['IEC_61000_4_6'],
}

// ─── Planilhas por norma ─────────────────────────────────────────

export const SHEETS: Record<NormaKey, CheckSheet> = {

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_2: {
    norma: 'IEC 61000-4-2',
    ref: 'IEC 61000-4-2:2008 — §6.2 Verification of ESD generators\n' +
         'Verificações periódicas conforme §7.1. Desvio máximo permitido: ±10%\n' +
         'Grandeza: Tensão de pico de saída (Vp) — unidade kV',
    grupos: [
      {
        n: 'VERIFICAÇÃO TENSÃO DE PICO — CONTATO',
        its: [
          { p: '2 kV — Contato direto', unit: 'Vp', nom: 2.0, li: 1.8, ls: 2.2 },
          { p: '4 kV — Contato direto', unit: 'Vp', nom: 4.0, li: 3.6, ls: 4.4 },
          { p: '6 kV — Contato direto', unit: 'Vp', nom: 6.0, li: 5.4, ls: 6.6 },
          { p: '8 kV — Contato direto', unit: 'Vp', nom: 8.0, li: 7.2, ls: 8.8 },
        ],
      },
      {
        n: 'VERIFICAÇÃO TENSÃO DE PICO — AR',
        its: [
          { p: '2 kV — Descarga por ar', unit: 'Vp', nom: 2.0, li: 1.8, ls: 2.2 },
          { p: '4 kV — Descarga por ar', unit: 'Vp', nom: 4.0, li: 3.6, ls: 4.4 },
          { p: '8 kV — Descarga por ar', unit: 'Vp', nom: 8.0, li: 7.2, ls: 8.8 },
          { p: '15 kV — Descarga por ar', unit: 'Vp', nom: 15.0, li: 13.5, ls: 16.5 },
        ],
      },
      {
        n: 'VERIFICAÇÃO TEMPO DE SUBIDA',
        its: [
          { p: 'Tempo de subida (tr) — 8 kV contato', unit: 'ns', nom: 0.8, li: 0.5, ls: 1.0 },
          { p: 'Tempo até 50% (th) — 8 kV contato',  unit: 'ns', nom: 30,  li: 20,  ls: 40 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_4: {
    norma: 'IEC 61000-4-4',
    ref: 'IEC 61000-4-4:2012 — §8 Test equipment\n' +
         'Verificação da tensão de pico e tempo de repetição de pulso.\n' +
         'Desvio máximo: ±10% tensão, tempo de subida 5 ns ± 30%',
    grupos: [
      {
        n: 'VERIFICAÇÃO TENSÃO DE PICO — LINHA DE ENERGIA',
        its: [
          { p: '0.5 kV — Fase/Neutro (L/N)',   unit: 'Vp', nom: 0.5, li: 0.45, ls: 0.55 },
          { p: '1 kV — Fase/Neutro (L/N)',     unit: 'Vp', nom: 1.0, li: 0.9,  ls: 1.1 },
          { p: '2 kV — Fase/Neutro (L/N)',     unit: 'Vp', nom: 2.0, li: 1.8,  ls: 2.2 },
          { p: '4 kV — Fase/Neutro (L/N)',     unit: 'Vp', nom: 4.0, li: 3.6,  ls: 4.4 },
        ],
      },
      {
        n: 'VERIFICAÇÃO TENSÃO DE PICO — LINHA DE SINAL',
        its: [
          { p: '0.25 kV — Linha de sinal',     unit: 'Vp', nom: 0.25, li: 0.225, ls: 0.275 },
          { p: '0.5 kV — Linha de sinal',      unit: 'Vp', nom: 0.5,  li: 0.45,  ls: 0.55 },
          { p: '1 kV — Linha de sinal',        unit: 'Vp', nom: 1.0,  li: 0.9,   ls: 1.1 },
          { p: '2 kV — Linha de sinal',        unit: 'Vp', nom: 2.0,  li: 1.8,   ls: 2.2 },
        ],
      },
      {
        n: 'VERIFICAÇÃO TEMPO E FREQUÊNCIA',
        its: [
          { p: 'Tempo de subida (tr)',          unit: 'ns', nom: 5, li: 3.5, ls: 6.5 },
          { p: 'Frequência de repetição — 5 kHz',  unit: 'kHz', nom: 5, li: 4.5, ls: 5.5 },
          { p: 'Frequência de repetição — 100 kHz', unit: 'kHz', nom: 100, li: 90, ls: 110 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_5: {
    norma: 'IEC 61000-4-5',
    ref: 'IEC 61000-4-5:2014 — §8 Test equipment\n' +
         'Verificação da forma de onda 1.2/50 µs (tensão) e 8/20 µs (corrente).\n' +
         'Desvio máximo: ±10% amplitude',
    grupos: [
      {
        n: 'VERIFICAÇÃO TENSÃO — MODO COMUM (L-N / PE)',
        its: [
          { p: '0.5 kV — Modo comum',  unit: 'kVp', nom: 0.5, li: 0.45, ls: 0.55 },
          { p: '1 kV — Modo comum',    unit: 'kVp', nom: 1.0, li: 0.9,  ls: 1.1 },
          { p: '2 kV — Modo comum',    unit: 'kVp', nom: 2.0, li: 1.8,  ls: 2.2 },
          { p: '4 kV — Modo comum',    unit: 'kVp', nom: 4.0, li: 3.6,  ls: 4.4 },
        ],
      },
      {
        n: 'VERIFICAÇÃO TENSÃO — MODO DIFERENCIAL (L/N)',
        its: [
          { p: '0.5 kV — Modo diferencial', unit: 'kVp', nom: 0.5, li: 0.45, ls: 0.55 },
          { p: '1 kV — Modo diferencial',   unit: 'kVp', nom: 1.0, li: 0.9,  ls: 1.1 },
          { p: '2 kV — Modo diferencial',   unit: 'kVp', nom: 2.0, li: 1.8,  ls: 2.2 },
        ],
      },
      {
        n: 'VERIFICAÇÃO FORMA DE ONDA',
        its: [
          { p: 'Tempo de frente (T1)',   unit: 'µs', nom: 1.2, li: 1.0, ls: 1.5 },
          { p: 'Tempo à meia onda (T2)', unit: 'µs', nom: 50,  li: 40,  ls: 60 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_6: {
    norma: 'IEC 61000-4-6',
    ref: 'IEC 61000-4-6:2013 — §8 Test equipment and setup\n' +
         'Verificação da tensão de saída do gerador de RF conduzido.\n' +
         'Desvio máximo: ±1 dB (EMF)',
    grupos: [
      {
        n: 'VERIFICAÇÃO TENSÃO EMF — 150 kHz a 80 MHz',
        its: [
          { p: '1 Vrms — 0.15 MHz',    unit: 'dBµV', nom: 120, li: 117, ls: 123 },
          { p: '1 Vrms — 1 MHz',       unit: 'dBµV', nom: 120, li: 117, ls: 123 },
          { p: '1 Vrms — 10 MHz',      unit: 'dBµV', nom: 120, li: 117, ls: 123 },
          { p: '1 Vrms — 80 MHz',      unit: 'dBµV', nom: 120, li: 117, ls: 123 },
          { p: '3 Vrms — 0.15 MHz',    unit: 'dBµV', nom: 129.5, li: 126.5, ls: 132.5 },
          { p: '3 Vrms — 80 MHz',      unit: 'dBµV', nom: 129.5, li: 126.5, ls: 132.5 },
          { p: '10 Vrms — 0.15 MHz',   unit: 'dBµV', nom: 140, li: 137, ls: 143 },
          { p: '10 Vrms — 80 MHz',     unit: 'dBµV', nom: 140, li: 137, ls: 143 },
        ],
      },
      {
        n: 'VERIFICAÇÃO IMPEDÂNCIA DE SAÍDA',
        its: [
          { p: 'Impedância de saída (150 Ω ±20%)', unit: 'Ω', nom: 150, li: 120, ls: 180 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_3: {
    norma: 'IEC 61000-4-3',
    ref: 'IEC 61000-4-3:2020 — §8 Test setup\n' +
         'Verificação do nível de campo irradiado. Desvio máximo: ±3 dB',
    grupos: [
      {
        n: 'VERIFICAÇÃO NÍVEL DE CAMPO — 80 MHz a 1 GHz',
        its: [
          { p: '1 V/m — 80 MHz',    unit: 'V/m', nom: 1, li: 0.71, ls: 1.41 },
          { p: '3 V/m — 80 MHz',    unit: 'V/m', nom: 3, li: 2.12, ls: 4.24 },
          { p: '10 V/m — 80 MHz',   unit: 'V/m', nom: 10, li: 7.08, ls: 14.1 },
          { p: '1 V/m — 1 GHz',     unit: 'V/m', nom: 1, li: 0.71, ls: 1.41 },
          { p: '3 V/m — 1 GHz',     unit: 'V/m', nom: 3, li: 2.12, ls: 4.24 },
          { p: '10 V/m — 1 GHz',    unit: 'V/m', nom: 10, li: 7.08, ls: 14.1 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_8: {
    norma: 'IEC 61000-4-8',
    ref: 'IEC 61000-4-8:2009 — §7 Test equipment\n' +
         'Verificação do nível de campo magnético. Desvio máximo: ±3 dB',
    grupos: [
      {
        n: 'VERIFICAÇÃO CAMPO MAGNÉTICO (50 Hz)',
        its: [
          { p: '1 A/m',   unit: 'A/m', nom: 1,   li: 0.71, ls: 1.41 },
          { p: '3 A/m',   unit: 'A/m', nom: 3,   li: 2.12, ls: 4.24 },
          { p: '10 A/m',  unit: 'A/m', nom: 10,  li: 7.08, ls: 14.1 },
          { p: '30 A/m',  unit: 'A/m', nom: 30,  li: 21.2, ls: 42.4 },
          { p: '100 A/m', unit: 'A/m', nom: 100, li: 70.8, ls: 141 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_11: {
    norma: 'IEC 61000-4-11',
    ref: 'IEC 61000-4-11:2020 — §7.1 EUT supply voltage characteristics\n' +
         'Verificação dos níveis de tensão de referência e duração dos dips.\n' +
         'Desvio máximo tensão: ±2% Uref',
    grupos: [
      {
        n: 'VERIFICAÇÃO NÍVEIS — 127 V (SEM CARGA)',
        its: [
          { p: '127V — Dip 0% → 0 Vref (100% dip)',         unit: 'Vref', nom: 0,    li: -2.54,  ls: 2.54 },
          { p: '127V — Dip 40% → 76.2 Vref (60% dip)',      unit: 'Vref', nom: 76.2, li: 73.66,  ls: 78.74 },
          { p: '127V — Dip 70% → 38.1 Vref (70% dip)',      unit: 'Vref', nom: 38.1, li: 35.56,  ls: 40.64 },
          { p: '127V — Dip 80% → 25.4 Vref (80% dip)',      unit: 'Vref', nom: 25.4, li: 22.86,  ls: 27.94 },
          { p: '127V — Tensão nominal Uref',                 unit: 'V',    nom: 127,  li: 124.46, ls: 129.54 },
        ],
      },
      {
        n: 'VERIFICAÇÃO NÍVEIS — 220 V (SEM CARGA)',
        its: [
          { p: '220V — Dip 0% → 0 Vref (100% dip)',         unit: 'Vref', nom: 0,   li: -4.4,  ls: 4.4 },
          { p: '220V — Dip 40% → 132 Vref (60% dip)',       unit: 'Vref', nom: 132, li: 127.6, ls: 136.4 },
          { p: '220V — Dip 70% → 66 Vref (70% dip)',        unit: 'Vref', nom: 66,  li: 61.6,  ls: 70.4 },
          { p: '220V — Dip 80% → 44 Vref (80% dip)',        unit: 'Vref', nom: 44,  li: 39.6,  ls: 48.4 },
          { p: '220V — Tensão nominal Uref',                 unit: 'V',    nom: 220, li: 215.6, ls: 224.4 },
        ],
      },
      {
        n: 'VERIFICAÇÃO DURAÇÃO DOS DIPS (PERÍODOS)',
        its: [
          { p: 'Duração 0.5 período (10 ms)',   unit: 'ms', nom: 10,  li: 9,    ls: 11 },
          { p: 'Duração 1 período (20 ms)',     unit: 'ms', nom: 20,  li: 18,   ls: 22 },
          { p: 'Duração 5 períodos (100 ms)',   unit: 'ms', nom: 100, li: 90,   ls: 110 },
          { p: 'Duração 10 períodos (200 ms)',  unit: 'ms', nom: 200, li: 180,  ls: 220 },
          { p: 'Duração 25 períodos (500 ms)',  unit: 'ms', nom: 500, li: 450,  ls: 550 },
          { p: 'Duração 50 períodos (1000 ms)', unit: 'ms', nom: 1000, li: 900, ls: 1100 },
          { p: 'Interrupção 250 períodos (5 s)','unit': 'ms', nom: 5000, li: 4500, ls: 5500 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  IEC_61000_4_34: {
    norma: 'IEC 61000-4-34',
    ref: 'IEC 61000-4-34:2005 — Para equipamentos com corrente de entrada > 16A\n' +
         'Desvio máximo tensão: ±2% Uref',
    grupos: [
      {
        n: 'VERIFICAÇÃO TRIFÁSICO — 220/380 V',
        its: [
          { p: '380V — Dip 0%',     unit: 'Vref', nom: 0,   li: -7.6, ls: 7.6 },
          { p: '380V — Dip 40%',    unit: 'Vref', nom: 228, li: 220,  ls: 236 },
          { p: '380V — Dip 70%',    unit: 'Vref', nom: 114, li: 106,  ls: 122 },
          { p: '380V — Uref',       unit: 'V',    nom: 380, li: 372.4,ls: 387.6 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  CISPR_16_1_1: {
    norma: 'CISPR 16-1-1',
    ref: 'CISPR 16-1-1:2019 — Especificações de aparelhos de medição\n' +
         'Verificação de receptores EMI e analisadores de espectro.',
    grupos: [
      {
        n: 'VERIFICAÇÃO NÍVEL DE REFERÊNCIA',
        its: [
          { p: 'Leitura em 50 MHz — 0 dBm', unit: 'dBm', nom: 0, li: -1, ls: 1 },
          { p: 'Leitura em 1 GHz — 0 dBm',  unit: 'dBm', nom: 0, li: -1, ls: 1 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  CISPR_16_4_2: {
    norma: 'CISPR 16-4-2',
    ref: 'CISPR 16-4-2:2011 — Incerteza de medição em ensaios EMC.\n' +
         'Referência para cálculo de incerteza em medições de emissão conduzida e irradiada.',
    grupos: [
      {
        n: 'VERIFICAÇÃO INCERTEZA — EMISSÃO CONDUZIDA',
        its: [
          { p: 'Incerteza expandida U (k=2) — 0.15–30 MHz', unit: 'dB', nom: 0, li: -4, ls: 4 },
        ],
      },
      {
        n: 'VERIFICAÇÃO INCERTEZA — EMISSÃO IRRADIADA',
        its: [
          { p: 'Incerteza expandida U (k=2) — 30–1000 MHz', unit: 'dB', nom: 0, li: -6, ls: 6 },
        ],
      },
    ],
  },
}

// ─── Funções utilitárias ─────────────────────────────────────────

export function getSheetByNorma(normaKey: NormaKey): CheckSheet | undefined {
  return SHEETS[normaKey]
}

export function getNormasByTag(tag: string): NormaKey[] {
  return TAG_NORMA[tag] || []
}

export function calcularDesvio(medido: number, nominal: number): number {
  return medido - nominal
}

export function calcularStatus(
  medido: number,
  li: number | undefined,
  ls: number | undefined
): 'pass' | 'fail' | 'nd' {
  if (li === undefined || ls === undefined) return 'nd'
  return medido >= li && medido <= ls ? 'pass' : 'fail'
}

export function calcularResultadoGeral(
  resultados: Array<{ status: 'pass' | 'fail' | 'nd' }>
): 'Conforme' | 'Não conforme' | 'Parcialmente conforme' {
  const fails = resultados.filter(r => r.status === 'fail').length
  const total = resultados.filter(r => r.status !== 'nd').length
  if (fails === 0) return 'Conforme'
  if (fails === total) return 'Não conforme'
  return 'Parcialmente conforme'
}
