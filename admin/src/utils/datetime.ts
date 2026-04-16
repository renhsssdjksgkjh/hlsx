/** 东八区（中国）展示的日期时间 `YYYY-MM-DD HH:mm:ss` */
export function formatChinaDateTime(input: string | null | undefined): string {
  if (input == null || String(input).trim() === '') return '—'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const v = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${v('year')}-${v('month')}-${v('day')} ${v('hour')}:${v('minute')}:${v('second')}`
}
