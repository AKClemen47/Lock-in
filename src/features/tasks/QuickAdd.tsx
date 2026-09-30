import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { PRIORITIES, type Project, type Task } from '../../lib/db'
import { matchProject, parseQuickAdd } from '../../lib/quickAdd'
import { quickAddTask } from '../../lib/repo'
import { formatDue } from '../../lib/time'
import { cx } from '../../components/ui'

const HELP = '#matière  !1 à !4 priorité  ~3 pomodoros  demain / lundi / 12/10  18h30'

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-hover px-2 py-0.5 text-xs" style={color ? { color } : undefined}>
      {children}
    </span>
  )
}

/** One-line task entry with a live preview of what the syntax understood. */
export function QuickAdd({ today, defaults, projects }: { today: string; defaults: Partial<Task>; projects: Project[] }) {
  const [text, setText] = useState('')
  const p = parseQuickAdd(text, today)
  const matched = p.projectName ? matchProject(p.projectName, projects) : null
  const hasTokens = p.projectName || p.priority || p.dueDate || p.dueTime || p.estimate

  const submit = async () => {
    if (!p.title) return
    await quickAddTask(text, today, defaults)
    setText('')
  }

  return (
    <div className="glass rounded-2xl px-3 py-2">
      <div className="flex items-center gap-2">
        <Plus size={18} className="shrink-0 text-accent" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="Ajouter une tâche… ex. Réviser chap. 3 #Maths demain 18h ~2"
          aria-label="Ajouter une tâche"
          aria-describedby="quickadd-help"
          data-quickadd
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <div id="quickadd-help" className={cx('flex flex-wrap items-center gap-1.5 pb-1 pl-7', !text && 'sr-only')}>
        {hasTokens ? (
          <>
            {p.projectName && (
              <Chip color={matched?.color}>
                {matched ? `${matched.icon} ${matched.name}` : `＋ nouvelle matière « ${p.projectName} »`}
              </Chip>
            )}
            {p.priority && <Chip color={PRIORITIES[p.priority].color}>⚑ {PRIORITIES[p.priority].label}</Chip>}
            {p.dueDate && <Chip>📅 {formatDue(p.dueDate, today)}</Chip>}
            {p.dueTime && <Chip>🕒 {p.dueTime.replace(':', ' h ')}</Chip>}
            {p.estimate && <Chip>🍅 × {p.estimate}</Chip>}
          </>
        ) : (
          <span className="text-xs text-muted">{HELP}</span>
        )}
      </div>
    </div>
  )
}
