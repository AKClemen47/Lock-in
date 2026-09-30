import { Bell, Check, ListChecks, NotebookPen, Play } from 'lucide-react'
import { PRIORITIES, type Project, type Task } from '../../lib/db'
import { setTaskDone } from '../../lib/repo'
import { formatDue } from '../../lib/time'
import { toast, useUi } from '../../store/ui'
import { useTimer } from '../../store/timer'
import { IconBtn, cx } from '../../components/ui'
import { startTask } from '../timer/controller'

export function completeTask(t: Task, done = !t.done) {
  void setTaskDone(t.id, done)
  if (done) toast(`« ${t.title} » terminée`, { label: 'Annuler', run: () => void setTaskDone(t.id, false) })
}

export function TaskCheck({ task, size = 20 }: { task: Task; size?: number }) {
  const color = PRIORITIES[task.priority].color
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.done}
      aria-label={task.done ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
      onClick={() => completeTask(task)}
      className={cx('grid shrink-0 place-items-center rounded-full border-2 transition hover:scale-110', task.done && 'pop')}
      style={{ width: size, height: size, borderColor: color, background: task.done ? color : 'transparent' }}
    >
      {task.done && <Check size={size - 8} strokeWidth={3} className="text-page" />}
    </button>
  )
}

export function TaskRow({ task, project, today, showProject }: { task: Task; project?: Project; today: string; showProject: boolean }) {
  const open = () => useUi.getState().set({ openTaskId: task.id })
  const active = useTimer((s) => s.taskId === task.id && s.status !== 'idle')
  const late = !task.done && task.dueDate !== null && task.dueDate < today
  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <li className={cx('group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-hover', active && 'bg-hover ring-1 ring-accent/60')}>
      <TaskCheck task={task} />
      <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
        <div className={cx('truncate text-sm', task.done && 'text-muted line-through')}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted empty:hidden">
          {showProject && project && (
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
          {task.dueDate && (
            <span className={cx(late && 'text-red-400')}>
              {formatDue(task.dueDate, today)}
              {task.dueTime && ` ${task.dueTime.replace(':', ' h ')}`}
            </span>
          )}
          {(task.estimate > 0 || task.spent > 0) && (
            <span title="Pomodoros réalisés / estimés">
              🍅 {task.spent}
              {task.estimate > 0 && `/${task.estimate}`}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks size={12} /> {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.reminderAt && !task.reminded && <Bell size={12} aria-label="Rappel programmé" />}
          {task.notes && <NotebookPen size={12} aria-label="Notes" />}
        </div>
      </button>
      {!task.done && (
        <IconBtn
          label={`Lancer un Pomodoro sur « ${task.title} »`}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-60"
          onClick={() => startTask(task.id)}
        >
          <Play size={16} />
        </IconBtn>
      )}
    </li>
  )
}
