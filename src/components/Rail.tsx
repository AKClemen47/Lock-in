import type { ButtonHTMLAttributes } from 'react'
import { BarChart3, ListTodo, Maximize2, Settings, Timer, Waves } from 'lucide-react'
import * as M from '../lib/timerMachine'
import { formatClock } from '../lib/time'
import { useNow } from '../lib/hooks'
import { useTimer } from '../store/timer'
import { useUi, type View } from '../store/ui'
import { enterFocusMode } from '../features/timer/controller'
import { TimerRing } from '../features/timer/TimerPanel'
import { cx } from './ui'

const NAV: { view: View; label: string; icon: typeof Timer }[] = [
  { view: 'tasks', label: 'Timer and tasks', icon: Timer },
  { view: 'stats', label: 'Statistics', icon: BarChart3 },
  { view: 'ambience', label: 'Ambiences', icon: Waves },
  { view: 'settings', label: 'Settings', icon: Settings },
]

function RailBtn({ label, active, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...p}
      className={cx('grid size-11 place-items-center rounded-xl transition', active ? 'bg-line text-fg' : 'text-muted hover:bg-hover hover:text-fg', className)}
    />
  )
}

/** Away from the home screen, the timer stays in sight at the bottom of the rail. */
function MiniTimer() {
  const t = useTimer()
  const now = useNow(t.status === 'running' ? 1000 : 0)
  const set = useUi((u) => u.set)
  const clock = formatClock(M.remaining(t, now))
  return (
    <button type="button" onClick={() => set({ view: 'tasks' })} aria-label={`Back to the timer (${clock})`} title="Back to the timer" className="flex flex-col items-center gap-0.5 rounded-xl p-1 hover:bg-hover">
      <TimerRing progress={M.progress(t, now)} size={36} stroke={3} />
      <span className="text-[11px] tabular-nums text-muted">{clock}</span>
    </button>
  )
}

/** Desktop navigation: a slim column of icons, so the video stays visible. */
export function Rail({ lists, onLists }: { lists: boolean; onLists: () => void }) {
  const { view, set } = useUi()
  return (
    <nav aria-label="Main navigation" className="glass flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl py-3">
      <img src="/icon.svg" alt="Lock-in" className="mb-3 size-8" />
      {NAV.slice(0, 1).map(({ view: v, label, icon: Icon }) => (
        <RailBtn key={v} label={label} active={view === v && !lists} aria-current={view === v ? 'page' : undefined} onClick={() => set({ view: v })}>
          <Icon size={20} />
        </RailBtn>
      ))}
      <RailBtn label="Lists and subjects" active={lists} aria-expanded={lists} onClick={onLists}>
        <ListTodo size={20} />
      </RailBtn>
      {NAV.slice(1).map(({ view: v, label, icon: Icon }) => (
        <RailBtn key={v} label={label} active={view === v && !lists} aria-current={view === v ? 'page' : undefined} onClick={() => set({ view: v })}>
          <Icon size={20} />
        </RailBtn>
      ))}
      <div className="mt-auto flex flex-col items-center gap-2">
        {view !== 'tasks' && <MiniTimer />}
        <RailBtn label="Full-screen focus mode (F)" onClick={enterFocusMode}>
          <Maximize2 size={18} />
        </RailBtn>
      </div>
    </nav>
  )
}
