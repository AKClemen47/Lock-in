import { count, glowSprite, offscreen, pick, rand, vignette, TAU, type SceneFactory } from './kit'

interface Bokeh { x: number; y: number; r: number; sprite: HTMLCanvasElement; a: number; ph: number; sp: number; vx: number }
interface Drop { x: number; y: number; r: number; a: number }
interface Runner { x: number; y: number; r: number; v: number; hold: number; trail: number; ph: number }
interface Streak { x: number; y: number; len: number; v: number; a: number }

const BOKEH = ['#ffb35c', '#ffe2b0', '#ff7a5c', '#5ce1e6', '#7aa2ff', '#ffd27a']

function dropSprite(): HTMLCanvasElement {
  const [c, g] = offscreen(64, 64)
  const body = g.createRadialGradient(30, 26, 4, 32, 32, 30)
  body.addColorStop(0, 'rgba(210,225,255,0.10)')
  body.addColorStop(0.72, 'rgba(160,180,225,0.16)')
  body.addColorStop(0.92, 'rgba(8,12,26,0.55)')
  body.addColorStop(1, 'rgba(8,12,26,0)')
  g.fillStyle = body
  g.beginPath()
  g.arc(32, 32, 30, 0, TAU)
  g.fill()
  const caustic = g.createRadialGradient(32, 46, 1, 32, 46, 12)
  caustic.addColorStop(0, 'rgba(255,225,190,0.35)')
  caustic.addColorStop(1, 'rgba(255,225,190,0)')
  g.fillStyle = caustic
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.beginPath()
  g.ellipse(24, 20, 6, 4, -0.6, 0, TAU)
  g.fill()
  return c
}

/** Rain running down a window, city lights blurred behind the glass. */
export const rainScene: SceneFactory = (ctx, opts) => {
  const density = opts.preview ? 0.35 : 1
  const sprites = BOKEH.map((c) => glowSprite(c, 128, 0.5))
  const drop = dropSprite()
  let W = 0, H = 0, u = 1
  let bg: HTMLCanvasElement
  let fog: CanvasGradient, vig: CanvasGradient
  let bokeh: Bokeh[] = [], drops: Drop[] = [], runners: Runner[] = [], streaks: Streak[] = []
  let maxDrops = 0

  const newDrop = (): Drop => ({ x: rand(0, W), y: rand(0, H), r: (0.8 + Math.random() ** 3 * 4.2) * u, a: 1 })

  function paintCity() {
    const [c, g] = offscreen(W, H)
    const sky = g.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0b1222')
    sky.addColorStop(0.55, '#18203a')
    sky.addColorStop(1, '#2c2335')
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)
    g.filter = 'blur(7px)' // ignored where unsupported; the bokeh carries the blur anyway
    for (let x = -20; x < W; ) {
      const bw = rand(60, 170) * u
      const bh = rand(0.25, 0.7) * H
      g.fillStyle = `rgb(${rand(14, 28) | 0},${rand(18, 32) | 0},${rand(38, 58) | 0})`
      g.fillRect(x, H - bh, bw, bh)
      for (let wy = H - bh + 12 * u; wy < H - 20; wy += 18 * u)
        for (let wx = x + 8 * u; wx < x + bw - 10 * u; wx += 16 * u)
          if (Math.random() < 0.18) {
            g.fillStyle = `rgba(255,${rand(170, 220) | 0},120,${rand(0.25, 0.6)})`
            g.fillRect(wx, wy, 7 * u, 9 * u)
          }
      x += bw + rand(4, 30) * u
    }
    g.filter = 'none'
    const glow = g.createRadialGradient(W / 2, H * 1.05, 10, W / 2, H * 1.05, H * 0.7)
    glow.addColorStop(0, 'rgba(255,150,80,0.35)')
    glow.addColorStop(1, 'rgba(255,150,80,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, W, H)
    bg = c
  }

  return {
    resize(w, h) {
      W = w
      H = h
      u = Math.max(0.5, Math.min(w, h) / 900)
      paintCity()
      bokeh = Array.from({ length: Math.round(((W * H) / 30000) * density) + 6 }, () => ({
        x: rand(0, W),
        y: rand(H * 0.25, H),
        r: rand(12, 48) * u,
        sprite: pick(sprites),
        a: rand(0.12, 0.4),
        ph: rand(0, TAU),
        sp: rand(0.2, 0.9),
        vx: Math.random() < 0.15 ? rand(-25, 25) * u : 0, // passing cars
      }))
      maxDrops = Math.round(((W * H) / 2600) * density)
      drops = Array.from({ length: maxDrops }, newDrop)
      runners = []
      streaks = Array.from({ length: Math.round(90 * density) }, () => ({
        x: rand(0, W),
        y: rand(-H, H),
        len: rand(12, 30) * u,
        v: rand(600, 1000) * u,
        a: rand(0.04, 0.12),
      }))
      fog = ctx.createLinearGradient(0, 0, 0, H)
      fog.addColorStop(0, 'rgba(200,215,255,0.03)')
      fog.addColorStop(1, 'rgba(200,215,255,0.08)')
      vig = vignette(ctx, W, H, 0.5)
    },

    frame(t, dt, px, py) {
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      const s = 1.04
      ctx.drawImage(bg, (W - W * s) / 2 - px * W * 0.012, (H - H * s) / 2 - py * H * 0.008, W * s, H * s)

      ctx.globalCompositeOperation = 'lighter'
      for (const b of bokeh) {
        b.x += b.vx * dt
        if (b.x < -b.r) b.x = W + b.r
        if (b.x > W + b.r) b.x = -b.r
        ctx.globalAlpha = b.a * (0.75 + 0.25 * Math.sin(t * b.sp + b.ph))
        ctx.drawImage(b.sprite, b.x - b.r - px * 18 * u, b.y - b.r - py * 10 * u, b.r * 2, b.r * 2)
      }
      ctx.globalCompositeOperation = 'source-over'

      ctx.strokeStyle = '#b8c8ff'
      ctx.lineWidth = 1
      for (const k of streaks) {
        k.y += k.v * dt
        k.x += k.v * 0.08 * dt
        if (k.y > H) {
          k.y = rand(-H * 0.3, 0)
          k.x = rand(-W * 0.1, W)
        }
        ctx.globalAlpha = k.a
        ctx.beginPath()
        ctx.moveTo(k.x, k.y)
        ctx.lineTo(k.x + k.len * 0.08, k.y + k.len)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      ctx.fillStyle = fog
      ctx.fillRect(0, 0, W, H)

      // Rain keeps hitting the glass; the oldest drops evaporate.
      if (dt > 0) {
        for (let n = count(30 * density * dt); n > 0; n--) drops.push(newDrop())
        const excess = drops.length - maxDrops
        for (let i = 0; i < excess; i++) drops[i].a -= dt * 1.5
        while (drops.length && drops[0].a <= 0) drops.shift()
      }

      if (dt > 0 && runners.length < (W / 110) * density && Math.random() < dt * 1.2)
        runners.push({ x: rand(0, W), y: rand(-20, H * 0.4), r: rand(3.5, 6.5) * u, v: 0, hold: rand(0, 1.5), trail: 0, ph: rand(0, TAU) })

      for (const r of runners) {
        if (r.hold > 0) {
          r.hold -= dt
          r.v = 0
        } else {
          r.v = Math.min(r.v + 400 * u * dt, (60 + r.r * 25) * u)
          if (Math.random() < dt * 0.6) r.hold = rand(0.2, 1.4) // stick-slip
        }
        r.y += r.v * dt
        r.x += Math.sin(r.y * 0.045 + r.ph) * 0.25
        r.trail += r.v * dt
        if (r.trail > rand(8, 16) * u) {
          r.trail = 0
          drops.push({ x: r.x + rand(-1, 1), y: r.y - r.r * 1.2, r: rand(0.8, 1.8) * u, a: 1 })
        }
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i]
          if (d.y > r.y - r.r && Math.abs(d.x - r.x) < r.r + d.r && Math.abs(d.y - r.y) < r.r + d.r) {
            r.r = Math.min(9 * u, Math.sqrt(r.r * r.r + d.r * d.r * 0.6))
            drops.splice(i, 1)
          }
        }
      }
      runners = runners.filter((r) => r.y - r.r * 2 < H)

      for (const d of drops) {
        ctx.globalAlpha = Math.max(0, d.a)
        ctx.drawImage(drop, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2)
      }
      ctx.globalAlpha = 1
      for (const r of runners) ctx.drawImage(drop, r.x - r.r, r.y - r.r * 1.25, r.r * 2, r.r * 2.5)

      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    },
  }
}
