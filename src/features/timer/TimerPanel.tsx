import { useEffect, useState } from 'react'
import { Maximize2, Music, Volume2, VolumeX } from 'lucide-react'
import * as M from '../../lib/timerMachine'
import { formatClock } from '../../lib/time'
import { useNow, useTasks, useTodayPomodoros } from '../../lib/hooks'
import { useTimer } from '../../store/timer'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { themeById } from '../../scenes/themes'
import { IconBtn, Segmented, Slider, cx } from '../../components/ui'
import { Plant } from '../garden/Plant'
import { TaskCheck } from '../tasks/TaskRow'
import { PetalDial } from './PetalDial'
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
        style={{ transition: 'stroke-dashoffset 0.3s linear' }}
      />
    </svg>
  )
}

/** Drawn over the video (timer stage, focus mode). */
export function CycleDots({ cycle, total }: { cycle: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`${cycle} session${cycle > 1 ? 's' : ''} sur ${total} avant la pause longue`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('size-2 rounded-full', i < cycle ? 'bg-accent' : 'bg-white/35')} />
      ))}
    </div>
  )
}

// Outlined round buttons, Focus To-Do style, readable on any video.
const ROUND =
  'inline-flex shrink-0 items-center justify-center rounded-full border border-white/85 bg-black/15 text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-95'

/** Stop needs a second click within 3 s when focused time would be lost. */
function StopButton() {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(id)
  }, [armed])
  return (
    <button
      type="button"
      aria-label={armed ? 'Confirmer l’abandon' : 'Arrêter'}
      className={cx(ROUND, 'size-16 text-xs', armed && 'border-red-300 bg-red-500/40')}
      onClick={() => (armed ? (setArmed(false), void stopTimer()) : setArmed(true))}
    >
      {armed ? 'Confirmer' : 'Arrêter'}
    </button>
  )
}

/** The current task as a white card above the dial; the whole card opens the task picker. */
function TaskChip() {
  const taskId = useTimer((s) => s.taskId)
  const tasks = useTasks().filter((x) => !x.done)
  const task = tasks.find((x) => x.id === taskId)
  return (
    <div className="flex w-72 max-w-full items-center gap-3 rounded-xl bg-white/90 px-3 py-2 text-[#1d1a2b] shadow-lg [text-shadow:none]">
      {task && <TaskCheck task={task} />}
      <label className="relative min-w-0 flex-1 cursor-pointer">
        <span className="block truncate text-sm font-medium">{task ? task.title : 'Choisir une tâche…'}</span>
        {task?.estimate ? (
          <span className="mt-1 flex gap-1" aria-label={`${task.spent} pomodoros sur ${task.estimate}`}>
            {Array.from({ length: Math.min(task.estimate, 10) }, (_, i) => (
              <span key={i} className={cx('size-2 rounded-full', i < task.spent ? 'bg-[#ef6b5b]' : 'bg-[#e2dcef]')} />
            ))}
          </span>
        ) : (
          <span className="block text-xs text-[#6b6581]">{task ? `${task.spent} 🍅` : 'Facultatif'}</span>
        )}
        <select
          aria-label="Tâche en cours"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          value={taskId ?? ''}
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
    </div>
  )
}

/** The timer straight on the video: phase, current task, petal dial and round buttons. */
export function TimerStage() {
  const t = useTimer()
  const now = useNow(t.status === 'running' ? 250 : 0)
  const longEvery = useSettings((s) => s.durations.longEvery)
  const running = t.status === 'running'

  return (
    <div className="flex flex-col items-center gap-5 bg-[radial-gradient(closest-side,rgb(0_0_0/0.3),transparent)] px-6 py-4 text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.55)]">
      <div className="glass w-72 max-w-full rounded-xl text-fg [text-shadow:none]">
        <Segmented
          label="Type de session"
          size="sm"
          value={t.phase}
          onChange={(p) => goToPhase(p)}
          options={(['focus', 'short', 'long'] as const).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
        />
      </div>

      <TaskChip />

      <PetalDial progress={M.progress(t, now)} running={running} size="min(360px, 42vh, 80vw)">
        <div className="space-y-2">
          <div className="text-7xl font-extralight tabular-nums tracking-tight" role="timer" aria-live="off">
            {formatClock(M.remaining(t, now))}
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/80">
            {PHASE_LABEL[t.phase]}
            {t.status === 'paused' && ' · en pause'}
          </div>
          <CycleDots cycle={t.cycle} total={longEvery} />
        </div>
      </PetalDial>

      <div className="flex items-center gap-4">
        {t.status !== 'idle' && <StopButton />}
        <button type="button" onClick={toggleTimer} className={cx(ROUND, 'size-20 text-sm font-medium')}>
          {running ? 'Pause' : t.status === 'paused' ? 'Reprendre' : 'Démarrer'}
        </button>
        <button type="button" onClick={() => void skipPhase()} className={cx(ROUND, 'size-16 text-xs')}>
          Passer
        </button>
      </div>
      <div className="-mt-2 flex gap-4 text-xs text-white/80">
        <button type="button" className="hover:text-white" onClick={() => extendTimer(1)}>+1 min</button>
        <button type="button" className="hover:text-white" onClick={() => extendTimer(5)}>+5 min</button>
      </div>
    </div>
  )
}

/** Daily goal with the plant, then the ambience controls. */
export function TimerSide() {
  const t = useTimer()
  const now = useNow(t.status === 'running' ? 1000 : 0)
  const s = useSettings()
  const { plant, ambiencePlaying, set: setUi } = useUi()
  const done = useTodayPomodoros()
  const theme = themeById(s.visualTheme)

  return (
    <div className="glass space-y-3 rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <Plant progress={t.phase === 'focus' && t.status !== 'idle' ? M.progress(t, now) : 0} outcome={plant} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Objectif du jour</span>
            <span className="text-muted">{done} / {s.dailyGoal} 🍅</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemax={s.dailyGoal}>
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (done / s.dailyGoal) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-3">
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
  )
}

/** Small screens: the "Minuteur" tab. */
export function TimerPanel() {
  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto p-5">
      <TimerStage />
      <div className="w-full max-w-sm">
        <TimerSide />
      </div>
    </div>
  )
}
