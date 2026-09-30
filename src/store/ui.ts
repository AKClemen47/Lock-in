import { create } from 'zustand'

export type View = 'timer' | 'tasks' | 'stats' | 'ambience' | 'settings'
export type SmartList = 'today' | 'tomorrow' | 'week' | 'planned' | 'overdue' | 'done' | 'inbox' | 'all'
export type ListSel = { kind: 'smart'; id: SmartList } | { kind: 'project'; id: string }

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

/** Visual outcome of the last focus session, shown by the plant. */
export type PlantOutcome = 'none' | 'grown' | 'wilted'

interface UiStore {
  view: View
  list: ListSel
  openTaskId: string | null
  focusMode: boolean
  ambiencePlaying: boolean
  plant: PlantOutcome
  celebrateAt: number
  /** Polite screen-reader announcement (phase changes). */
  announcement: string
  toasts: Toast[]
  set: (patch: Partial<Omit<UiStore, 'set' | 'toast' | 'dismiss'>>) => void
  toast: (text: string, action?: Toast['action']) => void
  dismiss: (id: number) => void
}

let nextToast = 1

export const useUi = create<UiStore>()((set) => ({
  view: 'tasks',
  list: { kind: 'smart', id: 'today' },
  openTaskId: null,
  focusMode: false,
  ambiencePlaying: false,
  plant: 'none',
  celebrateAt: 0,
  announcement: '',
  toasts: [],
  set: (patch) => set(patch),
  toast: (text, action) => {
    const id = nextToast++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, action }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 6000 : 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (text: string, action?: Toast['action']) => useUi.getState().toast(text, action)
