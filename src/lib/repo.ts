import { db, uid, PROJECT_COLORS, type Project, type Session, type Task } from './db'
import { matchProject, parseQuickAdd } from './quickAdd'

export async function addProject(p: Partial<Project> & { name: string }): Promise<Project> {
  const count = await db.projects.count()
  const project: Project = {
    id: uid(),
    color: PROJECT_COLORS[count % PROJECT_COLORS.length],
    icon: '📘',
    archived: false,
    order: count,
    weeklyGoal: null,
    ...p,
  }
  await db.projects.add(project)
  return project
}

export const updateProject = (id: string, patch: Partial<Project>) => db.projects.update(id, patch)

/** Delete a project; its tasks move to "Sans matière", sessions keep their history. */
export function deleteProject(id: string) {
  return db.transaction('rw', db.projects, db.tasks, async () => {
    await db.tasks.where('projectId').equals(id).modify({ projectId: null })
    await db.projects.delete(id)
  })
}

export async function addTask(t: Partial<Task> & { title: string }): Promise<Task> {
  const first = await db.tasks.orderBy('order').first()
  const task: Task = {
    id: uid(),
    projectId: null,
    priority: 4,
    dueDate: null,
    dueTime: null,
    reminderAt: null,
    reminded: false,
    notes: '',
    subtasks: [],
    estimate: 0,
    spent: 0,
    done: false,
    doneAt: null,
    createdAt: Date.now(),
    order: (first?.order ?? 0) - 1, // new tasks on top
    ...t,
  }
  await db.tasks.add(task)
  return task
}

/** Create a task from the quick-add syntax; unknown `#matière` creates the project. */
export async function quickAddTask(input: string, today: string, defaults: Partial<Task>): Promise<Task | null> {
  const parsed = parseQuickAdd(input, today)
  if (!parsed.title) return null
  let projectId = defaults.projectId ?? null
  if (parsed.projectName) {
    const found = matchProject(parsed.projectName, await db.projects.toArray())
    projectId = (found ?? (await addProject({ name: parsed.projectName }))).id
  }
  return addTask({
    ...defaults,
    title: parsed.title,
    projectId,
    priority: parsed.priority ?? defaults.priority ?? 4,
    dueDate: parsed.dueDate ?? defaults.dueDate ?? null,
    dueTime: parsed.dueTime,
    estimate: parsed.estimate ?? 0,
  })
}

export const updateTask = (id: string, patch: Partial<Task>) => db.tasks.update(id, patch)

export const setTaskDone = (id: string, done: boolean) => db.tasks.update(id, { done, doneAt: done ? Date.now() : null })

export const deleteTask = (id: string) => db.tasks.delete(id)

export async function recordSession(s: Omit<Session, 'id' | 'projectId'>): Promise<void> {
  const task = s.taskId ? await db.tasks.get(s.taskId) : undefined
  await db.transaction('rw', db.sessions, db.tasks, async () => {
    await db.sessions.add({ ...s, id: uid(), projectId: task?.projectId ?? null })
    if (task && s.completed) await db.tasks.update(task.id, { spent: task.spent + 1 })
  })
}

export interface Backup {
  app: 'cocon'
  version: 1
  exportedAt: string
  settings: unknown
  projects: Project[]
  tasks: Task[]
  sessions: Session[]
}

export async function exportAll(settings: unknown): Promise<Backup> {
  const [projects, tasks, sessions] = await Promise.all([db.projects.toArray(), db.tasks.toArray(), db.sessions.toArray()])
  return { app: 'cocon', version: 1, exportedAt: new Date().toISOString(), settings, projects, tasks, sessions }
}

/** Replace all data with a backup. Throws on a file that is not a Cocon backup. */
export async function importAll(data: unknown): Promise<Backup> {
  const b = data as Backup
  if (!b || b.app !== 'cocon' || !Array.isArray(b.projects) || !Array.isArray(b.tasks) || !Array.isArray(b.sessions))
    throw new Error("Ce fichier n'est pas une sauvegarde Cocon.")
  await db.transaction('rw', db.projects, db.tasks, db.sessions, async () => {
    await Promise.all([db.projects.clear(), db.tasks.clear(), db.sessions.clear()])
    await Promise.all([db.projects.bulkAdd(b.projects), db.tasks.bulkAdd(b.tasks), db.sessions.bulkAdd(b.sessions)])
  })
  return b
}

export function resetAll() {
  return db.transaction('rw', db.projects, db.tasks, db.sessions, db.tracks, () =>
    Promise.all([db.projects.clear(), db.tasks.clear(), db.sessions.clear(), db.tracks.clear()]),
  )
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
