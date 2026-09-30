import { useState } from 'react'
import { Pencil, Search } from 'lucide-react'
import { useProjects, useSessionsBetween, useTasks, useToday } from '../../lib/hooks'
import { workloadMs } from '../../lib/stats'
import { dayStart, formatDuration, formatTime, weekStartKey, HOUR } from '../../lib/time'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { IconBtn, cx } from '../../components/ui'
import { QuickAdd } from './QuickAdd'
import { TaskRow } from './TaskRow'
import { ListChips, editProject } from './Sidebar'
import { doneUnder, groupTasks, inList, listDefaults, listTitle, remainingPomodoros, searchTasks, sortTasks, type SortKey } from './lists'
import type { Project } from '../../lib/db'

const EMPTY: Record<string, string> = {
  today: 'Rien de prévu aujourd’hui. Ajoute une tâche ou profite d’une séance libre.',
  tomorrow: 'Demain est encore libre.',
  week: 'Aucune échéance dans les 7 prochains jours.',
  planned: 'Aucune tâche avec échéance.',
  overdue: 'Aucun retard, bravo !',
  inbox: 'Toutes tes tâches ont une matière.',
  all: 'Aucune tâche en cours.',
  done: 'Aucune tâche terminée pour l’instant.',
  project: 'Aucune tâche dans cette matière.',
}

function WeeklyGoal({ project }: { project: Project }) {
  const startHour = useSettings((s) => s.dayStartHour)
  const today = useToday()
  const from = dayStart(weekStartKey(today), startHour)
  const ms = useSessionsBetween(from, from + 7 * 86_400_000)
    .filter((s) => s.projectId === project.id)
    .reduce((n, s) => n + s.durationMs, 0)
  if (!project.weeklyGoal) return null
  const pct = Math.min(100, (ms / (project.weeklyGoal * HOUR)) * 100)
  return (
    <div className="mt-2 max-w-xs">
      <div className="text-xs text-muted">
        Cette semaine : {formatDuration(ms)} / {project.weeklyGoal} h
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: project.color }} />
      </div>
    </div>
  )
}

export function TaskList() {
  const list = useUi((s) => s.list)
  const tasks = useTasks()
  const projects = useProjects()
  const today = useToday()
  const { durations, dayStartHour } = useSettings()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('manual')

  const isDone = list.kind === 'smart' && list.id === 'done'
  const matching = searchTasks(tasks.filter((t) => inList(t, list, today)), q)
  const open = isDone ? matching.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)) : sortTasks(matching, sort, projects)
  const done = searchTasks(doneUnder(tasks, list, today, dayStartHour), q).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const groups = groupTasks(open, list, today)
  const byId = new Map(projects.map((p) => [p.id, p]))
  const project = list.kind === 'project' ? byId.get(list.id) : undefined
  const pomos = remainingPomodoros(open)
  const load = workloadMs(pomos, durations)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="lg:hidden">
        <ListChips />
      </div>

      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{listTitle(list, projects)}</h1>
          {project && (
            <IconBtn label="Modifier la matière" onClick={() => editProject(project)}>
              <Pencil size={15} />
            </IconBtn>
          )}
        </div>
        {!isDone && (
          <p className="mt-1 text-sm text-muted">
            {open.length} tâche{open.length > 1 ? 's' : ''}
            {pomos > 0 && (
              <>
                {' '}· ≈ {pomos} 🍅 · {formatDuration(load)} · fin vers {formatTime(Date.now() + load)}
              </>
            )}
          </p>
        )}
        {project && <WeeklyGoal project={project} />}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-40 flex-1 items-center gap-2 rounded-xl border border-line bg-field px-3 py-1.5">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une tâche" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <select aria-label="Trier par" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-xl border border-line bg-field px-3 py-1.5 text-sm">
          <option value="manual">Ordre d’ajout</option>
          <option value="due">Échéance</option>
          <option value="priority">Priorité</option>
          <option value="project">Matière</option>
        </select>
      </div>

      {!isDone && <QuickAdd today={today} defaults={listDefaults(list, today)} projects={projects} />}

      {groups.length === 0 && done.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">{q ? 'Aucun résultat.' : EMPTY[list.kind === 'project' ? 'project' : list.id]}</p>
      )}

      {groups.map((g) => (
        <section key={g.key} aria-label={g.label || 'Tâches'}>
          {g.label && <h2 className={cx('mb-1 px-3 text-xs font-semibold uppercase tracking-wider', g.late ? 'text-red-400' : 'text-muted')}>{g.label}</h2>}
          <ul>
            {g.tasks.map((t) => (
              <TaskRow key={t.id} task={t} project={t.projectId ? byId.get(t.projectId) : undefined} today={today} showProject={list.kind !== 'project'} />
            ))}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <details className="group" open={isDone}>
          <summary className="cursor-pointer list-none px-3 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="inline-block transition group-open:rotate-90">›</span> Terminées ({done.length})
          </summary>
          <ul className="mt-1">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} project={t.projectId ? byId.get(t.projectId) : undefined} today={today} showProject={list.kind !== 'project'} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
