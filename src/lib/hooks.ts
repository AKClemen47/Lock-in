import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Project, type Session, type Task } from './db'
import { dayKeyOf, dayStart } from './time'
import { useSettings } from '../store/settings'

/** Current time, refreshed every `ms` (0 = frozen). */
export function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    setNow(Date.now())
    if (!ms) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** Today's key, honouring the configured start-of-day hour; updates each minute. */
export function useToday(): string {
  const startHour = useSettings((s) => s.dayStartHour)
  const now = useNow(60_000)
  return dayKeyOf(now, startHour)
}

const EMPTY: never[] = []

export const useTasks = (): Task[] => useLiveQuery(() => db.tasks.orderBy('order').toArray(), []) ?? EMPTY
export const useProjects = (): Project[] => useLiveQuery(() => db.projects.orderBy('order').toArray(), []) ?? EMPTY
export const useAllSessions = (): Session[] => useLiveQuery(() => db.sessions.toArray(), []) ?? EMPTY

/** Focus sessions between two timestamps. */
export const useSessionsBetween = (from: number, to: number): Session[] =>
  useLiveQuery(() => db.sessions.where('start').between(from, to, true, false).toArray(), [from, to]) ?? EMPTY

/** Completed pomodoros today. */
export function useTodayPomodoros(): number {
  const today = useToday()
  const startHour = useSettings((s) => s.dayStartHour)
  const from = dayStart(today, startHour)
  return useSessionsBetween(from, from + 86_400_000).filter((s) => s.completed).length
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
