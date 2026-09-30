export interface SceneOpts {
  /** Small gallery preview: fewer particles. */
  preview: boolean
  /** Lo-Fi: pastel rain on the window. */
  rain: boolean
}

export interface Scene {
  resize(w: number, h: number): void
  /** Draw a full frame. `t` seconds since start, `dt` seconds since last frame, `px/py` pointer in −1..1. */
  frame(t: number, dt: number, px: number, py: number): void
}

export type SceneFactory = (ctx: CanvasRenderingContext2D, opts: SceneOpts) => Scene

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
export const TAU = Math.PI * 2

/** How many particles to spawn this frame for a fractional expected count (stochastic rounding). */
export const count = (expected: number) => Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0)

/** Roughly normal in −1..1. */
export const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5

export function offscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return [c, c.getContext('2d')!]
}

/** Soft radial disc; `core` (0..1) keeps the centre fully opaque up to that radius. */
export function glowSprite(color: string, size = 64, core = 0): HTMLCanvasElement {
  const [c, g] = offscreen(size, size)
  const r = size / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, color)
  if (core > 0) grad.addColorStop(core, color)
  // Fade to the same colour at zero alpha — 'transparent' is black and leaves a grey fringe.
  grad.addColorStop(1, color.startsWith('#') ? `${color}00` : color.replace(/[\d.]+\)$/, '0)'))
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.55): CanvasGradient {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  return g
}

/** Blend two `#rrggbb` colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
