function csvEscape(s: unknown): string {
  const t = s == null ? '' : String(s)
  if (/[",\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

/** 带 BOM，便于 Excel 正确识别 UTF-8 */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const BOM = '\uFEFF'
  const line = (cells: unknown[]) => cells.map(csvEscape).join(',')
  const body = [line(headers), ...rows.map(line)].join('\r\n')
  const blob = new Blob([BOM + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
