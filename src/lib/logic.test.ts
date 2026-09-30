import { describe, expect, it } from 'vitest'
import { addDays, dayKeyOf, formatClock, formatDuration, periodRange, shiftPeriod, weekStartKey } from './time'
import * as T from './timerMachine'
import { matchProject, parseQuickAdd } from './quickAdd'
import { renderMarkdown } from './markdown'
import { bucketize, streaks, totalsByDay, workloadMs } from './stats'

const D: T.Durations = { focus: 25, short: 5, long: 15, longEvery: 4 }
const MIN = 60_000

describe('time', () => {
  it('shifts the day boundary', () => {
    const at2am = new Date(2026, 8, 29, 2, 0).getTime()
    expect(dayKeyOf(at2am, 0)).toBe('2026-09-29')
    expect(dayKeyOf(at2am, 4)).toBe('2026-09-28')
  })
  it('computes periods', () => {
    expect(weekStartKey('2026-10-04')).toBe('2026-09-28') // Sunday → Monday before
    expect(periodRange('month', '2026-02-10')).toEqual({ from: '2026-02-01', days: 28 })
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(45 * MIN)).toBe('45 min')
    expect(formatDuration(185 * MIN)).toBe('3 h 05')
    expect(formatClock(24 * MIN + 59_001)).toBe('25:00')
    expect(formatClock(0)).toBe('00:00')
  })
})

describe('timer machine', () => {
  it('runs, pauses and resumes from wall-clock time', () => {
    let s = T.start(T.initialTimer(D), 0)
    expect(T.remaining(s, 10 * MIN)).toBe(15 * MIN)
    s = T.pause(s, 10 * MIN)
    expect(T.remaining(s, 99 * MIN)).toBe(15 * MIN)
    s = T.start(s, 100 * MIN)
    expect(s.startedAt).toBe(0)
    expect(T.remaining(s, 105 * MIN)).toBe(10 * MIN)
    expect(T.elapsed(s, 105 * MIN)).toBe(15 * MIN)
    expect(T.elapsed(s, 999 * MIN)).toBe(25 * MIN) // capped at the planned length
  })
  it('extends a running phase', () => {
    const s = T.extend(T.start(T.initialTimer(D), 0), 5 * MIN)
    expect(T.remaining(s, 0)).toBe(30 * MIN)
    expect(s.durationMs).toBe(30 * MIN)
  })
  it('cycles focus → short → … → long after N sessions', () => {
    let s = T.initialTimer(D)
    const phases: string[] = []
    for (let i = 0; i < 8; i++) {
      s = T.advance(s, D, true)
      phases.push(s.phase)
    }
    expect(phases).toEqual(['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus'])
    expect(s.cycle).toBe(0)
  })
  it('does not count a skipped focus session', () => {
    const s = T.advance(T.initialTimer(D), D, false)
    expect(s.phase).toBe('short')
    expect(s.cycle).toBe(0)
  })
  it('syncs durations only while untouched', () => {
    const idle = T.syncDurations(T.initialTimer(D), { ...D, focus: 50 })
    expect(idle.remainingMs).toBe(50 * MIN)
    const paused = T.pause(T.start(T.initialTimer(D), 0), MIN)
    expect(T.syncDurations(paused, { ...D, focus: 50 })).toBe(paused)
  })
})

describe('quick add', () => {
  const today = '2026-09-29' // Tuesday
  it('parses every token', () => {
    expect(parseQuickAdd('Réviser ch.3 #Maths !1 demain 18h30 ~3', today)).toEqual({
      title: 'Réviser ch.3',
      projectName: 'Maths',
      priority: 1,
      dueDate: '2026-09-30',
      dueTime: '18:30',
      estimate: 3,
    })
  })
  it('handles weekdays, dates and multiword projects', () => {
    expect(parseQuickAdd('Fiche lundi', today).dueDate).toBe('2026-10-05')
    expect(parseQuickAdd('Fiche mardi', today).dueDate).toBe('2026-10-06')
    expect(parseQuickAdd('Partiel 15/01', today).dueDate).toBe('2027-01-15')
    expect(parseQuickAdd('Partiel 31/02', today).dueDate).toBeNull()
    expect(parseQuickAdd('Lire #Droit_civil aujourd’hui', today)).toMatchObject({ projectName: 'Droit civil', dueDate: today })
    expect(parseQuickAdd('Appel 9h', today)).toMatchObject({ dueDate: today, dueTime: '09:00', title: 'Appel' })
  })
  it('matches projects by accent-free prefix', () => {
    const projects = [{ name: 'Mathématiques' }, { name: 'Histoire' }, { name: 'Maths old', archived: true }]
    expect(matchProject('maths', projects)?.name).toBe('Mathématiques')
    expect(matchProject('hist', projects)?.name).toBe('Histoire')
    expect(matchProject('droit', projects)).toBeNull()
  })
})

describe('markdown', () => {
  it('renders the supported subset', () => {
    expect(renderMarkdown('# Titre\n- **a**\n- *b*\n\ntexte `x`')).toBe(
      '<h4>Titre</h4><ul><li><strong>a</strong></li><li><em>b</em></li></ul><p>texte <code>x</code></p>',
    )
  })
  it('escapes HTML and rejects non-http links', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)> [x](javascript:alert(1))')
    expect(out).not.toContain('<img')
    expect(out).not.toContain('href')
  })
})

describe('stats', () => {
  const at = (key: string, h: number) => new Date(`${key}T${String(h).padStart(2, '0')}:00`).getTime()
  const s = (key: string, min: number, projectId: string | null = null, h = 10) => ({
    start: at(key, h),
    durationMs: min * MIN,
    completed: true,
    projectId,
  })
  it('computes streaks without breaking on an unfinished today', () => {
    const totals = totalsByDay([s('2026-09-26', 30), s('2026-09-27', 30), s('2026-09-28', 30), s('2026-09-20', 30)], 0)
    expect(streaks(totals, 25 * MIN, '2026-09-29')).toEqual({ current: 3, best: 3 })
    expect(streaks(totals, 25 * MIN, '2026-09-30')).toEqual({ current: 0, best: 3 })
  })
  it('buckets sessions by hour and by day', () => {
    const list = [s('2026-09-29', 25, 'm', 9), s('2026-09-29', 25, 'm', 9), s('2026-09-30', 50, null, 14)]
    const day = bucketize(list, 'day', '2026-09-29', 4)
    expect(day.series.get('m')![5]).toBe(50 * MIN) // 9h with the day starting at 4h
    const week = bucketize(list, 'week', '2026-09-29', 0)
    expect(week.series.get('none')![2]).toBe(50 * MIN) // Wednesday
  })
  it('estimates workload with breaks', () => {
    expect(workloadMs(4, { focus: 25, short: 5, long: 15, longEvery: 4 })).toBe((100 + 15) * MIN)
    expect(workloadMs(5, { focus: 25, short: 5, long: 15, longEvery: 4 })).toBe((125 + 15 + 15) * MIN)
  })
})
