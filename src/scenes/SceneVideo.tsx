import { useEffect, useRef } from 'react'
import type { ThemeId } from '../store/settings'
import { themeById } from './themes'

interface Props {
  theme: ThemeId
  /** false → the poster, or the last frame once played (reduced motion, economy mode). */
  animate: boolean
  className?: string
}

/** A theme's looping video; paused while the tab is hidden. Never downloaded until it has to play. */
export function SceneVideo({ theme, animate, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const t = themeById(theme)

  useEffect(() => {
    const v = ref.current!
    // play() can be refused (autoplay policy, offline): the poster stays.
    const sync = () => (animate && !document.hidden ? void v.play().catch(() => {}) : v.pause())
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [animate])

  return (
    <video
      ref={ref}
      src={t.video}
      poster={t.poster}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload={animate ? 'auto' : 'none'}
      aria-hidden="true"
      className={`object-cover ${className ?? ''}`}
    />
  )
}
