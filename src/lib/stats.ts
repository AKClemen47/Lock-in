import { addDays, dayKeyOf, periodRange, type Period } from './time'

export interface SessionLike {
  start: number
  durationMs: number
  completed: boolean
  projectId: string | null
}

export const NO_PROJECT = 'none'

/** Focused milliseconds per day key. */
export function totalsByDay(sessions: SessionLike[], startHour: number): Map<string, number> {
  const out = new Map<string, number>()
  for (const s of sessions) {
    const k = dayKeyOf(s.start, startHour)
    out.set(k, (out.get(k) ?? 0) + s.durationMs)
  }
  return out
}

/**
 * Current and best streak of days with at least `thresholdMs` of focus.
 * An unfinished today does not break the current streak.
 */
export function streaks(totals: Map<string, number>, thresholdMs: number, today: string): { current: number; best: number } {
  const ok = (k: string) => (totals.get(k) ?? 0) >= thresholdMs
  let current = 0
  let k = ok(today) ? today : addDays(today, -1)
  while (ok(k)) {
    current++
    k = addDays(k, -1)
  }
  let best = 0
  for (const day of [...totals.keys()].filter(ok)) {
    if (ok(addDays(day, -1))) continue // not the start of a run
    let len = 0
    let d = day
    while (ok(d)) {
      len++
      d = addDays(d, 1)
    }
    best = Math.max(best, len)
  }
  return { current, best: Math.max(best, current) }
}

export interface Buckets {
  labels: string[]
  /** projectId (or NO_PROJECT) → focused ms per bucket */
  series: Map<string, number[]>
}

/** Split sessions of a period into hour buckets (day view) or day buckets (week/month views). */
export function bucketize(sessions: SessionLike[], period: Period, anchor: string, startHour: number): Buckets {
  const { from, days } = periodRange(period, anchor)
  const hourly = period === 'day'
  const size = hourly ? 24 : days
  const labels = hourly
    ? Array.from({ length: 24 }, (_, i) => `${(i + startHour) % 24}h`)
    : Array.from({ length: days }, (_, i) => {
        const k = addDays(from, i)
        return period === 'week'
          ? new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(k + 'T12:00'))
          : String(Number(k.slice(8)))
      })
  const index = new Map(Array.from({ length: days }, (_, i) => [addDays(from, i), i]))
  const series = new Map<string, number[]>()
  for (const s of sessions) {
    const day = index.get(dayKeyOf(s.start, startHour))
    if (day === undefined) continue
    const i = hourly ? (new Date(s.start).getHours() - startHour + 24) % 24 : day
    const key = s.projectId ?? NO_PROJECT
    if (!series.has(key)) series.set(key, new Array(size).fill(0))
    series.get(key)![i] += s.durationMs
  }
  return { labels, series }
}

export function byProject(sessions: SessionLike[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const s of sessions) {
    const k = s.projectId ?? NO_PROJECT
    out.set(k, (out.get(k) ?? 0) + s.durationMs)
  }
  return out
}

/** Estimated time to finish `pomodoros` sessions, breaks included. */
export function workloadMs(pomodoros: number, d: { focus: number; short: number; long: number; longEvery: number }): number {
  if (pomodoros <= 0) return 0
  const breaks = pomodoros - 1
  const longs = Math.floor(breaks / d.longEvery)
  return (pomodoros * d.focus + (breaks - longs) * d.short + longs * d.long) * 60_000
}
