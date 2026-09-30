import { Suspense, lazy, useEffect, useState, type CSSProperties } from 'react'
import { BarChart3, CheckSquare, Settings, Timer, Waves } from 'lucide-react'
import { useSettings } from './store/settings'
import { useUi, type View } from './store/ui'
import { themeById } from './scenes/themes'
import { unlockOnGesture } from './audio/engine'
import { useMediaQuery } from './lib/hooks'
import { useAudioSync, useBackupReminder, useColorMode, useReminders, useShortcuts, useWakeLock } from './app/effects'
import { useTimerEngine } from './features/timer/useTimerEngine'
import { Backdrop } from './components/Backdrop'
import { Announcer, Celebration, Toasts } from './components/Overlays'
import { cx } from './components/ui'
import { Rail } from './components/Rail'
import { TimerPanel, TimerSide, TimerStage } from './features/timer/TimerPanel'
import { FocusMode } from './features/focus/FocusMode'
import { ProjectEditorHost, Sidebar } from './features/tasks/Sidebar'
import { TaskList } from './features/tasks/TaskList'
import { TaskDetail } from './features/tasks/TaskDetail'
import { AmbienceView } from './features/ambience/AmbienceView'
import { SettingsView } from './features/settings/SettingsView'
import { Onboarding } from './features/onboarding/Onboarding'

// Chart.js only loads with the stats view.
const StatsView = lazy(() => import('./features/stats/StatsView').then((m) => ({ default: m.StatsView })))

const TABS: { view: View; label: string; icon: typeof Timer }[] = [
  { view: 'timer', label: 'Timer', icon: Timer },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
  { view: 'stats', label: 'Stats', icon: BarChart3 },
  { view: 'ambience', label: 'Ambiences', icon: Waves },
  { view: 'settings', label: 'Settings', icon: Settings },
]

function Main({ view }: { view: View }) {
  switch (view) {
    case 'stats': return <Suspense fallback={null}><StatsView /></Suspense>
    case 'ambience': return <AmbienceView />
    case 'settings': return <SettingsView />
    default: return <TaskList />
  }
}

export default function App() {
  const accent = themeById(useSettings((s) => s.visualTheme)).accent
  const onboarded = useSettings((s) => s.onboarded)
  const { view, list, focusMode, set } = useUi()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [lists, setLists] = useState(false)

  useEffect(unlockOnGesture, [])
  useTimerEngine()
  useAudioSync()
  useShortcuts()
  useWakeLock()
  useReminders()
  useColorMode()
  useBackupReminder()

  // "Minuteur" is its own tab on small screens only.
  useEffect(() => {
    if (desktop && view === 'timer') set({ view: 'tasks' })
  }, [desktop, view, set])
  // The lists drawer closes once a list or another view is picked.
  useEffect(() => setLists(false), [list, view])

  const stage = !desktop && view === 'timer'

  return (
    <div className="h-full" style={{ '--accent': accent } as CSSProperties}>
      <Backdrop />
      {focusMode ? (
        <FocusMode />
      ) : (
        <div className="relative flex h-full gap-3 p-0 lg:p-3">
          {desktop && <Rail lists={lists} onLists={() => setLists(!lists)} />}
          {desktop && lists && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLists(false)} />
              <div className="absolute inset-y-3 left-[88px] z-20 shadow-2xl">
                <Sidebar />
              </div>
            </>
          )}
          {desktop && view === 'tasks' ? (
            <>
              {/* Home: the timer sits straight on the video, tasks and sound on the right. */}
              <section aria-label="Timer" className="grid min-w-0 flex-1 place-items-center overflow-y-auto">
                <TimerStage />
              </section>
              <aside aria-label="Tasks" className="flex w-[380px] shrink-0 flex-col gap-3">
                <div className="glass min-h-0 flex-1 overflow-hidden rounded-2xl">
                  <TaskList />
                </div>
                <TimerSide />
              </aside>
            </>
          ) : (
            <main className={cx('min-w-0 flex-1 overflow-hidden max-lg:pb-16', !stage && 'glass max-lg:rounded-none max-lg:border-0 lg:rounded-2xl')}>
              {stage ? <TimerPanel /> : <Main view={view} />}
            </main>
          )}
          {!desktop && (
            <nav aria-label="Navigation" className="glass fixed inset-x-0 bottom-0 z-30 flex border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
              {TABS.map(({ view: v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => set({ view: v })}
                  className={cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]', view === v ? 'text-accent' : 'text-muted')}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
      <TaskDetail />
      <ProjectEditorHost />
      {!onboarded && <Onboarding />}
      <Celebration />
      <Toasts />
      <Announcer />
    </div>
  )
}
