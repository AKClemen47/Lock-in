import * as M from '../../lib/timerMachine'
import type { Phase, TimerState } from '../../lib/timerMachine'
import { useTimer } from '../../store/timer'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { recordSession } from '../../lib/repo'
import { notify, requestNotifyPermission } from '../../lib/notify'
import { playChime } from '../../audio/chimes'
import { playAmbience, setDuck, stopAmbience } from '../../audio/ambience'
import { mixFor } from '../../audio/soundThemes'

export const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' }

const settings = () => useSettings.getState()
const ui = () => useUi.getState()
const timer = () => useTimer.getState()
const apply = (fn: (s: TimerState) => TimerState) => useTimer.getState().apply(fn)

// ── Ambience ────────────────────────────────────────────────────────────────

export function startAmbience() {
  const s = settings()
  playAmbience(s.soundTheme, mixFor(s.soundTheme, s.mixes))
  ui().set({ ambiencePlaying: true })
}

export function stopAmbienceNow() {
  stopAmbience()
  ui().set({ ambiencePlaying: false })
}

export const toggleAmbience = () => (ui().ambiencePlaying ? stopAmbienceNow() : startAmbience())

export const toggleMute = () => settings().set({ muted: !settings().muted })

/** Full ambience while focusing; during breaks, continue / lower / stop as configured. */
function ambienceForPhase(phase: Phase) {
  const s = settings()
  if (phase === 'focus') {
    setDuck(1)
    if (s.autoAmbience && !ui().ambiencePlaying) startAmbience()
    return
  }
  if (!ui().ambiencePlaying) return
  if (s.breakBehavior === 'lower') setDuck(0.35)
  else if (s.breakBehavior === 'stop') stopAmbienceNow()
}

// ── Focus mode ──────────────────────────────────────────────────────────────

export function enterFocusMode() {
  ui().set({ focusMode: true })
  void document.documentElement.requestFullscreen?.().catch(() => {})
}

export function exitFocusMode() {
  ui().set({ focusMode: false })
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

export const toggleFocusMode = () => (ui().focusMode ? exitFocusMode() : enterFocusMode())

// ── Timer ───────────────────────────────────────────────────────────────────

export function startTimer() {
  const t = timer()
  if (t.status === 'running') return
  const fresh = t.status === 'idle'
  apply((s) => M.start(s, Date.now()))
  if (!fresh) return
  ambienceForPhase(t.phase)
  requestNotifyPermission()
  if (t.phase === 'focus') {
    ui().set({ plant: 'none' })
    if (settings().autoFullscreen && !ui().focusMode) enterFocusMode()
  }
}

export const pauseTimer = () => apply((s) => M.pause(s, Date.now()))

export const toggleTimer = () => (timer().status === 'running' ? pauseTimer() : startTimer())

export const extendTimer = (minutes: number) => apply((s) => M.extend(s, minutes * 60_000))

export function goToPhase(phase: Phase) {
  if (timer().status === 'running') return
  apply((s) => M.goTo(s, settings().durations, phase))
}

export const setTimerTask = (taskId: string | null) => apply((s) => ({ ...s, taskId }))

/** ▶ on a task: focus on it now. */
export function startTask(taskId: string) {
  const t = timer()
  setTimerTask(taskId)
  if (t.phase !== 'focus' && t.status !== 'running') goToPhase('focus')
  if (timer().status !== 'running') startTimer()
}

function announce(text: string) {
  ui().set({ announcement: text })
}

function afterAdvance(next: TimerState) {
  const s = settings()
  const auto = next.phase === 'focus' ? s.autoStartFocus : s.autoStartBreaks
  if (auto) startTimer()
  announce(`${PHASE_LABEL[next.phase]} ${auto ? 'started' : 'ready'}.`)
}

/** Focus time below one minute is not worth a history entry. */
async function recordPartial(t: TimerState) {
  const at = Date.now()
  const ms = M.elapsed(t, at)
  if (t.startedAt !== null && ms >= 60_000)
    await recordSession({ start: t.startedAt, end: at, durationMs: ms, plannedMs: t.durationMs, completed: false, taskId: t.taskId })
}

let completing = false

/** A phase reached zero (possibly while the app was closed: `at` is then the original end time). */
export async function completePhase(at: number) {
  const t = timer()
  if (completing || t.status !== 'running') return
  completing = true
  try {
    const s = settings()
    const focus = t.phase === 'focus'
    const next = M.advance(t, s.durations, true)
    apply(() => next)
    playChime(focus ? 'focusEnd' : 'breakEnd', s.chime)
    if (focus) {
      await recordSession({
        start: t.startedAt ?? at - t.durationMs,
        end: at,
        durationMs: M.elapsed(t, at),
        plannedMs: t.durationMs,
        completed: true,
        taskId: t.taskId,
      })
      ui().set({ plant: 'grown', celebrateAt: s.celebrate ? Date.now() : 0 })
      notify('Session complete 🌱', `Well done! Time for a ${next.phase === 'long' ? 'long' : 'short'} break.`)
      ui().toast('Session complete, your plant has grown 🌱')
    } else {
      notify('Break over', 'Ready for a new session?')
    }
    afterAdvance(next)
  } finally {
    completing = false
  }
}

/** Skip to the next phase; a skipped focus session is not counted as a pomodoro. */
export async function skipPhase() {
  const t = timer()
  if (t.phase === 'focus') {
    await recordPartial(t)
    if (t.startedAt !== null && settings().strictPlant) ui().set({ plant: 'wilted' })
  }
  const next = M.advance(t, settings().durations, false)
  apply(() => next)
  afterAdvance(next)
}

/** Abandon the current phase (its focused time still counts in the stats). */
export async function stopTimer() {
  const t = timer()
  if (t.phase === 'focus') {
    await recordPartial(t)
    if (t.startedAt !== null && settings().strictPlant) ui().set({ plant: 'wilted' })
  }
  apply((s) => M.reset(s, settings().durations))
}
