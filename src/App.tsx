import { Suspense, lazy, useEffect, type CSSProperties } from 'react'
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
import { TimerPanel } from './features/timer/TimerPanel'
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
  { view: 'timer', label: 'Minuteur', icon: Timer },
  { view: 'tasks', label: 'Tâches', icon: CheckSquare },
  { view: 'stats', label: 'Stats', icon: BarChart3 },
  { view: 'ambience', label: 'Ambiances', icon: Waves },
  { view: 'settings', label: 'Réglages', icon: Settings },
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
  const { view, focusMode, set } = useUi()
  const desktop = useMediaQuery('(min-width: 1024px)')

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

  return (
    <div className="h-full" style={{ '--accent': accent } as CSSProperties}>
      <Backdrop />
      {focusMode ? (
        <FocusMode />
      ) : (
        <div className="flex h-full gap-3 p-0 lg:p-3">
          {desktop && <Sidebar />}
          <main className="glass min-w-0 flex-1 overflow-hidden max-lg:rounded-none max-lg:border-0 max-lg:pb-16 lg:rounded-2xl">
            {!desktop && view === 'timer' ? <TimerPanel /> : <Main view={view} />}
          </main>
          {desktop && (
            <aside className="glass w-[360px] shrink-0 overflow-hidden rounded-2xl" aria-label="Minuteur">
              <TimerPanel />
            </aside>
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
