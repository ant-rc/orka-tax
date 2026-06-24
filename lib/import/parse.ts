import { parse as parseCsv } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseFile(buffer: Buffer, type: 'csv' | 'xlsx'): ParsedFile {
  if (type === 'csv') {
    const records = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
    const headers = records.length ? Object.keys(records[0]) : []
    return { headers, rows: records }
  }
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
  const headers = rows.length ? Object.keys(rows[0]) : []
  return { headers, rows }
}
