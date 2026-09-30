export const MIN = 60_000
export const HOUR = 3_600_000

export type Period = 'day' | 'week' | 'month'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as `YYYY-MM-DD`. */
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Day a timestamp belongs to when a "day" starts at `startHour` (4 → 02:00 still counts as the day before). */
export function dayKeyOf(ts: number, startHour = 0): string {
  const d = new Date(ts)
  d.setHours(d.getHours() - startHour)
  return toKey(d)
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Timestamp at which the given day begins. */
export function dayStart(key: string, startHour = 0): number {
  const d = fromKey(key)
  d.setHours(startHour)
  return d.getTime()
}

/** Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const d = fromKey(key)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toKey(d)
}

export function monthStartKey(key: string): string {
  const d = fromKey(key)
  return toKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)
}

/** First day and length (in days) of the period containing `anchor`. */
export function periodRange(period: Period, anchor: string): { from: string; days: number } {
  if (period === 'day') return { from: anchor, days: 1 }
  if (period === 'week') return { from: weekStartKey(anchor), days: 7 }
  const from = monthStartKey(anchor)
  const d = fromKey(from)
  return { from, days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }
}

export function shiftPeriod(period: Period, anchor: string, dir: number): string {
  if (period === 'day') return addDays(anchor, dir)
  if (period === 'week') return addDays(anchor, 7 * dir)
  const d = fromKey(monthStartKey(anchor))
  return toKey(new Date(d.getFullYear(), d.getMonth() + dir, 1))
}

/** 3h 05 · 45 min · 0 min */
export function formatDuration(ms: number): string {
  const total = Math.round(Math.max(0, ms) / MIN)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${pad(m)}`
}

/** Countdown display, rounded up so it never shows 00:00 while time remains. */
export function formatClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours()}:${pad(d.getMinutes())}`
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

export const formatDay = (key: string) => dayFmt.format(fromKey(key))

export function formatPeriod(period: Period, anchor: string): string {
  const { from, days } = periodRange(period, anchor)
  if (period === 'day') return formatDay(from)
  if (period === 'week') return `${formatDay(from)} – ${formatDay(addDays(from, days - 1))}`
  return monthFmt.format(fromKey(from))
}

/** Relative due-date label used on task rows. */
export function formatDue(key: string, today: string): string {
  const diff = daysBetween(today, key)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatDay(key)
}
