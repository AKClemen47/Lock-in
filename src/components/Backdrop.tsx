import { useEffect, useState } from 'react'
import { SceneVideo } from '../scenes/SceneVideo'
import { useSettings, type ThemeId } from '../store/settings'
import { useUi } from '../store/ui'
import { useTimer } from '../store/timer'
import { useReducedMotion } from '../lib/hooks'

/** Full-page ambience video with a 1.2 s crossfade between themes and a light scrim (panels carry their own glass). */
export function Backdrop() {
  const { visualTheme, economy, bgMode, scrim } = useSettings()
  const focusMode = useUi((u) => u.focusMode)
  const running = useTimer((t) => t.status === 'running')
  const reduced = useReducedMotion()
  const [layers, setLayers] = useState<ThemeId[]>([visualTheme])

  useEffect(() => {
    setLayers((l) => (l[l.length - 1] === visualTheme ? l : [...l.slice(-1), visualTheme]))
    const id = setTimeout(() => setLayers([visualTheme]), 1300)
    return () => clearTimeout(id)
  }, [visualTheme])

  const animate = !reduced && !economy && (bgMode === 'always' || focusMode || running)

  return (
    <div className="fixed inset-0 -z-10 bg-black" aria-hidden="true">
      {layers.map((t, i) => (
        <div key={t} className={i > 0 ? 'fade-in absolute inset-0' : 'absolute inset-0'}>
          <SceneVideo theme={t} animate={animate && i === layers.length - 1} className="size-full" />
        </div>
      ))}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: `rgb(var(--scrim) / ${scrim * 0.4})` }}
      />
    </div>
  )
}
