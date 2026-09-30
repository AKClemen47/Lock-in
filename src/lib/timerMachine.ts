import { MIN } from './time'

export type Phase = 'focus' | 'short' | 'long'
export type Status = 'idle' | 'running' | 'paused'

/** Minutes, plus the number of focus sessions before a long break. */
export interface Durations {
  focus: number
  short: number
  long: number
  longEvery: number
}

export interface TimerState {
  phase: Phase
  status: Status
  /** Planned length of the current phase, extensions included. */
  durationMs: number
  /** Wall-clock end while running; the countdown is always derived from it. */
  endAt: number | null
  /** Time left while idle or paused. */
  remainingMs: number
  /** Running time accumulated before `runStartedAt`. */
  elapsedMs: number
  runStartedAt: number | null
  /** First start of this phase. */
  startedAt: number | null
  /** Focus sessions completed in the current cycle. */
  cycle: number
  taskId: string | null
}

export const phaseMs = (phase: Phase, d: Durations) =>
  (phase === 'focus' ? d.focus : phase === 'short' ? d.short : d.long) * MIN

function fresh(phase: Phase, d: Durations, cycle: number, taskId: string | null): TimerState {
  const ms = phaseMs(phase, d)
  return {
    phase,
    status: 'idle',
    durationMs: ms,
    endAt: null,
    remainingMs: ms,
    elapsedMs: 0,
    runStartedAt: null,
    startedAt: null,
    cycle,
    taskId,
  }
}

export const initialTimer = (d: Durations) => fresh('focus', d, 0, null)

export const remaining = (s: TimerState, now: number) =>
  s.status === 'running' && s.endAt !== null ? Math.max(0, s.endAt - now) : s.remainingMs

/** Time actually spent running in this phase, never more than planned. */
export function elapsed(s: TimerState, now: number): number {
  const run = s.status === 'running' && s.runStartedAt !== null ? now - s.runStartedAt : 0
  return Math.min(s.durationMs, s.elapsedMs + Math.max(0, run))
}

export const progress = (s: TimerState, now: number) =>
  s.durationMs > 0 ? 1 - remaining(s, now) / s.durationMs : 0

export function start(s: TimerState, now: number): TimerState {
  if (s.status === 'running') return s
  return {
    ...s,
    status: 'running',
    endAt: now + s.remainingMs,
    runStartedAt: now,
    startedAt: s.startedAt ?? now,
  }
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s
  return {
    ...s,
    status: 'paused',
    remainingMs: remaining(s, now),
    elapsedMs: elapsed(s, now),
    endAt: null,
    runStartedAt: null,
  }
}

export function extend(s: TimerState, ms: number): TimerState {
  return {
    ...s,
    durationMs: s.durationMs + ms,
    endAt: s.endAt === null ? null : s.endAt + ms,
    remainingMs: s.status === 'running' ? s.remainingMs : s.remainingMs + ms,
  }
}

/** Phase that follows the current one; `completed` is false when a focus session is skipped. */
export function nextPhase(s: TimerState, d: Durations, completed: boolean): { phase: Phase; cycle: number } {
  if (s.phase !== 'focus') return { phase: 'focus', cycle: s.phase === 'long' ? 0 : s.cycle }
  const cycle = completed ? s.cycle + 1 : s.cycle
  return { phase: completed && cycle >= d.longEvery ? 'long' : 'short', cycle }
}

/** Move to the next phase, idle. */
export function advance(s: TimerState, d: Durations, completed: boolean): TimerState {
  const next = nextPhase(s, d, completed)
  return fresh(next.phase, d, next.cycle, s.taskId)
}

/** Abandon the current phase: same phase, full length, idle. */
export const reset = (s: TimerState, d: Durations) => fresh(s.phase, d, s.cycle, s.taskId)

/** Switch to a given phase (manual choice), idle. */
export const goTo = (s: TimerState, d: Durations, phase: Phase) => fresh(phase, d, s.cycle, s.taskId)

/** Apply new durations to an untouched idle timer. */
export function syncDurations(s: TimerState, d: Durations): TimerState {
  if (s.status !== 'idle' || s.startedAt !== null) return s
  const ms = phaseMs(s.phase, d)
  return ms === s.durationMs ? s : { ...s, durationMs: ms, remainingMs: ms }
}
