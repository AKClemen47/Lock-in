import { useEffect, useRef } from 'react'
import type { ThemeId } from '../store/settings'
import { themeById } from './themes'

interface Props {
  theme: ThemeId
  /** false → a single still frame (reduced motion, economy mode). */
  animate: boolean
  preview?: boolean
  rain?: boolean
  fps?: number
  className?: string
}

/** Runs a scene on a canvas: DPR-aware, capped frame rate, pointer parallax, paused while the tab is hidden. */
export function SceneCanvas({ theme, animate, preview = false, rain = true, fps = 30, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d', { alpha: false })!
    const scene = themeById(theme).scene(ctx, { preview, rain })
    const dpr = preview ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
    let px = 0, py = 0, tx = 0, ty = 0
    let size = ''

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const w = Math.max(1, r.width)
      const h = Math.max(1, r.height)
      if (size === `${w}x${h}`) return
      size = `${w}x${h}`
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene.resize(w, h)
      scene.frame(0, 0, px, py)
    }
    resize() // before the first frame: scenes build their buffers here
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    const parallax = animate && !preview
    if (parallax) window.addEventListener('pointermove', onMove)

    let raf = 0
    const t0 = performance.now()
    let last = t0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop) // rAF itself stops while the tab is hidden
      const elapsed = now - last
      if (elapsed < 1000 / fps - 2) return
      last = now
      px += (tx - px) * 0.05
      py += (ty - py) * 0.05
      scene.frame((now - t0) / 1000, Math.min(elapsed / 1000, 0.1), px, py)
    }
    if (animate) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (parallax) window.removeEventListener('pointermove', onMove)
    }
  }, [theme, animate, preview, rain, fps])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
