import type { Project, Task } from '../../lib/db'
import type { ListSel, SmartList } from '../../store/ui'
import { addDays, dayKeyOf, formatDue } from '../../lib/time'

export const SMART_LISTS: { id: SmartList; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'tomorrow', label: 'Tomorrow', icon: '🌤️' },
  { id: 'week', label: 'Next 7 days', icon: '📅' },
  { id: 'planned', label: 'Planned', icon: '🗓️' },
  { id: 'overdue', label: 'Overdue', icon: '⏰' },
  { id: 'inbox', label: 'No subject', icon: '📥' },
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'done', label: 'Completed', icon: '✅' },
]

export type SortKey = 'manual' | 'due' | 'priority' | 'project'

/** Open tasks shown in a list (done tasks only in "Completed"). */
export function inList(t: Task, sel: ListSel, today: string): boolean {
  if (sel.kind === 'project') return !t.done && t.projectId === sel.id
  if (sel.id === 'done') return t.done
  if (t.done) return false
  const due = t.dueDate
  switch (sel.id) {
    case 'today': return due !== null && due <= today
    case 'tomorrow': return due === addDays(today, 1)
    case 'week': return due !== null && due <= addDays(today, 6)
    case 'planned': return due !== null
    case 'overdue': return due !== null && due < today
    case 'inbox': return t.projectId === null
    case 'all': return true
  }
}

/** Completed tasks shown folded under a list: the project's, or today's. */
export function doneUnder(tasks: Task[], sel: ListSel, today: string, startHour: number): Task[] {
  if (sel.kind === 'project') return tasks.filter((t) => t.done && t.projectId === sel.id)
  if (sel.id === 'today') return tasks.filter((t) => t.done && t.doneAt !== null && dayKeyOf(t.doneAt, startHour) === today)
  return []
}

/** Defaults applied to a task created from the list. */
export function listDefaults(sel: ListSel, today: string): Partial<Task> {
  if (sel.kind === 'project') return { projectId: sel.id }
  if (sel.id === 'today' || sel.id === 'overdue') return { dueDate: today }
  if (sel.id === 'tomorrow') return { dueDate: addDays(today, 1) }
  return {}
}

export function listTitle(sel: ListSel, projects: Project[]): string {
  if (sel.kind === 'smart') return SMART_LISTS.find((l) => l.id === sel.id)!.label
  const p = projects.find((x) => x.id === sel.id)
  return p ? `${p.icon} ${p.name}` : 'Subject'
}

const dueKey = (t: Task) => `${t.dueDate ?? '9999'} ${t.dueTime ?? '99'}`

export function sortTasks(tasks: Task[], key: SortKey, projects: Project[]): Task[] {
  const order = new Map(projects.map((p, i) => [p.id, i]))
  const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
    manual: (a, b) => a.order - b.order,
    due: (a, b) => dueKey(a).localeCompare(dueKey(b)) || a.priority - b.priority,
    priority: (a, b) => a.priority - b.priority || dueKey(a).localeCompare(dueKey(b)),
    project: (a, b) => (order.get(a.projectId ?? '') ?? 999) - (order.get(b.projectId ?? '') ?? 999) || a.order - b.order,
  }
  return [...tasks].sort(cmp[key])
}

export interface Group {
  key: string
  label: string
  tasks: Task[]
  late?: boolean
}

/** Date-based lists are grouped by day; overdue tasks get their own group. */
export function groupTasks(tasks: Task[], sel: ListSel, today: string): Group[] {
  const byDay = sel.kind === 'smart' && (sel.id === 'week' || sel.id === 'planned')
  const late = tasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < today)
  const rest = tasks.filter((t) => !late.includes(t))
  const groups: Group[] = []
  if (late.length && !(sel.kind === 'smart' && sel.id === 'overdue')) groups.push({ key: 'late', label: 'Overdue', tasks: late, late: true })
  else rest.unshift(...late)
  if (!byDay) {
    if (rest.length) groups.push({ key: 'main', label: '', tasks: rest })
    return groups
  }
  const days = new Map<string, Task[]>()
  for (const t of [...rest].sort((a, b) => dueKey(a).localeCompare(dueKey(b)))) {
    const k = t.dueDate ?? 'none'
    days.set(k, [...(days.get(k) ?? []), t])
  }
  for (const [k, list] of days) groups.push({ key: k, label: k === 'none' ? 'No date' : formatDue(k, today), tasks: list })
  return groups
}

/** Remaining pomodoros of open tasks (estimate − spent, at least 0). */
export const remainingPomodoros = (tasks: Task[]) => tasks.reduce((n, t) => n + Math.max(0, t.estimate - t.spent), 0)

export function searchTasks(tasks: Task[], q: string): Task[] {
  const s = q.trim().toLowerCase()
  if (!s) return tasks
  return tasks.filter((t) => t.title.toLowerCase().includes(s) || t.notes.toLowerCase().includes(s))
}
