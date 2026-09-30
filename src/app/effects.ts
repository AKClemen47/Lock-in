import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { notify } from '../lib/notify'
import { setLevels } from '../audio/engine'
import { playAmbience, playingTheme, setLayerVolume } from '../audio/ambience'
import { mixFor } from '../audio/soundThemes'
import { pauseMusic, playMusic, setTracks } from '../audio/music'
import { playChime } from '../audio/chimes'
import { useSettings } from '../store/settings'
import { toast, useUi } from '../store/ui'
import { useTimer } from '../store/timer'
import { exitFocusMode, skipPhase, startAmbience, toggleFocusMode, toggleMute, toggleTimer } from '../features/timer/controller'
import { useMediaQuery } from '../lib/hooks'

/** Settings and UI state → audio graph (levels, theme/mix changes, music). */
export function useAudioSync() {
  const s = useSettings()
  const playing = useUi((u) => u.ambiencePlaying)
  const tracks = useLiveQuery(() => db.tracks.orderBy('order').toArray(), [])

  useEffect(() => {
    setLevels({ ...s.volumes, muted: s.muted, alertsThroughMute: s.alertsThroughMute })
  }, [s.volumes, s.muted, s.alertsThroughMute])

  useEffect(() => {
    if (s.linkSound && s.soundTheme !== s.visualTheme) s.set({ soundTheme: s.visualTheme })
  }, [s.linkSound, s.visualTheme, s.soundTheme, s])

  // Browsers forbid sound before a gesture: the ambience starts with the first click or key press.
  // Deferred so a click on ♫ or "Start" (which start it themselves) isn't toggled back.
  useEffect(() => {
    const off = () => {
      window.removeEventListener('click', first, true)
      window.removeEventListener('keydown', first, true)
    }
    const first = () => {
      off()
      setTimeout(() => {
        if (useSettings.getState().autoAmbience && !useUi.getState().ambiencePlaying) startAmbience()
      }, 0)
    }
    window.addEventListener('click', first, true)
    window.addEventListener('keydown', first, true)
    return off
  }, [])

  // Theme switch → crossfade; mix tweak → per-layer volume.
  useEffect(() => {
    if (!playing) return
    const mix = mixFor(s.soundTheme, s.mixes)
    if (playingTheme() !== s.soundTheme) playAmbience(s.soundTheme, mix)
    else for (const [id, v] of Object.entries(mix)) setLayerVolume(id, v)
  }, [playing, s.soundTheme, s.mixes])

  useEffect(() => {
    if (tracks) setTracks(tracks)
  }, [tracks])

  // Music follows the ambience play/pause state.
  useEffect(() => {
    if (playing && s.musicEnabled && tracks?.length) playMusic()
    else pauseMusic()
  }, [playing, s.musicEnabled, tracks?.length])
}

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Espace, S, M, F, N, Échap — ignored while typing or inside a dialog. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      if (document.querySelector('dialog[open]')) return
      const ui = useUi.getState()
      switch (e.key.toLowerCase()) {
        case ' ':
          if (e.target instanceof HTMLButtonElement) return
          e.preventDefault()
          toggleTimer()
          break
        case 's':
          void skipPhase()
          break
        case 'm':
          toggleMute()
          toast(useSettings.getState().muted ? 'Sound off' : 'Sound on')
          break
        case 'f':
          toggleFocusMode()
          break
        case 'n': {
          e.preventDefault()
          if (ui.focusMode) exitFocusMode()
          ui.set({ view: 'tasks' })
          requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-quickadd]')?.focus())
          break
        }
        case 'escape':
          if (ui.focusMode) exitFocusMode()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Keep the screen awake while a timer runs; re-acquired when the tab comes back. */
export function useWakeLock() {
  const running = useTimer((t) => t.status === 'running')
  const enabled = useSettings((s) => s.wakeLock)
  useEffect(() => {
    if (!running || !enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      void navigator.wakeLock.request('screen').then((l) => (alive ? (lock = l) : void l.release())).catch(() => {})
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release().catch(() => {})
    }
  }, [running, enabled])
}

/** Task reminders, checked every 20 s (and when the tab regains focus). */
export function useReminders() {
  useEffect(() => {
    const check = async () => {
      const now = Date.now()
      const due = await db.tasks.filter((t) => !t.done && !t.reminded && t.reminderAt !== null && t.reminderAt <= now).toArray()
      for (const t of due) {
        await db.tasks.update(t.id, { reminded: true })
        const body = t.dueTime ? `Due at ${t.dueTime}` : 'Task reminder'
        notify(`⏰ ${t.title}`, body)
        playChime('breakEnd', useSettings.getState().chime)
        toast(`⏰ ${t.title}`, { label: 'Open', run: () => useUi.getState().set({ view: 'tasks', openTaskId: t.id }) })
      }
    }
    void check()
    const id = setInterval(() => void check(), 20_000)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', check)
    }
  }, [])
}

/** Dark / light / system → `.dark` on <html> and the browser theme colour. */
export function useColorMode() {
  const mode = useSettings((s) => s.colorMode)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = mode === 'dark' || (mode === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#12111c' : '#efeaf6')
  }, [dark])
}

/** Ask for persistent storage once, and nudge towards a backup every 30 days of use. */
let backupChecked = false

export function useBackupReminder() {
  useEffect(() => {
    // StrictMode runs effects twice in dev: check once per page load.
    if (backupChecked) return
    backupChecked = true
    void navigator.storage?.persist?.().catch(() => {})
    const { lastBackupAt, onboarded, set } = useSettings.getState()
    if (!onboarded) return
    void db.sessions.count().then((n) => {
      if (n < 20) return
      if (lastBackupAt && Date.now() - lastBackupAt < 30 * 86_400_000) return
      toast('Remember to back up your data', {
        label: 'Settings',
        run: () => useUi.getState().set({ view: 'settings' }),
      })
      if (!lastBackupAt) set({ lastBackupAt: Date.now() - 23 * 86_400_000 }) // ask again in a week
    })
  }, [])
}
