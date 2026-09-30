import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Play, Plus, Trash2, X } from 'lucide-react'
import { db, uid, PRIORITIES, type Task } from '../../lib/db'
import { addTask, deleteTask, updateTask } from '../../lib/repo'
import { renderMarkdown } from '../../lib/markdown'
import { workloadMs } from '../../lib/stats'
import { formatDuration } from '../../lib/time'
import { useProjects } from '../../lib/hooks'
import { useSettings } from '../../store/settings'
import { toast, useUi } from '../../store/ui'
import { Btn, IconBtn, Modal, Segmented, cx, inputClass } from '../../components/ui'
import { TaskCheck, completeTask } from './TaskRow'
import { startTask } from '../timer/controller'
import type { Priority } from '../../lib/quickAdd'

const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Reminder presets relative to the due date/time (09:00 when no time). */
function dueTs(t: Task): number | null {
  if (!t.dueDate) return null
  const [y, m, d] = t.dueDate.split('-').map(Number)
  const [h, min] = (t.dueTime ?? '09:00').split(':').map(Number)
  return new Date(y, m - 1, d, h, min).getTime()
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

function Body({ task }: { task: Task }) {
  const projects = useProjects().filter((p) => !p.archived || p.id === task.projectId)
  const durations = useSettings((s) => s.durations)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [preview, setPreview] = useState(Boolean(task.notes))
  const [sub, setSub] = useState('')
  const set = (patch: Partial<Task>) => void updateTask(task.id, patch)
  const due = dueTs(task)

  // Save drafts when the dialog closes (Esc skips blur).
  const draft = useRef({ title, notes })
  draft.current = { title, notes }
  useEffect(() => {
    const id = task.id
    return () => {
      const d = draft.current
      void db.tasks.where('id').equals(id).modify((t) => {
        if (d.title.trim()) t.title = d.title.trim()
        t.notes = d.notes
      })
    }
  }, [task.id])

  const addSub = () => {
    if (!sub.trim()) return
    set({ subtasks: [...task.subtasks, { id: uid(), title: sub.trim(), done: false }] })
    setSub('')
  }
  const remove = async () => {
    useUi.getState().set({ openTaskId: null })
    await deleteTask(task.id)
    toast(`"${task.title}" deleted`, { label: 'Undo', run: () => void addTask(task) })
  }
  const setReminder = (ts: number | null) => set({ reminderAt: ts, reminded: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TaskCheck task={task} size={24} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && set({ title: title.trim() })}
          aria-label="Title"
          className={cx(inputClass, 'text-base font-medium', task.done && 'line-through')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject">
          <select className={inputClass} value={task.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || null })}>
            <option value="">No subject</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{`${p.icon} ${p.name}`}</option>
            ))}
          </select>
        </Field>
        <Field label="Pomodoros (done / estimated)">
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">🍅 {task.spent} /</span>
            <IconBtn label="Fewer" variant="soft" className="size-8" onClick={() => set({ estimate: Math.max(0, task.estimate - 1) })}>
              <Minus size={14} />
            </IconBtn>
            <span className="w-5 text-center text-sm tabular-nums">{task.estimate}</span>
            <IconBtn label="More" variant="soft" className="size-8" onClick={() => set({ estimate: task.estimate + 1 })}>
              <Plus size={14} />
            </IconBtn>
          </div>
        </Field>
        <Field label="Due date">
          <input type="date" className={inputClass} value={task.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} />
        </Field>
        <Field label="Time">
          <input type="time" className={inputClass} value={task.dueTime ?? ''} onChange={(e) => set({ dueTime: e.target.value || null })} disabled={!task.dueDate} />
        </Field>
      </div>

      <div className="text-xs text-muted" aria-live="polite">
        {task.estimate > task.spent && `About ${formatDuration(workloadMs(task.estimate - task.spent, durations))} left (breaks included)`}
      </div>

      <div>
        <span className="mb-1 block text-xs text-muted">Priority</span>
        <Segmented<Priority>
          label="Priority"
          size="sm"
          value={task.priority}
          onChange={(priority) => set({ priority })}
          options={([1, 2, 3, 4] as const).map((p) => ({ value: p, label: <span style={{ color: PRIORITIES[p].color }}>⚑ {PRIORITIES[p].label}</span> }))}
        />
      </div>

      <div>
        <span className="mb-1 block text-xs text-muted">Reminder</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            aria-label="Reminder date and time"
            className={cx(inputClass, 'w-auto')}
            value={task.reminderAt ? toLocalInput(task.reminderAt) : ''}
            onChange={(e) => setReminder(e.target.value ? new Date(e.target.value).getTime() : null)}
          />
          {due && (
            <>
              <Btn className="px-2 py-1 text-xs" onClick={() => setReminder(due)}>When due</Btn>
              <Btn className="px-2 py-1 text-xs" onClick={() => setReminder(due - 3_600_000)}>1h before</Btn>
              <Btn className="px-2 py-1 text-xs" onClick={() => setReminder(due - 86_400_000)}>The day before</Btn>
            </>
          )}
          {task.reminderAt && (
            <IconBtn label="Remove reminder" onClick={() => setReminder(null)}>
              <X size={14} />
            </IconBtn>
          )}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-xs text-muted">Subtasks</span>
        <ul className="space-y-1">
          {task.subtasks.map((s) => (
            <li key={s.id} className="group flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.done}
                aria-label={s.title}
                onChange={() => set({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
              />
              <span className={cx('flex-1', s.done && 'text-muted line-through')}>{s.title}</span>
              <IconBtn label={`Delete "${s.title}"`} className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => set({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}>
                <X size={12} />
              </IconBtn>
            </li>
          ))}
        </ul>
        <input
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSub()}
          onBlur={addSub}
          placeholder="+ Add a subtask"
          aria-label="New subtask"
          className="mt-1 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted">Notes (Markdown)</span>
          <Btn variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setPreview(!preview)}>
            {preview ? 'Edit' : 'Preview'}
          </Btn>
        </div>
        {preview ? (
          <div
            className="notes min-h-20 cursor-text rounded-xl bg-field p-3 text-sm"
            onClick={() => setPreview(false)}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) || '<p class="text-muted">No notes.</p>' }}
          />
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => set({ notes })}
            rows={5}
            aria-label="Notes"
            placeholder="Course links, formulas, ideas… **bold**, *italic*, - lists"
            className={cx(inputClass, 'resize-y font-mono text-xs')}
          />
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!task.done && (
          <Btn variant="primary" onClick={() => (useUi.getState().set({ openTaskId: null }), startTask(task.id))}>
            <Play size={16} /> Start a Pomodoro
          </Btn>
        )}
        <Btn onClick={() => completeTask(task)}>{task.done ? 'Reopen' : 'Complete'}</Btn>
        <Btn variant="danger" className="ml-auto" onClick={() => void remove()}>
          <Trash2 size={16} /> Delete
        </Btn>
      </footer>
    </div>
  )
}

export function TaskDetail() {
  const id = useUi((s) => s.openTaskId)
  const task = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id])
  const close = () => useUi.getState().set({ openTaskId: null })
  return (
    <Modal open={Boolean(id && task)} onClose={close} title="Task" wide>
      {task && <Body key={task.id} task={task} />}
    </Modal>
  )
}
