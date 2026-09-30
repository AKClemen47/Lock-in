import { useEffect } from 'react'
import * as M from '../../lib/timerMachine'
import { formatClock } from '../../lib/time'
import { useTimer } from '../../store/timer'
import { useSettings } from '../../store/settings'
import { playTick } from '../../audio/chimes'
import { completePhase, PHASE_LABEL } from './controller'

/** Drives the countdown from a worker tick: phase completion, tab title, optional ticking. */
export function useTimerEngine() {
  useEffect(() => {
    const worker = new Worker(new URL('./tick.worker.ts', import.meta.url), { type: 'module' })
    let lastSecond = -1
    const tick = () => {
      const t = useTimer.getState()
      if (t.status !== 'running') {
        lastSecond = -1
        if (document.title !== 'Cocon') document.title = 'Cocon'
        return
      }
      const rem = M.remaining(t, Date.now())
      if (rem <= 0) {
        void completePhase(t.endAt ?? Date.now())
        return
      }
      const sec = Math.ceil(rem / 1000)
      if (sec === lastSecond) return
      lastSecond = sec
      document.title = `${formatClock(rem)} · ${PHASE_LABEL[t.phase]}`
      if (t.phase === 'focus' && useSettings.getState().tick) playTick()
    }
    worker.onmessage = tick
    tick()

    // New durations apply to an untouched idle timer right away.
    const unsub = useSettings.subscribe((s, prev) => {
      if (s.durations !== prev.durations) useTimer.getState().apply((t) => M.syncDurations(t, s.durations))
    })
    useTimer.getState().apply((t) => M.syncDurations(t, useSettings.getState().durations))

    return () => {
      worker.terminate()
      unsub()
    }
  }, [])
}
