import { count, gauss, glowSprite, offscreen, pick, rand, vignette, TAU, type SceneFactory } from './kit'

interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; ph: number }

const BRICKS = ['#4a2a1e', '#3f2419', '#55301f', '#38201a', '#46291d']

/** Flicker 0..1 made of incommensurate sines — never visibly loops. */
const flicker = (t: number) =>
  0.5 + 0.2 * Math.sin(t * 6.3) + 0.15 * Math.sin(t * 11.7 + 1.3) + 0.1 * Math.sin(t * 2.3 + 0.4) + 0.05 * Math.sin(t * 23.1)

/** A cosy fireplace: brick surround, logs, rising flames, sparks and a flickering glow on the room. */
export const fireScene: SceneFactory = (ctx, opts) => {
  const density = opts.preview ? 0.45 : 1
  const spr = {
    core: glowSprite('#fff4c8', 64),
    yellow: glowSprite('#ffc24a', 64),
    orange: glowSprite('#ff7a1f', 64),
    red: glowSprite('#c8321a', 64),
  }
  let W = 0, H = 0
  let room: HTMLCanvasElement
  let opening: Path2D
  let cx = 0, fw = 0, ob = 0, shelfY = 0
  let candles: { x: number; y: number }[] = []
  let flames: Particle[] = [], sparks: Particle[] = []
  let bedGlow: CanvasGradient, roomGlow: CanvasGradient, vig: CanvasGradient

  function bricks(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, alpha: number) {
    const bh = fw * 0.055
    const bw = fw * 0.14
    g.globalAlpha = alpha
    for (let row = 0, y = y0; y < y0 + h; row++, y += bh) {
      for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x0 + w; x += bw) {
        g.fillStyle = pick(BRICKS)
        g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3)
        g.fillStyle = 'rgba(255,200,160,0.05)'
        g.fillRect(x + 1.5, y + 1.5, bw - 3, 1.5)
      }
    }
    g.globalAlpha = 1
  }

  function paintRoom() {
    const [c, g] = offscreen(W, H)
    const wall = g.createLinearGradient(0, 0, 0, H)
    wall.addColorStop(0, '#120a07')
    wall.addColorStop(1, '#1f120b')
    g.fillStyle = wall
    g.fillRect(0, 0, W, H)

    const fh = fw * 0.6
    const oy = ob - fh
    const ox = cx - fw / 2
    const sw = fw * 1.55
    const top = oy - fw * 0.34
    const floorY = ob + fw * 0.08

    const floor = g.createLinearGradient(0, floorY, 0, H)
    floor.addColorStop(0, '#1a0e08')
    floor.addColorStop(1, '#0b0503')
    g.fillStyle = floor
    g.fillRect(0, floorY, W, H - floorY)
    g.strokeStyle = 'rgba(255,190,140,0.04)'
    for (let y = floorY + 12; y < H; y += (y - floorY) * 0.25 + 10) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(W, y)
      g.stroke()
    }

    g.fillStyle = '#1a0f0a'
    g.fillRect(cx - sw / 2, top, sw, floorY - top)
    g.save()
    g.beginPath()
    g.rect(cx - sw / 2, top, sw, floorY - top)
    g.clip()
    bricks(g, cx - sw / 2, top, sw, floorY - top, 1)
    g.restore()

    opening = new Path2D()
    opening.moveTo(ox, ob)
    opening.lineTo(ox, oy + fh * 0.3)
    opening.ellipse(cx, oy + fh * 0.3, fw / 2, fh * 0.3, 0, Math.PI, TAU)
    opening.lineTo(ox + fw, ob)
    opening.closePath()
    g.strokeStyle = '#5a3c2e'
    g.lineWidth = fw * 0.07
    g.stroke(opening)
    const inner = g.createLinearGradient(0, oy, 0, ob)
    inner.addColorStop(0, '#060302')
    inner.addColorStop(1, '#1c0b05')
    g.fillStyle = inner
    g.fill(opening)
    g.save()
    g.clip(opening)
    bricks(g, ox, oy, fw, fh, 0.22)
    g.restore()
    g.strokeStyle = 'rgba(0,0,0,0.6)'
    g.lineWidth = fw * 0.025
    g.stroke(opening)

    // hearth slab and mantel shelf
    g.fillStyle = '#3b2a22'
    g.fillRect(ox - fw * 0.14, ob, fw * 1.28, fw * 0.08)
    g.fillStyle = 'rgba(255,210,170,0.08)'
    g.fillRect(ox - fw * 0.14, ob, fw * 1.28, 2)
    shelfY = top - fw * 0.02
    const shelf = g.createLinearGradient(0, shelfY, 0, shelfY + fw * 0.07)
    shelf.addColorStop(0, '#4a2e1b')
    shelf.addColorStop(1, '#22150c')
    g.fillStyle = shelf
    g.fillRect(cx - sw * 0.56, shelfY, sw * 1.12, fw * 0.07)

    // candles and a vase on the mantel
    candles = [cx - sw * 0.4, cx - sw * 0.33].map((x, i) => {
      const ch = fw * (0.09 - i * 0.025)
      g.fillStyle = '#e8dcc4'
      g.fillRect(x - fw * 0.012, shelfY - ch, fw * 0.024, ch)
      return { x, y: shelfY - ch - fw * 0.012 }
    })
    const vx = cx + sw * 0.36
    g.fillStyle = '#2a1a12'
    g.beginPath()
    g.ellipse(vx, shelfY - fw * 0.05, fw * 0.035, fw * 0.05, 0, 0, TAU)
    g.fill()
    g.strokeStyle = '#2a1a12'
    g.lineWidth = 2
    for (const a of [-0.5, -0.1, 0.35]) {
      g.beginPath()
      g.moveTo(vx, shelfY - fw * 0.09)
      g.quadraticCurveTo(vx + a * fw * 0.1, shelfY - fw * 0.18, vx + a * fw * 0.16, shelfY - fw * 0.24)
      g.stroke()
    }

    // logs
    const logY = ob - fw * 0.05
    const logs: [number, number, number][] = [[-0.12, 0.07, 0], [0.12, -0.08, 0], [0, 0.02, -fw * 0.07]]
    for (const [dx, rot, dy] of logs) {
      g.save()
      g.translate(cx + dx * fw, logY + dy)
      g.rotate(rot)
      const len = fw * 0.5
      const th = fw * 0.085
      const bark = g.createLinearGradient(0, -th / 2, 0, th / 2)
      bark.addColorStop(0, '#4a2e18')
      bark.addColorStop(1, '#140a05')
      g.fillStyle = bark
      g.beginPath()
      g.roundRect(-len / 2, -th / 2, len, th, th / 2)
      g.fill()
      g.fillStyle = '#6b4a2e'
      g.beginPath()
      g.ellipse(len / 2 - th * 0.2, 0, th * 0.22, th / 2, 0, 0, TAU)
      g.fill()
      g.restore()
    }
    room = c
  }

  return {
    resize(w, h) {
      W = w
      H = h
      fw = Math.min(W * 0.46, H * 0.8)
      cx = W / 2
      ob = H * 0.8
      paintRoom()
      flames = []
      sparks = []
      bedGlow = ctx.createRadialGradient(cx, ob - fw * 0.03, 0, cx, ob - fw * 0.03, fw * 0.4)
      bedGlow.addColorStop(0, 'rgba(255,120,30,0.55)')
      bedGlow.addColorStop(1, 'rgba(255,120,30,0)')
      roomGlow = ctx.createRadialGradient(cx, ob - fw * 0.25, 0, cx, ob - fw * 0.25, Math.max(W, H) * 0.8)
      roomGlow.addColorStop(0, 'rgba(255,120,45,0.22)')
      roomGlow.addColorStop(1, 'rgba(255,120,45,0)')
      vig = vignette(ctx, W, H, 0.65)
      // pre-warm so the first frame is already burning
      for (let i = 0; i < 60; i++) this.frame(i / 30, 1 / 30, 0, 0)
    },

    frame(t, dt, px) {
      const f = flicker(t)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(room, -px * 4, 0)

      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.6 + 0.4 * f
      ctx.fillStyle = bedGlow
      ctx.fillRect(0, 0, W, H)

      if (dt > 0) {
        for (let n = count(95 * density * dt); n > 0; n--)
          flames.push({
            x: cx + gauss() * fw * 0.2,
            y: ob - fw * 0.08 + rand(-4, 4),
            vx: rand(-10, 10),
            vy: -rand(50, 110) * (fw / 500),
            life: rand(0.7, 1.4),
            age: 0,
            size: rand(0.07, 0.12) * fw,
            ph: rand(0, TAU),
          })
        if (Math.random() < dt * 1.6)
          sparks.push({ x: cx + gauss() * fw * 0.15, y: ob - fw * 0.1, vx: rand(-30, 30), vy: -rand(120, 260) * (fw / 500), life: rand(1, 2.5), age: 0, size: rand(2, 3.5), ph: rand(0, TAU) })
      }

      ctx.save()
      ctx.clip(opening)
      for (const p of flames) {
        p.age += dt
        p.x += (p.vx + Math.sin(t * 3 + p.ph) * 15) * dt
        p.y += p.vy * dt
        p.vy -= 25 * dt
        p.size *= 1 - dt * 0.9
        const k = p.age / p.life
        const sprite = k < 0.15 ? spr.core : k < 0.4 ? spr.yellow : k < 0.7 ? spr.orange : spr.red
        ctx.globalAlpha = Math.max(0, (1 - k) * 0.55 * Math.min(1, k * 10))
        ctx.drawImage(sprite, p.x - p.size / 2, p.y - p.size * 0.7, p.size, p.size * 1.4)
      }
      for (const s of sparks) {
        s.age += dt
        s.vx += Math.sin(t * 5 + s.ph) * 40 * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        ctx.globalAlpha = Math.max(0, 1 - s.age / s.life)
        ctx.drawImage(spr.core, s.x - s.size, s.y - s.size, s.size * 2, s.size * 2)
      }
      ctx.restore()
      flames = flames.filter((p) => p.age < p.life)
      sparks = sparks.filter((s) => s.age < s.life)

      for (const [i, c] of candles.entries()) {
        const j = Math.sin(t * 9 + i * 2) * 0.6 + Math.sin(t * 17 + i) * 0.4
        const s = fw * 0.018
        ctx.globalAlpha = 0.5
        ctx.drawImage(spr.orange, c.x - s * 3, c.y - s * 3, s * 6, s * 6)
        ctx.globalAlpha = 0.9
        ctx.drawImage(spr.yellow, c.x - s / 2 + j * 0.8, c.y - s * 1.1, s, s * 2)
      }

      ctx.globalAlpha = 0.55 + 0.45 * f
      ctx.fillStyle = roomGlow
      ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    },
  }
}
