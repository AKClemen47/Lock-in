import { useEffect, useState } from 'react'
import { Minimize2, Music, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as M from '../../lib/timerMachine'
import { formatClock } from '../../lib/time'
import { db } from '../../lib/db'
import { useNow } from '../../lib/hooks'
import { useTimer } from '../../store/timer'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { IconBtn, cx } from '../../components/ui'
import { CycleDots } from '../timer/TimerPanel'
import { PetalDial } from '../timer/PetalDial'
import { PHASE_LABEL, exitFocusMode, skipPhase, toggleAmbience, toggleMute, toggleTimer } from '../timer/controller'

/** Immersive full-screen timer; controls fade out after 3 s without pointer activity. */
export function FocusMode() {
  const t = useTimer()
  const now = useNow(t.status === 'running' ? 250 : 0)
  const { muted, showTaskInFocus, durations } = useSettings()
  const ambiencePlaying = useUi((s) => s.ambiencePlaying)
  const task = useLiveQuery(() => (t.taskId ? db.tasks.get(t.taskId) : undefined), [t.taskId])
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let id = setTimeout(() => setIdle(true), 3000)
    const wake = () => {
      setIdle(false)
      clearTimeout(id)
      id = setTimeout(() => setIdle(true), 3000)
    }
    const evts = ['pointermove', 'pointerdown', 'keydown'] as const
    evts.forEach((e) => window.addEventListener(e, wake))
    // Leaving browser full screen (Esc, F11) also leaves focus mode.
    const onFs = () => !document.fullscreenElement && useUi.getState().focusMode && exitFocusMode()
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      clearTimeout(id)
      evts.forEach((e) => window.removeEventListener(e, wake))
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  const running = t.status === 'running'
  const hide = idle && running

  return (
    <div
      className={cx('fade-in fixed inset-0 z-40 flex flex-col items-center justify-center text-white', hide && 'cursor-none')}
      style={{ background: 'radial-gradient(ellipse at center, rgb(0 0 0 / 0.35), transparent 70%)' }}
    >
      <PetalDial progress={M.progress(t, now)} running={running} size={Math.min(380, window.innerWidth - 48)}>
        <div className="[text-shadow:0_2px_16px_rgb(0_0_0/0.6)]">
          <div className="space-y-2">
            <div className="text-7xl font-extralight tabular-nums tracking-tight sm:text-8xl" role="timer">
              {formatClock(M.remaining(t, now))}
            </div>
            <div className="text-base opacity-80">
              {PHASE_LABEL[t.phase]}
              {t.status === 'paused' && ' · en pause'}
            </div>
            {showTaskInFocus && task && <div className="mx-auto max-w-64 truncate text-sm opacity-70">{task.title}</div>}
          </div>
        </div>
      </PetalDial>

      <div className={cx('mt-8 flex items-center gap-3 transition-opacity duration-700', hide ? 'opacity-0' : 'opacity-100')}>
        <CycleDots cycle={t.cycle} total={durations.longEvery} />
      </div>
      <div
        className={cx(
          'mt-4 flex items-center gap-2 rounded-full bg-black/30 p-2 backdrop-blur-md transition-opacity duration-700',
          hide ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <IconBtn label={running ? 'Pause (Espace)' : 'Démarrer (Espace)'} className="size-12 text-white hover:bg-white/15" onClick={toggleTimer}>
          {running ? <Pause size={22} /> : <Play size={22} />}
        </IconBtn>
        <IconBtn label="Passer (S)" className="text-white hover:bg-white/15" onClick={() => void skipPhase()}>
          <SkipForward size={18} />
        </IconBtn>
        <IconBtn label={ambiencePlaying ? 'Couper l’ambiance' : 'Lancer l’ambiance'} className={cx('text-white hover:bg-white/15', !ambiencePlaying && 'opacity-60')} onClick={toggleAmbience}>
          <Music size={18} />
        </IconBtn>
        <IconBtn label={muted ? 'Réactiver le son (M)' : 'Muet (M)'} className="text-white hover:bg-white/15" onClick={toggleMute}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </IconBtn>
        <IconBtn label="Quitter le mode focus (Échap)" className="text-white hover:bg-white/15" onClick={exitFocusMode}>
          <Minimize2 size={18} />
        </IconBtn>
      </div>
    </div>
  )
}
