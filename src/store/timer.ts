import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initialTimer, type TimerState } from '../lib/timerMachine'
import { DEFAULT_SETTINGS } from './settings'

interface TimerStore extends TimerState {
  apply: (fn: (s: TimerState) => TimerState) => void
}

/** Timer state, persisted so a reload or crash resumes the running session. */
export const useTimer = create<TimerStore>()(
  persist(
    (set) => ({
      ...initialTimer(DEFAULT_SETTINGS.durations),
      apply: (fn) => set((s) => fn(s)),
    }),
    { name: 'cocon-timer', version: 1 },
  ),
)

export const timerState = (): TimerState => useTimer.getState()
