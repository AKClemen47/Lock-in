import { useEffect, useState } from 'react'
import { Maximize2, Music, Pause, Play, SkipForward, Square, Volume2, VolumeX } from 'lucide-react'
import * as M from '../../lib/timerMachine'
import { formatClock } from '../../lib/time'
import { useNow, useTasks, useTodayPomodoros } from '../../lib/hooks'
import { useTimer } from '../../store/timer'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { themeById } from '../../scenes/themes'
import { Btn, IconBtn, Segmented, Slider, cx } from '../../components/ui'
import { Plant } from '../garden/Plant'
import {
  PHASE_LABEL, enterFocusMode, extendTimer, goToPhase, setTimerTask, skipPhase, stopTimer, toggleAmbience, toggleMute, toggleTimer,
} from './controller'

export function TimerRing({ progress, size, stroke = 10 }: { progress: number; size: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        style={{ transition: 'stroke-dashoffset 0.3s linear', filter: 'drop-shadow(0 0 6px var(--accent))' }}
      />
    </svg>
  )
}

export function CycleDots({ cycle, total }: { cycle: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`${cycle} session${cycle > 1 ? 's' : ''} sur ${total} avant la pause longue`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('size-2 rounded-full', i < cycle ? 'bg-accent' : 'bg-line')} />
      ))}
    </div>
  )
}

/** Stop needs a second click within 3 s when focused time would be lost. */
function StopButton() {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(id)
  }, [armed])
  const status = useTimer((s) => s.status)
  return (
    <IconBtn
      label={armed ? 'Confirmer l’abandon' : 'Arrêter'}
      variant={armed ? 'danger' : 'soft'}
      className="size-12"
      disabled={status === 'idle'}
      onClick={() => (armed ? (setArmed(false), void stopTimer()) : setArmed(true))}
    >
      <Square size={18} />
    </IconBtn>
  )
}

export function TimerPanel() {
  const t = useTimer()
  const now = useNow(t.status === 'running' ? 250 : 0)
  const s = useSettings()
  const { plant, ambiencePlaying, set: setUi } = useUi()
  const tasks = useTasks().filter((x) => !x.done)
  const done = useTodayPomodoros()
  const rem = M.remaining(t, now)
  const progress = M.progress(t, now)
  const theme = themeById(s.visualTheme)
  const running = t.status === 'running'

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <Segmented
        label="Type de session"
        size="sm"
        value={t.phase}
        onChange={(p) => goToPhase(p)}
        options={(['focus', 'short', 'long'] as const).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
      />

      <div className="relative mx-auto">
        <TimerRing progress={progress} size={236} />
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="space-y-1.5">
            <div className="text-5xl font-light tabular-nums tracking-tight" role="timer" aria-live="off">
              {formatClock(rem)}
            </div>
            <div className="text-sm text-muted">
              {PHASE_LABEL[t.phase]}
              {t.status === 'paused' && ' · en pause'}
            </div>
            <CycleDots cycle={t.cycle} total={s.durations.longEvery} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <StopButton />
        <button
          type="button"
          onClick={toggleTimer}
          aria-label={running ? 'Pause' : t.status === 'paused' ? 'Reprendre' : 'Démarrer'}
          className="inline-flex size-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition hover:brightness-110 active:scale-95"
        >
          {running ? <Pause size={26} /> : <Play size={26} className="translate-x-0.5" />}
        </button>
        <IconBtn label="Passer" variant="soft" className="size-12" onClick={() => void skipPhase()}>
          <SkipForward size={18} />
        </IconBtn>
      </div>
      <div className="-mt-2 flex justify-center gap-2">
        <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => extendTimer(1)}>+1 min</Btn>
        <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => extendTimer(5)}>+5 min</Btn>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Tâche en cours</span>
        <select
          className="w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
          value={t.taskId ?? ''}
          onChange={(e) => setTimerTask(e.target.value || null)}
        >
          <option value="">— Aucune tâche —</option>
          {tasks.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
              {x.estimate ? ` (${x.spent}/${x.estimate} 🍅)` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-4 rounded-2xl bg-hover p-3">
        <Plant progress={t.phase === 'focus' && t.status !== 'idle' ? progress : 0} outcome={plant} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Objectif du jour</div>
          <div className="text-xs text-muted">
            {done} / {s.dailyGoal} pomodoros
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemax={s.dailyGoal}>
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (done / s.dailyGoal) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-3 rounded-2xl bg-hover p-3">
        <div className="flex items-center gap-2">
          <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => setUi({ view: 'ambience' })}>
            {theme.emoji} {theme.name}
          </button>
          <IconBtn label={ambiencePlaying ? 'Couper l’ambiance' : 'Lancer l’ambiance'} onClick={toggleAmbience} variant={ambiencePlaying ? 'primary' : 'soft'}>
            <Music size={16} />
          </IconBtn>
          <IconBtn label={s.muted ? 'Réactiver le son (M)' : 'Muet (M)'} onClick={toggleMute}>
            {s.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </IconBtn>
          <IconBtn label="Mode focus plein écran (F)" onClick={enterFocusMode}>
            <Maximize2 size={16} />
          </IconBtn>
        </div>
        <Slider label="Volume" value={s.volumes.master} onChange={(v) => s.setVolume('master', v)} disabled={s.muted} />
      </div>
    </div>
  )
}
