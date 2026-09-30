import { glowSprite, mix, offscreen, pick, rand, vignette, TAU, type SceneFactory } from './kit'

interface Cloud { x: number; y: number; w: number; sprite: HTMLCanvasElement; v: number; layer: number }
interface Star { x: number; y: number; r: number; ph: number; sp: number }
interface Lit { x: number; y: number; w: number; h: number; ph: number; sp: number }
interface Streak { x: number; y: number; v: number; len: number; c: string }

const SKY_A = ['#29265a', '#6d4f9c', '#e38bb9', '#f6b386']
const SKY_B = ['#1f2350', '#5b4a93', '#c979b5', '#f0a07e']
const PASTEL = ['#ffd1e8', '#c9d8ff', '#e6d4ff', '#ffe6c9']

function cloudSprite(w: number): HTMLCanvasElement {
  const h = w * 0.45
  const [c, g] = offscreen(w, h)
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(255,214,231,0.85)')
  grad.addColorStop(1, 'rgba(184,161,217,0.75)')
  g.fillStyle = grad
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const x = rand(w * 0.18, w * 0.82)
    const r = rand(w * 0.1, w * 0.2)
    const y = h - r * rand(0.9, 1.4)
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  g.fill()
  return c
}

/** Cosy study desk facing a twilight window: drifting clouds, twinkling city, breathing lamp, steaming mug. */
export const lofiScene: SceneFactory = (ctx, opts) => {
  const density = opts.preview ? 0.5 : 1
  const lampGlow = glowSprite('rgba(255,200,130,1)', 256)
  const moonGlow = glowSprite('rgba(255,236,210,0.8)', 128)
  let W = 0, H = 0, u = 1
  let win = { x0: 0, y0: 0, x1: 0, y1: 0 }
  let deskY = 0
  let overlay: HTMLCanvasElement, skyline: HTMLCanvasElement, grain: CanvasPattern
  let clouds: Cloud[] = [], stars: Star[] = [], lit: Lit[] = [], rain: Streak[] = []
  let lamp = { x: 0, y: 0 }, mug = { x: 0, y: 0 }, plant = { x: 0, y: 0 }
  let vig: CanvasGradient

  function paintSkyline() {
    const w = (win.x1 - win.x0) * 1.2
    const h = (win.y1 - win.y0) * 0.45
    const [c, g] = offscreen(w, h)
    lit = []
    for (let x = 0; x < w; ) {
      const bw = rand(30, 80) * u
      const bh = rand(0.3, 1) * h
      g.fillStyle = mix('#1c1532', '#2a2048', Math.random())
      g.fillRect(x, h - bh, bw, bh)
      for (let wy = h - bh + 8 * u; wy < h - 6 * u; wy += 12 * u)
        for (let wx = x + 5 * u; wx < x + bw - 8 * u; wx += 10 * u)
          if (Math.random() < 0.12) lit.push({ x: wx, y: wy, w: 4 * u, h: 6 * u, ph: rand(0, TAU), sp: rand(0.02, 0.1) })
      x += bw + rand(0, 8) * u
    }
    skyline = c
  }

  function paintOverlay() {
    const [c, g] = offscreen(W, H)
    const wall = g.createLinearGradient(0, 0, 0, H)
    wall.addColorStop(0, '#2a1f3d')
    wall.addColorStop(0.6, '#3a2a4d')
    wall.addColorStop(1, '#2b2038')
    g.fillStyle = wall
    g.fillRect(0, 0, W, H)
    const { x0, y0, x1, y1 } = win
    g.clearRect(x0, y0, x1 - x0, y1 - y0)

    // frame and mullions
    g.strokeStyle = '#4a3866'
    g.lineWidth = 14 * u
    g.strokeRect(x0, y0, x1 - x0, y1 - y0)
    g.lineWidth = 9 * u
    g.beginPath()
    g.moveTo((x0 + x1) / 2, y0)
    g.lineTo((x0 + x1) / 2, y1)
    g.moveTo(x0, y0 + (y1 - y0) * 0.42)
    g.lineTo(x1, y0 + (y1 - y0) * 0.42)
    g.stroke()
    g.fillStyle = '#5b4577'
    g.fillRect(x0 - 24 * u, y1, x1 - x0 + 48 * u, 16 * u)
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(x0 - 24 * u, y1, x1 - x0 + 48 * u, 2 * u)

    // curtains with soft folds
    for (const side of [-1, 1]) {
      const cw = (x1 - x0) * 0.13
      const cxL = side < 0 ? x0 - cw * 0.55 : x1 - cw * 0.45
      const grad = g.createLinearGradient(cxL, 0, cxL + cw, 0)
      for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, i % 2 ? '#6a4b86' : '#4d3566')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(cxL, y0 - 30 * u)
      g.lineTo(cxL + cw, y0 - 30 * u)
      g.quadraticCurveTo(cxL + cw * (side < 0 ? 0.7 : 0.3), (y0 + y1) / 2, cxL + cw, y1 + 50 * u)
      g.lineTo(cxL, y1 + 56 * u)
      g.closePath()
      g.fill()
    }

    // desk
    g.fillStyle = '#4b3450'
    g.fillRect(0, deskY, W, 14 * u)
    const front = g.createLinearGradient(0, deskY + 14 * u, 0, H)
    front.addColorStop(0, '#3a2840')
    front.addColorStop(1, '#1f1526')
    g.fillStyle = front
    g.fillRect(0, deskY + 14 * u, W, H)

    // books
    const bx = W * 0.3
    ;['#8fb3d9', '#e8a0b4', '#f2d49b'].forEach((col, i) => {
      g.fillStyle = col
      g.fillRect(bx + i * 4 * u, deskY - (i + 1) * 16 * u, 110 * u - i * 10 * u, 15 * u)
      g.fillStyle = 'rgba(0,0,0,0.15)'
      g.fillRect(bx + i * 4 * u, deskY - (i + 1) * 16 * u + 11 * u, 110 * u - i * 10 * u, 4 * u)
    })

    // open notebook
    const nx = W * 0.5
    g.fillStyle = '#efe6da'
    g.beginPath()
    g.moveTo(nx - 90 * u, deskY + 2 * u)
    g.lineTo(nx, deskY - 6 * u)
    g.lineTo(nx + 90 * u, deskY + 2 * u)
    g.lineTo(nx + 84 * u, deskY + 10 * u)
    g.lineTo(nx, deskY + 4 * u)
    g.lineTo(nx - 84 * u, deskY + 10 * u)
    g.closePath()
    g.fill()

    // lamp
    lamp = { x: W * 0.17, y: deskY - 150 * u }
    g.fillStyle = '#2b2035'
    g.beginPath()
    g.ellipse(lamp.x - 30 * u, deskY, 36 * u, 8 * u, 0, 0, TAU)
    g.fill()
    g.strokeStyle = '#2b2035'
    g.lineWidth = 6 * u
    g.beginPath()
    g.moveTo(lamp.x - 30 * u, deskY)
    g.lineTo(lamp.x - 50 * u, deskY - 90 * u)
    g.lineTo(lamp.x, lamp.y + 10 * u)
    g.stroke()
    g.fillStyle = '#e9b872'
    g.beginPath()
    g.moveTo(lamp.x - 18 * u, lamp.y - 26 * u)
    g.lineTo(lamp.x + 20 * u, lamp.y - 26 * u)
    g.lineTo(lamp.x + 44 * u, lamp.y + 16 * u)
    g.lineTo(lamp.x - 30 * u, lamp.y + 16 * u)
    g.closePath()
    g.fill()

    // mug and plant pot
    mug = { x: W * 0.7, y: deskY - 44 * u }
    g.fillStyle = '#f1e4d8'
    g.beginPath()
    g.roundRect(mug.x - 22 * u, mug.y, 44 * u, 44 * u, 6 * u)
    g.fill()
    g.strokeStyle = '#f1e4d8'
    g.lineWidth = 6 * u
    g.beginPath()
    g.arc(mug.x + 24 * u, mug.y + 20 * u, 11 * u, -Math.PI / 2, Math.PI / 2)
    g.stroke()
    plant = { x: W * 0.84, y: deskY - 46 * u }
    g.fillStyle = '#c98b6b'
    g.beginPath()
    g.moveTo(plant.x - 30 * u, plant.y)
    g.lineTo(plant.x + 30 * u, plant.y)
    g.lineTo(plant.x + 22 * u, deskY)
    g.lineTo(plant.x - 22 * u, deskY)
    g.closePath()
    g.fill()
    overlay = c
  }

  function makeGrain(): CanvasPattern {
    const [c, g] = offscreen(128, 128)
    const img = g.createImageData(128, 128)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 14
    }
    g.putImageData(img, 0, 0)
    return ctx.createPattern(c, 'repeat')!
  }

  return {
    resize(w, h) {
      W = w
      H = h
      u = Math.max(0.45, Math.min(w, h) / 900)
      const portrait = W / H < 0.8
      win = { x0: W * (portrait ? 0.08 : 0.16), y0: H * 0.07, x1: W * (portrait ? 0.92 : 0.84), y1: H * 0.64 }
      deskY = H * 0.76
      paintSkyline()
      paintOverlay()
      grain = makeGrain()
      const ww = win.x1 - win.x0
      const wh = win.y1 - win.y0
      clouds = Array.from({ length: Math.round(9 * density) }, (_, i) => {
        const layer = i % 2
        const cw = rand(0.25, 0.45) * ww * (layer ? 1 : 0.7)
        return { x: rand(-cw, ww), y: rand(0.05, 0.4) * wh, w: cw, sprite: cloudSprite(cw), v: (layer ? 7 : 3) * u, layer }
      })
      stars = Array.from({ length: Math.round(60 * density) }, () => ({ x: rand(0, ww), y: rand(0, wh * 0.45), r: rand(0.5, 1.6) * u, ph: rand(0, TAU), sp: rand(0.5, 2) }))
      rain = Array.from({ length: Math.round(70 * density) }, () => ({ x: rand(0, ww), y: rand(0, wh), v: rand(220, 340) * u, len: rand(10, 18) * u, c: pick(PASTEL) }))
      vig = vignette(ctx, W, H, 0.45)
    },

    frame(t, dt, px, py) {
      const { x0, y0, x1, y1 } = win
      const ww = x1 - x0
      const wh = y1 - y0
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      ctx.save()
      ctx.beginPath()
      ctx.rect(x0, y0, ww, wh)
      ctx.clip()
      const s = 0.5 + 0.5 * Math.sin((t / 240) * TAU) // the sky slowly shifts over four minutes
      const sky = ctx.createLinearGradient(0, y0, 0, y1)
      SKY_A.forEach((c, i) => sky.addColorStop([0, 0.45, 0.8, 1][i], mix(c, SKY_B[i], s)))
      ctx.fillStyle = sky
      ctx.fillRect(x0, y0, ww, wh)

      ctx.fillStyle = '#fff6e8'
      for (const st of stars) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * st.sp + st.ph)
        ctx.beginPath()
        ctx.arc(x0 + st.x, y0 + st.y, st.r, 0, TAU)
        ctx.fill()
      }

      const mx = x0 + ww * 0.78 - px * 4 * u
      const my = y0 + wh * 0.2
      const mr = 22 * u
      ctx.globalAlpha = 0.6
      ctx.drawImage(moonGlow, mx - mr * 4, my - mr * 4, mr * 8, mr * 8)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#fff1d6'
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, TAU)
      ctx.moveTo(mx + mr * 1.3, my - mr * 0.25)
      ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.85, 0, TAU, true)
      ctx.fill('evenodd')

      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > ww + 20) c.x = -c.w - rand(0, ww * 0.3)
        ctx.globalAlpha = c.layer ? 0.9 : 0.6
        ctx.drawImage(c.sprite, x0 + c.x - px * (c.layer ? 14 : 6) * u, y0 + c.y - py * 4 * u, c.w, c.w * 0.45)
      }

      const sx = x0 - ww * 0.1 - px * 22 * u
      const sy = y1 - skyline.height
      ctx.globalAlpha = 1
      ctx.drawImage(skyline, sx, sy)
      ctx.fillStyle = '#ffd98a'
      for (const l of lit) {
        ctx.globalAlpha = Math.sin(t * l.sp + l.ph) > -0.3 ? 0.75 : 0.1
        ctx.fillRect(sx + l.x, sy + l.y, l.w, l.h)
      }

      if (opts.rain) {
        ctx.lineWidth = 1.5 * u
        for (const r of rain) {
          r.y += r.v * dt
          r.x -= r.v * 0.18 * dt
          if (r.y > wh) {
            r.y = -r.len
            r.x = rand(0, ww * 1.2)
          }
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = r.c
          ctx.beginPath()
          ctx.moveTo(x0 + r.x, y0 + r.y)
          ctx.lineTo(x0 + r.x - r.len * 0.18, y0 + r.y + r.len)
          ctx.stroke()
        }
      }
      ctx.restore()

      ctx.globalAlpha = 1
      ctx.drawImage(overlay, 0, 0)

      // plant leaves sway gently
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.38 + Math.sin(t * 0.9 + i) * 0.05
        ctx.save()
        ctx.translate(plant.x, plant.y)
        ctx.rotate(a)
        ctx.fillStyle = i % 2 ? '#7fbf8e' : '#5e9e72'
        ctx.beginPath()
        ctx.ellipse(34 * u, 0, 34 * u, 9 * u, 0, 0, TAU)
        ctx.fill()
        ctx.restore()
      }

      // steam
      ctx.lineWidth = 3 * u
      ctx.lineCap = 'round'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        for (let k = 0; k <= 20; k++) {
          const y = mug.y - 6 * u - k * 3.2 * u
          const x = mug.x + (i - 1) * 9 * u + Math.sin(k * 0.35 - t * 1.6 + i * 2) * k * 0.45 * u
          if (k === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.05 * Math.sin(t + i)})`
        ctx.stroke()
      }

      // the lamp breathes warm light onto the desk
      ctx.globalCompositeOperation = 'lighter'
      const breathe = 0.5 + 0.08 * Math.sin(t * 0.7)
      ctx.globalAlpha = breathe
      ctx.drawImage(lampGlow, lamp.x - 190 * u, lamp.y - 120 * u, 380 * u, 380 * u)
      ctx.globalAlpha = breathe * 0.45
      ctx.drawImage(lampGlow, lamp.x - 280 * u, deskY - 60 * u, 560 * u, 130 * u)
      ctx.globalCompositeOperation = 'source-over'

      ctx.globalAlpha = 1
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.translate(rand(-64, 0), rand(-64, 0))
      ctx.fillStyle = grain
      ctx.fillRect(0, 0, W + 64, H + 64)
      ctx.restore()
    },
  }
}
