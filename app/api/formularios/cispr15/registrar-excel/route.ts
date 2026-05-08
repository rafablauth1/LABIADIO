import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const EXCEL_PATH = path.normalize('C:/Users/Notla/OneDrive/Área de Trabalho/Compatibilidade eletromagnética_2026.xlsx')

function toExcelSerial(date: Date): number {
  return date.getTime() / 86400000 + 25569
}

function readWorkbook() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Planilha não encontrada: ${EXCEL_PATH}`)
  }
  // Read via buffer to avoid xlsx's internal path handling on Windows Unicode paths
  const buf = fs.readFileSync(EXCEL_PATH)
  return XLSX.read(buf, { type: 'buffer' })
}

async function writeWorkbook(wb: XLSX.WorkBook): Promise<void> {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  // Retry up to 4 times for transient locks (OneDrive sync, antivirus)
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      fs.writeFileSync(EXCEL_PATH, buf)
      return
    } catch (err: any) {
      lastErr = err
      if (attempt < 4) await new Promise(r => setTimeout(r, 400 * attempt))
    }
  }
  throw lastErr
}

function findNextEmptyRow(rows: any[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'EMC' && rows[i][4] === '' && rows[i][5] === '' && rows[i][6] === '') {
      return i
    }
  }
  return -1
}

export async function GET() {
  try {
    const wb = readWorkbook()
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    const idx = findNextEmptyRow(rows)
    if (idx === -1) return NextResponse.json({ error: 'Sem linhas disponíveis' }, { status: 400 })
    const num = parseInt(String(rows[idx][2]), 10)
    const year = new Date().getFullYear()
    return NextResponse.json({ proximoNumero: num, relatorio: `EMC ${num}/${year}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cliente = '', produto = '', protocolo = '', orcamento = '', responsavel = '' } = await request.json()
    const wb = readWorkbook()
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
    const idx = findNextEmptyRow(rows)
    if (idx === -1) return NextResponse.json({ error: 'Sem linhas disponíveis na planilha' }, { status: 400 })

    const num = parseInt(String(rows[idx][2]), 10)
    const row1 = idx + 1
    const orcNum = Number(orcamento)

    const updates: [string, any, XLSX.ExcelDataType][] = [
      [`E${row1}`, cliente,                               's'],
      [`F${row1}`, produto,                               's'],
      [`G${row1}`, protocolo,                             's'],
      [`H${row1}`, isNaN(orcNum) ? orcamento : orcNum,   isNaN(orcNum) ? 's' : 'n'],
      [`I${row1}`, toExcelSerial(new Date()),             'n'],
      [`J${row1}`, responsavel,                           's'],
    ]

    for (const [ref, value, type] of updates) {
      const existing = ws[ref] ?? {}
      ws[ref] = { ...existing, v: value, t: type, w: undefined }
    }
    const dateCell = ws[`I${row1}`]
    if (dateCell && !dateCell.z) dateCell.z = 'dd/mm/yyyy hh:mm'

    await writeWorkbook(wb)

    const year = new Date().getFullYear()
    return NextResponse.json({ numero: num, numRelatorio: `EMC ${num}/${year}` })
  } catch (err: any) {
    const msg = err.message ?? String(err)
    const hint = msg.includes('EBUSY') || msg.includes('lock') ||
      msg.includes('EPERM') || msg.includes('EACCES') || msg.includes('ENOENT')
      ? ' — verifique se a planilha está fechada e tente novamente'
      : ''
    return NextResponse.json({ error: msg + hint }, { status: 500 })
  }
}
