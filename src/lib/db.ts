import Dexie, { type EntityTable } from 'dexie'
import type { Priority } from './quickAdd'

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  archived: boolean
  order: number
  /** Optional weekly goal, hours. */
  weeklyGoal: number | null
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  projectId: string | null
  priority: Priority
  dueDate: string | null
  dueTime: string | null
  reminderAt: number | null
  reminded: boolean
  notes: string
  subtasks: Subtask[]
  /** Estimated pomodoros (0 = none). */
  estimate: number
  /** Completed pomodoros spent on the task. */
  spent: number
  done: boolean
  doneAt: number | null
  createdAt: number
  order: number
}

/** A focus session. Breaks are not stored. */
export interface Session {
  id: string
  start: number
  end: number
  /** Time actually focused. */
  durationMs: number
  plannedMs: number
  completed: boolean
  taskId: string | null
  projectId: string | null
}

export interface Track {
  id: string
  name: string
  blob: Blob
  order: number
}

export const db = new Dexie('cocon') as Dexie & {
  projects: EntityTable<Project, 'id'>
  tasks: EntityTable<Task, 'id'>
  sessions: EntityTable<Session, 'id'>
  tracks: EntityTable<Track, 'id'>
}

db.version(1).stores({
  projects: 'id, order',
  tasks: 'id, projectId, dueDate, doneAt, order',
  sessions: 'id, start, taskId, projectId',
  tracks: 'id, order',
})

export const uid = () => crypto.randomUUID()

// Validated categorical palette (dataviz skill): CVD-safe adjacent pairs, ≥ 3:1 on the dark surface.
export const PROJECT_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const PROJECT_ICONS = ['📘', '📐', '⚖️', '🏛️', '🧪', '🌍', '💻', '🎨', '🎵', '🗣️', '🧠', '📝']

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  1: { label: 'Urgent', color: '#f87171' },
  2: { label: 'High', color: '#fb923c' },
  3: { label: 'Normal', color: '#60a5fa' },
  4: { label: 'None', color: '#8a8799' },
}
